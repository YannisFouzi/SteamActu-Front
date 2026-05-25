import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

import {
  persistMobileSession,
  getMobileSession,
  clearMobileSession,
} from '../mobileSessionStore';

const SERVICE = 'gamenews.mobileSession';

describe('services/mobileSessionStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Vide le mock keychain (helper expose par le mock dans jest.setup.js)
    Keychain.__resetMock();
  });

  describe('persistMobileSession + getMobileSession', () => {
    it('persiste et relit un token + expiresAt via Keychain', async () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await persistMobileSession({token: 'abc', expiresAt: future});

      const session = await getMobileSession();
      expect(session).toEqual({token: 'abc', expiresAt: future});

      // Aucune ecriture dans AsyncStorage
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();

      // Donnees bien dans Keychain sous le bon service
      const creds = await Keychain.getGenericPassword({service: SERVICE});
      expect(creds).toBeTruthy();
      expect(JSON.parse(creds.password)).toEqual({
        token: 'abc',
        expiresAt: future,
      });
    });

    it('accepte les cles sessionToken/sessionExpiresAt (alias backend)', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      await persistMobileSession({
        sessionToken: 'xyz',
        sessionExpiresAt: future,
      });
      const session = await getMobileSession();
      expect(session.token).toBe('xyz');
    });

    it('clear si on persist sans token', async () => {
      await persistMobileSession({token: 'abc'});
      await persistMobileSession({});
      expect(await getMobileSession()).toBeNull();
    });
  });

  describe('getMobileSession()', () => {
    it('renvoie null si pas de token', async () => {
      expect(await getMobileSession()).toBeNull();
    });

    it('renvoie null + clear si expiresAt passe', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await persistMobileSession({token: 'expired', expiresAt: past});

      expect(await getMobileSession()).toBeNull();
      // Token doit avoir ete retire du Keychain
      const after = await Keychain.getGenericPassword({service: SERVICE});
      expect(after).toBe(false);
    });

    it('accepte token sans expiresAt (valide)', async () => {
      await Keychain.setGenericPassword(
        'mobileSession',
        JSON.stringify({token: 'no-exp', expiresAt: ''}),
        {service: SERVICE},
      );
      const session = await getMobileSession();
      expect(session.token).toBe('no-exp');
    });

    it('retourne null + ne crash pas si payload JSON corrompu', async () => {
      await Keychain.setGenericPassword('mobileSession', 'not-json{', {
        service: SERVICE,
      });
      expect(await getMobileSession()).toBeNull();
    });
  });

  describe('clearMobileSession()', () => {
    it('retire le token du Keychain ET nettoie les anciennes cles AsyncStorage', async () => {
      await persistMobileSession({
        token: 't',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      });
      // Simule un residu d'ancienne version dans AsyncStorage
      await AsyncStorage.setItem('mobileSessionToken', 'legacy-residue');
      await AsyncStorage.setItem('mobileSessionExpiresAt', 'whatever');

      await clearMobileSession();

      expect(await Keychain.getGenericPassword({service: SERVICE})).toBe(false);
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();
      expect(await AsyncStorage.getItem('mobileSessionExpiresAt')).toBeNull();
    });
  });

  describe('migration depuis AsyncStorage (one-shot, transparente)', () => {
    it('migre un token legacy AsyncStorage vers Keychain au premier getMobileSession()', async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      await AsyncStorage.setItem('mobileSessionToken', 'legacy-token');
      await AsyncStorage.setItem('mobileSessionExpiresAt', future);

      const session = await getMobileSession();
      expect(session).toEqual({token: 'legacy-token', expiresAt: future});

      // L'AsyncStorage a ete vide
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();
      expect(await AsyncStorage.getItem('mobileSessionExpiresAt')).toBeNull();

      // Le token est maintenant dans le Keychain
      const creds = await Keychain.getGenericPassword({service: SERVICE});
      expect(creds).toBeTruthy();
      expect(JSON.parse(creds.password).token).toBe('legacy-token');
    });

    it('migre meme sans expiresAt legacy (cas anciennes versions)', async () => {
      await AsyncStorage.setItem('mobileSessionToken', 'no-exp-legacy');

      const session = await getMobileSession();
      expect(session.token).toBe('no-exp-legacy');
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBeNull();
    });

    it('ne touche pas a AsyncStorage si Keychain a deja un token (pas de double migration)', async () => {
      await persistMobileSession({token: 'fresh', expiresAt: ''});
      await AsyncStorage.setItem('mobileSessionToken', 'legacy-zombie');

      const session = await getMobileSession();
      expect(session.token).toBe('fresh');
      // Le residu AsyncStorage est preserve (sera cleanup par clearMobileSession
      // ou ignore au prochain logout)
      expect(await AsyncStorage.getItem('mobileSessionToken')).toBe('legacy-zombie');
    });

    it('si le token legacy migre est deja expire, clearMobileSession est appele', async () => {
      const past = new Date(Date.now() - 60_000).toISOString();
      await AsyncStorage.setItem('mobileSessionToken', 'expired-legacy');
      await AsyncStorage.setItem('mobileSessionExpiresAt', past);

      expect(await getMobileSession()).toBeNull();
      // Le Keychain a ete clear (a recu la migration puis vide)
      expect(await Keychain.getGenericPassword({service: SERVICE})).toBe(false);
    });
  });
});
