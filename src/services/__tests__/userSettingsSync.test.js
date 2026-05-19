const userServiceMock = {
  updateNotificationSettings: jest.fn().mockResolvedValue(),
};

const notificationServiceMock = {
  registerFCMToken: jest.fn(),
  unregisterFCMToken: jest.fn(),
};

jest.doMock('../api', () => ({ userService: userServiceMock }));
jest.doMock('../notificationService', () => notificationServiceMock);

function loadFresh() {
  let mods = {};
  jest.isolateModules(() => {
    mods.queue = require('../offlineSyncQueue');
    mods.settings = require('../userSettingsSync');
  });
  return mods;
}

describe('services/userSettingsSync', () => {
  let queue, settings;

  beforeEach(async () => {
    userServiceMock.updateNotificationSettings.mockReset().mockResolvedValue();
    notificationServiceMock.registerFCMToken.mockReset();
    notificationServiceMock.unregisterFCMToken.mockReset();
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    const mods = loadFresh();
    queue = mods.queue;
    settings = mods.settings;
  });

  describe('getSettingsNotificationTokenAction()', () => {
    it('register si next requiert des notifications', () => {
      const action = settings.getSettingsNotificationTokenAction(
        { newsNotifications: false, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
        { newsNotifications: true, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
      );
      expect(action).toBe('register');
    });

    it('unregister si previous requérait notifs et next non', () => {
      const action = settings.getSettingsNotificationTokenAction(
        { newsNotifications: true, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
        { newsNotifications: false, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
      );
      expect(action).toBe('unregister');
    });

    it('none si rien ne change', () => {
      const action = settings.getSettingsNotificationTokenAction(
        { newsNotifications: false, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
        { newsNotifications: false, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
      );
      expect(action).toBe('none');
    });

    it('register quand un follow mode passe à "prompt"', () => {
      const action = settings.getSettingsNotificationTokenAction(
        { newsNotifications: false, libraryFollowMode: 'off', wishlistFollowMode: 'off' },
        { newsNotifications: false, libraryFollowMode: 'prompt', wishlistFollowMode: 'off' },
      );
      expect(action).toBe('register');
    });
  });

  describe('queueUserSettingsSync()', () => {
    it('renvoie false si steamId vide', async () => {
      expect(
        await settings.queueUserSettingsSync('', { newsNotifications: true }),
      ).toBe(false);
    });

    it('enqueue une task user-settings avec snapshot normalisé', async () => {
      await settings.queueUserSettingsSync(
        '76561197960287930',
        { newsNotifications: true, libraryFollowMode: 'auto' },
        { notificationTokenAction: 'register' },
      );

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0]).toMatchObject({
        type: 'user-settings',
        scopeKey: '76561197960287930',
      });
      expect(snap[0].payload.settings.newsNotifications).toBe(true);
      expect(snap[0].payload.notificationTokenAction).toBe('register');
    });

    it('dédup : un seul task user-settings par scope', async () => {
      await settings.queueUserSettingsSync('76561197960287930', { newsNotifications: false });
      await settings.queueUserSettingsSync('76561197960287930', { newsNotifications: true });

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0].payload.settings.newsNotifications).toBe(true);
    });
  });

  describe('syncQueuedUserSettings → exécute API + token sync', () => {
    it('PUT settings + registerFCMToken si action=register', async () => {
      notificationServiceMock.registerFCMToken.mockResolvedValue({ success: true });
      await settings.queueUserSettingsSync(
        '76561197960287930',
        { newsNotifications: true },
        { notificationTokenAction: 'register' },
      );
      await settings.syncQueuedUserSettings();

      expect(userServiceMock.updateNotificationSettings).toHaveBeenCalledWith(
        '76561197960287930',
        expect.objectContaining({ newsNotifications: true }),
      );
      expect(notificationServiceMock.registerFCMToken).toHaveBeenCalledWith(
        '76561197960287930',
      );
    });

    it('PUT settings + unregisterFCMToken si action=unregister', async () => {
      await settings.queueUserSettingsSync(
        '76561197960287930',
        { newsNotifications: false },
        { notificationTokenAction: 'unregister' },
      );
      await settings.syncQueuedUserSettings();

      expect(notificationServiceMock.unregisterFCMToken).toHaveBeenCalled();
    });

    it('register avec status "blocked" est traité comme succès silencieux', async () => {
      notificationServiceMock.registerFCMToken.mockResolvedValue({
        success: false,
        status: 'blocked',
      });
      await settings.queueUserSettingsSync(
        '76561197960287930',
        { newsNotifications: true },
        { notificationTokenAction: 'register' },
      );
      await settings.syncQueuedUserSettings();
      // task retirée malgré l'absence de token
      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('register avec status inconnu → erreur, task retry', async () => {
      notificationServiceMock.registerFCMToken.mockResolvedValue({
        success: false,
        status: 'unknown',
      });
      await settings.queueUserSettingsSync(
        '76561197960287930',
        { newsNotifications: true },
        { notificationTokenAction: 'register' },
      );
      await settings.syncQueuedUserSettings();
      // task reste en queue car erreur non permanente
      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0].attempts).toBe(1);
    });
  });

  describe('hasQueuedUserSettingsSync()', () => {
    it('false avant queue, true après', async () => {
      expect(await settings.hasQueuedUserSettingsSync('76561197960287930')).toBe(false);
      await settings.queueUserSettingsSync('76561197960287930', {});
      expect(await settings.hasQueuedUserSettingsSync('76561197960287930')).toBe(true);
    });
  });
});
