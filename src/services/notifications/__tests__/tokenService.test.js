const fcmMock = {
  getToken: jest.fn(),
  deleteToken: jest.fn(),
};
const userServiceMock = {
  registerFCMToken: jest.fn(),
  unregisterFCMToken: jest.fn(),
};
const permissionMock = {
  ensureNotificationPermission: jest.fn(),
};

jest.doMock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: () => ({}),
  getToken: (...args) => fcmMock.getToken(...args),
  deleteToken: (...args) => fcmMock.deleteToken(...args),
}));

jest.doMock('../runtime', () => ({
  messagingInstance: { id: 'mock-messaging' },
}));

jest.doMock('../presentation', () => permissionMock);
jest.doMock('../../api', () => ({ userService: userServiceMock }));

const {
  registerFCMToken,
  unregisterFCMToken,
} = require('../tokenService');

describe('services/notifications/tokenService', () => {
  beforeEach(() => {
    fcmMock.getToken.mockReset();
    fcmMock.deleteToken.mockReset();
    userServiceMock.registerFCMToken.mockReset();
    userServiceMock.unregisterFCMToken.mockReset();
    permissionMock.ensureNotificationPermission.mockReset();
  });

  describe('registerFCMToken()', () => {
    it('refuse si steamId vide', async () => {
      const r = await registerFCMToken('');
      expect(r).toEqual({ success: false, status: 'missing-steamid' });
      expect(fcmMock.getToken).not.toHaveBeenCalled();
    });

    it('refuse si permission denied', async () => {
      permissionMock.ensureNotificationPermission.mockResolvedValue({
        granted: false,
        status: 'denied',
      });
      const r = await registerFCMToken('76561197960287930');
      expect(r).toEqual({ success: false, status: 'denied' });
    });

    it('refuse si permission blocked', async () => {
      permissionMock.ensureNotificationPermission.mockResolvedValue({
        granted: false,
        status: 'blocked',
      });
      const r = await registerFCMToken('76561197960287930');
      expect(r.status).toBe('blocked');
    });

    it('appelle userService.registerFCMToken si granted', async () => {
      permissionMock.ensureNotificationPermission.mockResolvedValue({
        granted: true,
        status: 'authorized',
      });
      fcmMock.getToken.mockResolvedValue('fcm-tok-xxxxxxxxxxxxxxxxxxxx');
      userServiceMock.registerFCMToken.mockResolvedValue();

      const r = await registerFCMToken('76561197960287930');
      expect(r).toEqual({ success: true, status: 'authorized' });
      expect(userServiceMock.registerFCMToken).toHaveBeenCalledWith(
        '76561197960287930',
        'fcm-tok-xxxxxxxxxxxxxxxxxxxx',
        expect.any(String),
      );
    });

    it('renvoie status="error" si getToken throw', async () => {
      permissionMock.ensureNotificationPermission.mockResolvedValue({
        granted: true,
        status: 'authorized',
      });
      fcmMock.getToken.mockRejectedValue(new Error('fcm down'));

      const r = await registerFCMToken('76561197960287930');
      expect(r).toEqual({ success: false, status: 'error' });
    });
  });

  describe('unregisterFCMToken()', () => {
    it('refuse si steamId vide', async () => {
      expect(await unregisterFCMToken('')).toBe(false);
    });

    it('appelle userService.unregisterFCMToken + deleteToken', async () => {
      fcmMock.getToken.mockResolvedValue('fcm-tok');
      const r = await unregisterFCMToken('76561197960287930');
      expect(r).toBe(true);
      expect(userServiceMock.unregisterFCMToken).toHaveBeenCalledWith(
        '76561197960287930',
        'fcm-tok',
      );
      expect(fcmMock.deleteToken).toHaveBeenCalled();
    });

    it('saute userService.unregisterFCMToken si pas de token', async () => {
      fcmMock.getToken.mockResolvedValue(null);
      const r = await unregisterFCMToken('76561197960287930');
      expect(userServiceMock.unregisterFCMToken).not.toHaveBeenCalled();
      expect(r).toBe(true);
    });

    it('renvoie false sur erreur', async () => {
      fcmMock.getToken.mockRejectedValue(new Error('boom'));
      expect(await unregisterFCMToken('76561197960287930')).toBe(false);
    });
  });
});
