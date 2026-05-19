const linkingMock = { openURL: jest.fn() };

jest.doMock('react-native', () => ({
  Linking: linkingMock,
  Platform: { OS: 'android' },
}));

const {
  isValidAppId,
  openUrlSafely,
  extractNotificationPayload,
  canDisplayUnfollowAction,
  appIdOrThrow,
  logCriticalNotificationError,
  logNotificationWarning,
} = require('../helpers');

describe('services/notifications/helpers', () => {
  describe('isValidAppId()', () => {
    it.each([
      ['730', true],
      [730, true],
      ['1234567', true],
      ['', false],
      [null, false],
      [undefined, false],
      ['abc', false],
      ['  ', false],
    ])('isValidAppId(%p) → %p', (input, expected) => {
      expect(isValidAppId(input)).toBe(expected);
    });
  });

  describe('openUrlSafely()', () => {
    beforeEach(() => {
      linkingMock.openURL.mockReset();
    });

    it('no-op si url vide', async () => {
      await openUrlSafely('');
      expect(linkingMock.openURL).not.toHaveBeenCalled();
    });

    it('appelle Linking.openURL', async () => {
      await openUrlSafely('https://x.com');
      expect(linkingMock.openURL).toHaveBeenCalledWith('https://x.com');
    });

    it('swallow l\'erreur si Linking throw', async () => {
      linkingMock.openURL.mockRejectedValueOnce(new Error('boom'));
      await expect(openUrlSafely('https://x.com')).resolves.toBeUndefined();
    });
  });

  describe('extractNotificationPayload()', () => {
    it('renvoie null si remoteMessage null', () => {
      expect(extractNotificationPayload(null)).toBeNull();
    });

    it('renvoie null si pas de title NI de body', () => {
      expect(extractNotificationPayload({ data: {} })).toBeNull();
    });

    it('priorité notification.title > data.title', () => {
      const p = extractNotificationPayload({
        messageId: 'm1',
        notification: { title: 'NotifTitle', body: 'NotifBody' },
        data: { title: 'DataTitle', body: 'DataBody' },
      });
      expect(p.title).toBe('NotifTitle');
      expect(p.body).toBe('NotifBody');
    });

    it('fallback sur data.title et data.body', () => {
      const p = extractNotificationPayload({
        messageId: 'm2',
        data: { title: 'T', body: 'B', type: 'news' },
      });
      expect(p.title).toBe('T');
      expect(p.type).toBe('news');
    });

    it('coerce allowUnfollow en boolean depuis string "true"', () => {
      const p = extractNotificationPayload({
        notification: { title: 'x' },
        data: { allowUnfollow: 'true' },
      });
      expect(p.allowUnfollow).toBe(true);

      const p2 = extractNotificationPayload({
        notification: { title: 'x' },
        data: { allowUnfollow: 'false' },
      });
      expect(p2.allowUnfollow).toBe(false);
    });

    it('id = messageId ou data.notificationId ou Date.now()', () => {
      const p = extractNotificationPayload({
        messageId: 'm-xyz',
        notification: { title: 'x' },
      });
      expect(p.id).toBe('m-xyz');

      const p2 = extractNotificationPayload({
        notification: { title: 'x' },
        data: { notificationId: 'n-123' },
      });
      expect(p2.id).toBe('n-123');

      const p3 = extractNotificationPayload({
        notification: { title: 'x' },
        data: {},
      });
      expect(typeof p3.id).toBe('string');
    });

    it('data inclut imageUrl, gameLogoUrl, type avec defaults', () => {
      const p = extractNotificationPayload({
        notification: { title: 'x' },
        data: { imageUrl: 'i', gameLogoUrl: 'g', type: 'news' },
      });
      expect(p.imageUrl).toBe('i');
      expect(p.gameLogoUrl).toBe('g');
      expect(p.data.notificationId).toBe(p.id);
    });
  });

  describe('canDisplayUnfollowAction()', () => {
    it('true si type=news + allowUnfollow + appId valide', () => {
      expect(
        canDisplayUnfollowAction({
          type: 'news',
          allowUnfollow: true,
          data: { appId: '730' },
        }),
      ).toBe(true);
    });

    it('false si type≠news', () => {
      expect(
        canDisplayUnfollowAction({
          type: 'follow_prompt',
          allowUnfollow: true,
          data: { appId: '730' },
        }),
      ).toBe(false);
    });

    it('false si allowUnfollow=false', () => {
      expect(
        canDisplayUnfollowAction({
          type: 'news',
          allowUnfollow: false,
          data: { appId: '730' },
        }),
      ).toBe(false);
    });

    it('false si appId invalide', () => {
      expect(
        canDisplayUnfollowAction({
          type: 'news',
          allowUnfollow: true,
          data: {},
        }),
      ).toBe(false);
    });

    it('false si payload null', () => {
      expect(canDisplayUnfollowAction(null)).toBe(false);
    });
  });

  describe('appIdOrThrow()', () => {
    it('coerce en string si valide', () => {
      expect(appIdOrThrow(730)).toBe('730');
      expect(appIdOrThrow('730')).toBe('730');
    });

    it('throw si invalide', () => {
      expect(() => appIdOrThrow('abc')).toThrow(/appId/);
      expect(() => appIdOrThrow(null)).toThrow();
    });
  });

  describe('logCriticalNotificationError + logNotificationWarning', () => {
    it('appellent console.error / console.warn sans throw', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      logCriticalNotificationError('msg', new Error('e'), { ctx: 'x' });
      logNotificationWarning('warn', { ctx: 'y' });

      expect(errSpy).toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalled();
    });
  });
});
