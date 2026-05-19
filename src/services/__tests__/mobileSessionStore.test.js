import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  persistMobileSession,
  getMobileSession,
  clearMobileSession,
} from '../mobileSessionStore';

describe('services/mobileSessionStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('persistMobileSession + getMobileSession', () => {
    it('persiste et relit un token + expiresAt', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await persistMobileSession({ token: 'abc', expiresAt: future });

      const session = await getMobileSession();
      expect(session).toEqual({ token: 'abc', expiresAt: future });
    });

    it('accepte les clés sessionToken/sessionExpiresAt (alias backend)', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      await persistMobileSession({
        sessionToken: 'xyz',
        sessionExpiresAt: future,
      });
      const session = await getMobileSession();
      expect(session.token).toBe('xyz');
    });

    it('clear si on persist sans token', async () => {
      await persistMobileSession({ token: 'abc' });
      await persistMobileSession({});
      expect(await getMobileSession()).toBeNull();
    });
  });

  describe('getMobileSession()', () => {
    it('renvoie null si pas de token', async () => {
      expect(await getMobileSession()).toBeNull();
    });

    it('renvoie null + clear si expiresAt passé', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await persistMobileSession({ token: 'expired', expiresAt: past });

      expect(await getMobileSession()).toBeNull();
      // Token doit avoir été retiré
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();
    });

    it('accepte token sans expiresAt (valide)', async () => {
      await AsyncStorage.setItem('mobileSessionToken', 'no-exp');
      const session = await getMobileSession();
      expect(session.token).toBe('no-exp');
    });
  });

  describe('clearMobileSession()', () => {
    it('retire token + expiresAt', async () => {
      await persistMobileSession({
        token: 't',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      await clearMobileSession();
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();
      expect(await AsyncStorage.getItem('mobileSessionExpiresAt')).toBeNull();
    });
  });
});
