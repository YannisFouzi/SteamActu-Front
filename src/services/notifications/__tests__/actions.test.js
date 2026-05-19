const notifeeMock = {
  displayNotification: jest.fn().mockResolvedValue('id'),
  cancelNotification: jest.fn().mockResolvedValue(),
  cancelDisplayedNotification: jest.fn().mockResolvedValue(),
};

const followStateMock = {
  applyLocalFollowState: jest.fn(),
  buildFollowGameRef: jest.fn((src) => ({
    appId: String(src?.appId || ''),
    name: src?.name || '',
    imageUrl: src?.imageUrl || '',
    header_image: '',
    followedAt: new Date().toISOString(),
  })),
  normalizeFollowAppId: jest.fn((v) =>
    v === null || v === undefined ? '' : String(v).trim(),
  ),
};

const followSyncMock = {
  queueFollowSync: jest.fn(),
  syncQueuedFollow: jest.fn().mockResolvedValue(),
};

const journalMock = {
  queueNotificationAction: jest.fn(),
};

const pendingFollowMock = {
  pushPendingFollowConfirm: jest.fn(),
};

const presentationMock = {
  ensureAndroidNotificationChannel: jest.fn().mockResolvedValue(),
  ensureIosNotificationCategories: jest.fn().mockResolvedValue(),
};

jest.doMock('@notifee/react-native', () => ({
  __esModule: true,
  default: notifeeMock,
}));
jest.doMock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: { openURL: jest.fn() },
}));
jest.doMock('../../followStateLocalStore', () => followStateMock);
jest.doMock('../../followSync', () => followSyncMock);
jest.doMock('../../pendingFollowConfirmStore', () => pendingFollowMock);
jest.doMock('../actionJournal', () => journalMock);
jest.doMock('../presentation', () => presentationMock);

const {
  executeNotificationUnfollow,
  executeFollowPromptAction,
  notifyUnfollowSyncCallbacks,
} = require('../actions');

describe('services/notifications/actions', () => {
  beforeEach(() => {
    Object.values(notifeeMock).forEach((fn) => fn.mockClear?.());
    Object.values(followStateMock).forEach((fn) => fn.mockClear?.());
    Object.values(followSyncMock).forEach((fn) => fn.mockClear?.());
    Object.values(journalMock).forEach((fn) => fn.mockClear?.());
    Object.values(pendingFollowMock).forEach((fn) => fn.mockClear?.());

    followSyncMock.queueFollowSync.mockResolvedValue(true);
    followStateMock.applyLocalFollowState.mockResolvedValue({ appId: '730' });
  });

  describe('executeNotificationUnfollow()', () => {
    it('refuse si steamId ou appId manquant', async () => {
      const r1 = await executeNotificationUnfollow({
        data: { appId: '730' },
        notification: {},
      });
      expect(r1).toBe(false);

      const r2 = await executeNotificationUnfollow({
        data: { steamId: 's' },
        notification: {},
      });
      expect(r2).toBe(false);
    });

    it('queue follow sync + applique local + cancel notification', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');

      const onCommitted = jest.fn().mockResolvedValue();
      const ok = await executeNotificationUnfollow({
        data: { steamId: 's', appId: '730', gameName: 'CSGO' },
        notification: { id: 'notif-1' },
        onCommitted,
      });

      expect(ok).toBe(true);
      expect(followSyncMock.queueFollowSync).toHaveBeenCalledWith(
        expect.objectContaining({ targetIsFollowed: false }),
      );
      expect(followStateMock.applyLocalFollowState).toHaveBeenCalled();
      expect(onCommitted).toHaveBeenCalledWith(
        expect.objectContaining({ appId: '730' }),
      );
      expect(notifeeMock.cancelNotification).toHaveBeenCalledWith('notif-1');
    });

    it('queueNotificationAction si onCommitted absent', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');
      await executeNotificationUnfollow({
        data: { steamId: 's', appId: '730' },
        notification: {},
      });
      expect(journalMock.queueNotificationAction).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'unfollow', appId: '730' }),
      );
    });

    it('queueNotificationAction si onCommitted throw', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');
      const onCommitted = jest.fn().mockRejectedValue(new Error('boom'));

      await executeNotificationUnfollow({
        data: { steamId: 's', appId: '730' },
        notification: {},
        onCommitted,
      });
      expect(journalMock.queueNotificationAction).toHaveBeenCalled();
    });

    it('renvoie false si queueFollowSync renvoie false', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');
      followSyncMock.queueFollowSync.mockResolvedValueOnce(false);

      const r = await executeNotificationUnfollow({
        data: { steamId: 's', appId: '730' },
        notification: {},
      });
      expect(r).toBe(false);
      expect(notifeeMock.displayNotification).toHaveBeenCalled(); // failure feedback
    });
  });

  describe('executeFollowPromptAction()', () => {
    it('no-op si appId invalide', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('');
      await executeFollowPromptAction({
        steamId: 's',
        data: { appId: '' },
      });
      expect(followSyncMock.queueFollowSync).not.toHaveBeenCalled();
    });

    it('no-op si pas de steamId et rien dans AsyncStorage', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.clear();
      await executeFollowPromptAction({
        steamId: null,
        data: { appId: '730' },
      });
      expect(followSyncMock.queueFollowSync).not.toHaveBeenCalled();
    });

    it('fallback steamId depuis AsyncStorage', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValueOnce('730');
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('steamId', 'stored-steam');

      await executeFollowPromptAction({
        steamId: null,
        data: { appId: '730' },
      });
      expect(followSyncMock.queueFollowSync).toHaveBeenCalledWith(
        expect.objectContaining({ steamId: 'stored-steam', targetIsFollowed: true }),
      );
    });

    it('appelle onFollowPromptConfirm si fourni, sinon pushPendingFollowConfirm', async () => {
      followStateMock.normalizeFollowAppId.mockReturnValue('730');
      const onConfirm = jest.fn();
      await executeFollowPromptAction({
        steamId: 's',
        data: { appId: '730', gameName: 'CSGO' },
        onFollowPromptConfirm: onConfirm,
      });
      expect(onConfirm).toHaveBeenCalledWith('730', 'CSGO');
      expect(pendingFollowMock.pushPendingFollowConfirm).not.toHaveBeenCalled();

      pendingFollowMock.pushPendingFollowConfirm.mockClear();
      onConfirm.mockClear();

      await executeFollowPromptAction({
        steamId: 's',
        data: { appId: '730', gameName: 'CSGO' },
      });
      expect(pendingFollowMock.pushPendingFollowConfirm).toHaveBeenCalledWith(
        '730',
        'CSGO',
      );
    });
  });

  describe('notifyUnfollowSyncCallbacks()', () => {
    it('appelle les 3 callbacks fournis', () => {
      const cb = {
        onNewsUnfollow: jest.fn(),
        onWishlistUnfollow: jest.fn(),
        onFollowedGamesTabUnfollow: jest.fn(),
      };
      notifyUnfollowSyncCallbacks('730', cb);
      expect(cb.onNewsUnfollow).toHaveBeenCalledWith('730');
      expect(cb.onWishlistUnfollow).toHaveBeenCalledWith('730');
      expect(cb.onFollowedGamesTabUnfollow).toHaveBeenCalledWith('730');
    });

    it('ignore les callbacks non-function', () => {
      expect(() =>
        notifyUnfollowSyncCallbacks('730', {
          onNewsUnfollow: null,
          onWishlistUnfollow: undefined,
        }),
      ).not.toThrow();
    });
  });
});
