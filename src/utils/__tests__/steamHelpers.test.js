import {
  getGameImageUrl,
  getGameImageFallback,
  getPlaytimeForeverValue,
  getPlaytimeRecentValue,
  getLastPlayedValue,
  getGameAppId,
  isValidGame,
  getGameIconUrl,
} from '../steamHelpers';

describe('utils/steamHelpers', () => {
  describe('getGameImageUrl()', () => {
    it('renvoie null si game absent', () => {
      expect(getGameImageUrl(null)).toBeNull();
      expect(getGameImageUrl(undefined)).toBeNull();
    });

    it('priorité header_image > capsule > imageUrl > CDN fallback', () => {
      expect(getGameImageUrl({ header_image: 'h', capsule: 'c', appid: 730 })).toBe('h');
      expect(getGameImageUrl({ capsule: 'c', appid: 730 })).toBe('c');
      expect(getGameImageUrl({ imageUrl: 'i', appid: 730 })).toBe('i');
      expect(getGameImageUrl({ appid: 730 })).toContain('/steam/apps/730/header.jpg');
    });

    it('null si pas d\'appid ni d\'image', () => {
      expect(getGameImageUrl({})).toBeNull();
    });

    it('accepte appId (camelCase) ou appid', () => {
      expect(getGameImageUrl({ appId: 730 })).toContain('/steam/apps/730/header.jpg');
    });
  });

  describe('getGameImageFallback()', () => {
    it('renvoie une URL capsule_sm_120 pour un appid', () => {
      expect(getGameImageFallback({ appid: 730 })).toContain(
        '/steam/apps/730/capsule_sm_120.jpg',
      );
    });

    it('null si pas d\'appid ou game absent', () => {
      expect(getGameImageFallback({})).toBeNull();
      expect(getGameImageFallback(null)).toBeNull();
    });
  });

  describe('getPlaytimeForeverValue()', () => {
    it('lit depuis playtime.forever (priorité)', () => {
      expect(getPlaytimeForeverValue({ playtime: { forever: 120 } })).toBe(120);
    });

    it('lit depuis playtime.total si forever absent', () => {
      expect(getPlaytimeForeverValue({ playtime: { total: 30 } })).toBe(30);
    });

    it('fallback playtime_forever flat', () => {
      expect(getPlaytimeForeverValue({ playtime_forever: 60 })).toBe(60);
    });

    it('renvoie 0 si rien', () => {
      expect(getPlaytimeForeverValue({})).toBe(0);
      expect(getPlaytimeForeverValue(null)).toBe(0);
    });
  });

  describe('getPlaytimeRecentValue()', () => {
    it('lit playtime.recent en priorité', () => {
      expect(getPlaytimeRecentValue({ playtime: { recent: 15 } })).toBe(15);
    });

    it('fallback playtime_2weeks', () => {
      expect(getPlaytimeRecentValue({ playtime_2weeks: 7 })).toBe(7);
    });

    it('renvoie 0 si rien', () => {
      expect(getPlaytimeRecentValue({})).toBe(0);
    });
  });

  describe('getLastPlayedValue()', () => {
    it('priorité rtime_last_played', () => {
      expect(getLastPlayedValue({ rtime_last_played: 1234567890 })).toBe(1234567890);
    });

    it('fallback chain: lastPlayTime → playtime.lastPlayed → lastUpdateTimestamp', () => {
      expect(getLastPlayedValue({ lastPlayTime: 100 })).toBe(100);
      expect(getLastPlayedValue({ playtime: { lastPlayed: 200 } })).toBe(200);
      expect(getLastPlayedValue({ lastUpdateTimestamp: 300 })).toBe(300);
    });

    it('renvoie 0 si rien', () => {
      expect(getLastPlayedValue({})).toBe(0);
    });
  });

  describe('getGameAppId()', () => {
    it('coerce appid number en string', () => {
      expect(getGameAppId({ appid: 730 })).toBe('730');
    });

    it('accepte appId (camelCase)', () => {
      expect(getGameAppId({ appId: '570' })).toBe('570');
    });

    it('renvoie "" si pas d\'appId', () => {
      expect(getGameAppId({})).toBe('');
      expect(getGameAppId(null)).toBe('');
    });
  });

  describe('isValidGame()', () => {
    it('true pour { name, appid }', () => {
      expect(isValidGame({ name: 'CSGO', appid: 730 })).toBe(true);
      expect(isValidGame({ name: 'Dota', appId: 570 })).toBe(true);
    });

    it('false si name ou appid absent', () => {
      expect(isValidGame({ name: 'CSGO' })).toBe(false);
      expect(isValidGame({ appid: 730 })).toBe(false);
      expect(isValidGame({})).toBe(false);
      expect(isValidGame(null)).toBe(false);
    });
  });

  describe('getGameIconUrl()', () => {
    it('construit URL https avec appId + iconHash', () => {
      const url = getGameIconUrl(730, 'abc123');
      expect(url).toContain('/apps/730/abc123.jpg');
      expect(url).toMatch(/^https?:\/\//);
    });

    it('null si l\'un des deux manque', () => {
      expect(getGameIconUrl(null, 'abc')).toBeNull();
      expect(getGameIconUrl(730, null)).toBeNull();
      expect(getGameIconUrl('', '')).toBeNull();
    });
  });
});
