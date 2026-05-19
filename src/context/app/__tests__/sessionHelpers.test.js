const steamServiceMock = {
  getProfile: jest.fn(),
};

jest.doMock('../../../services/api', () => ({ steamService: steamServiceMock }));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {
  getSteamProfileCacheKey,
  normalizeSteamProfile,
  readStoredSteamProfile,
  persistSteamProfile,
  fetchSteamProfile,
} = require('../sessionHelpers');

const STEAM = '76561197960287930';

describe('context/app/sessionHelpers', () => {
  beforeEach(async () => {
    steamServiceMock.getProfile.mockReset();
    await AsyncStorage.clear();
  });

  describe('getSteamProfileCacheKey()', () => {
    it('renvoie app:steamProfile:{steamId}', () => {
      expect(getSteamProfileCacheKey(STEAM)).toBe(`app:steamProfile:${STEAM}`);
    });

    it('null si steamId vide', () => {
      expect(getSteamProfileCacheKey('')).toBeNull();
    });
  });

  describe('normalizeSteamProfile()', () => {
    it('null si null/undefined/non-object', () => {
      expect(normalizeSteamProfile(null)).toBeNull();
      expect(normalizeSteamProfile(undefined)).toBeNull();
      expect(normalizeSteamProfile('string')).toBeNull();
    });

    it('null si personaname ET avatarfull vides', () => {
      expect(normalizeSteamProfile({})).toBeNull();
      expect(normalizeSteamProfile({ personaname: '', avatarfull: '' })).toBeNull();
    });

    it('trim les valeurs string', () => {
      const p = normalizeSteamProfile({
        personaname: '  Alice  ',
        avatarfull: ' https://a/x ',
      });
      expect(p).toEqual({
        personaname: 'Alice',
        avatarfull: 'https://a/x',
      });
    });

    it('garde si avatarfull seul', () => {
      expect(
        normalizeSteamProfile({ avatarfull: 'https://a/x' }),
      ).toEqual({ personaname: '', avatarfull: 'https://a/x' });
    });

    it('ignore les autres champs (whitelist 2 champs)', () => {
      const p = normalizeSteamProfile({
        personaname: 'A',
        avatarfull: 'x',
        extra: 'ignored',
      });
      expect(p).toEqual({ personaname: 'A', avatarfull: 'x' });
    });
  });

  describe('persistSteamProfile + readStoredSteamProfile', () => {
    it('round-trip normalisé', async () => {
      const p = await persistSteamProfile(STEAM, {
        personaname: '  Alice  ',
        avatarfull: 'a.jpg',
      });
      expect(p).toEqual({ personaname: 'Alice', avatarfull: 'a.jpg' });

      const stored = await readStoredSteamProfile(STEAM);
      expect(stored).toEqual({ personaname: 'Alice', avatarfull: 'a.jpg' });
    });

    it('persist null efface le storage', async () => {
      await persistSteamProfile(STEAM, { personaname: 'A', avatarfull: 'x' });
      await persistSteamProfile(STEAM, null);
      expect(await readStoredSteamProfile(STEAM)).toBeNull();
    });

    it('readStoredSteamProfile null si pas en storage', async () => {
      expect(await readStoredSteamProfile(STEAM)).toBeNull();
    });
  });

  describe('fetchSteamProfile()', () => {
    it('appelle getProfile + normalise', async () => {
      steamServiceMock.getProfile.mockResolvedValue({
        data: { personaname: 'A', avatarfull: 'x', extra: 'y' },
      });

      const p = await fetchSteamProfile(STEAM);
      expect(steamServiceMock.getProfile).toHaveBeenCalledWith(STEAM);
      expect(p).toEqual({ personaname: 'A', avatarfull: 'x' });
    });

    it('null si response invalide', async () => {
      steamServiceMock.getProfile.mockResolvedValue({ data: {} });
      expect(await fetchSteamProfile(STEAM)).toBeNull();
    });
  });
});
