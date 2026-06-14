const userServiceMock = {
  followGame: jest.fn(),
  unfollowGame: jest.fn(),
  setFollowNotifications: jest.fn(),
};

jest.doMock('../api', () => ({ userService: userServiceMock }));

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  err.data = { message };
  return err;
};

function loadFresh() {
  let mods = {};
  jest.isolateModules(() => {
    mods.queue = require('../offlineSyncQueue');
    mods.followSync = require('../followSync');
    mods.local = require('../followStateLocalStore');
  });
  return mods;
}

describe('services/followSync', () => {
  let queue, followSync, local;
  let AsyncStorage;

  beforeEach(async () => {
    userServiceMock.followGame.mockReset().mockResolvedValue();
    userServiceMock.unfollowGame.mockReset().mockResolvedValue();
    userServiceMock.setFollowNotifications.mockReset().mockResolvedValue();
    AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    const mods = loadFresh();
    queue = mods.queue;
    followSync = mods.followSync;
    local = mods.local;
  });

  describe('queueFollowSync()', () => {
    it('renvoie false si steamId ou appId manquant', async () => {
      expect(
        await followSync.queueFollowSync({
          steamId: '',
          appId: '730',
          targetIsFollowed: true,
        }),
      ).toBe(false);
    });

    it('enqueue une task de type FOLLOW_SYNC_TASK_TYPE', async () => {
      const enqueued = await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
      });

      expect(enqueued).toBe(true);
      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0]).toMatchObject({
        type: followSync.FOLLOW_SYNC_TASK_TYPE,
        scopeKey: '76561197960287930',
      });
    });
  });

  describe('hasQueuedFollowSync()', () => {
    it('false avant queue, true après', async () => {
      expect(await followSync.hasQueuedFollowSync('76561197960287930')).toBe(false);
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });
      expect(await followSync.hasQueuedFollowSync('76561197960287930')).toBe(true);
    });
  });

  describe('clearQueuedFollowSync()', () => {
    it('vide les tasks du scope', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });
      await followSync.clearQueuedFollowSync('76561197960287930');
      expect(await followSync.hasQueuedFollowSync('76561197960287930')).toBe(false);
    });
  });

  describe('syncQueuedFollow → exécute follow/unfollow via api', () => {
    it('follow → POST + retire task', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
      });
      await followSync.syncQueuedFollow();

      expect(userServiceMock.followGame).toHaveBeenCalledWith(
        '76561197960287930',
        '730',
        'CSGO',
        expect.any(String),
        true, // défaut = suivi notifié
      );
      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('follow silencieux → POST avec notifications:false', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
        notifications: false,
      });
      await followSync.syncQueuedFollow();

      expect(userServiceMock.followGame).toHaveBeenCalledWith(
        '76561197960287930',
        '730',
        'CSGO',
        expect.any(String),
        false,
      );
    });

    it('unfollow → DELETE', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: false,
      });
      await followSync.syncQueuedFollow();

      expect(userServiceMock.unfollowGame).toHaveBeenCalledWith(
        '76561197960287930',
        '730',
      );
    });

    it('idempotent : 400 "deja suivi" → enforce le niveau notifications via PUT', async () => {
      userServiceMock.followGame.mockRejectedValueOnce(
        makeError(400, 'Ce jeu est déjà suivi'),
      );
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        notifications: false,
      });
      await followSync.syncQueuedFollow();

      // Déjà suivi → on enforce le niveau (convergence du toggle cloche)
      expect(userServiceMock.setFollowNotifications).toHaveBeenCalledWith(
        '76561197960287930',
        '730',
        false,
      );
      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('nouveau follow (POST réussit) → PAS de PUT (niveau posé à l\'insert)', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        notifications: false,
      });
      await followSync.syncQueuedFollow();

      expect(userServiceMock.followGame).toHaveBeenCalled();
      expect(userServiceMock.setFollowNotifications).not.toHaveBeenCalled();
    });

    it('idempotent : 400 "pas suivi" sur unfollow → success', async () => {
      userServiceMock.unfollowGame.mockRejectedValueOnce({
        status: 400,
        message: "Ce jeu n'est pas suivi",
      });
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: false,
      });
      await followSync.syncQueuedFollow();

      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('erreur permanente non-idempotente (401/403) → task drop + clear local mutation', async () => {
      await local.queueLocalFollowMutation({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });
      userServiceMock.followGame.mockRejectedValueOnce({
        status: 403,
        message: 'forbidden',
      });
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });
      await followSync.syncQueuedFollow();

      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
      // mutation locale a aussi été nettoyée
      expect(
        await local.hasPendingFollowMutation({
          steamId: '76561197960287930',
          appId: '730',
        }),
      ).toBe(false);
    });
  });

  describe('reconcilePendingFollowMutations()', () => {
    it('renvoie 0 si pas de steamId', async () => {
      expect(await followSync.reconcilePendingFollowMutations({})).toBe(0);
    });

    it('renvoie 0 si pas de mutation pending', async () => {
      expect(
        await followSync.reconcilePendingFollowMutations({
          steamId: '76561197960287930',
        }),
      ).toBe(0);
    });

    it('re-enqueue les mutations orphelines (pas déjà dans la queue)', async () => {
      await local.queueLocalFollowMutation({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
        gameRef: { name: 'CSGO' },
      });

      const count = await followSync.reconcilePendingFollowMutations({
        steamId: '76561197960287930',
      });
      expect(count).toBe(1);
      expect(
        await followSync.hasQueuedFollowSync('76561197960287930'),
      ).toBe(true);
    });

    it('ne ré-enqueue PAS si la task est déjà queue (skip dedupe)', async () => {
      await followSync.queueFollowSync({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });
      await local.queueLocalFollowMutation({
        steamId: '76561197960287930',
        appId: '730',
        targetIsFollowed: true,
      });

      const count = await followSync.reconcilePendingFollowMutations({
        steamId: '76561197960287930',
      });
      expect(count).toBe(0);
    });
  });
});
