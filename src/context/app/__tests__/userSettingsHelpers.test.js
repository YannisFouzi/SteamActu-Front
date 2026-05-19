import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FOLLOW_MODES,
  USER_SETTINGS_STATUS,
  DEFAULT_USER_SETTINGS,
  normalizeFollowMode,
  resolveNewsNotifications,
  resolveConfirmUnfollowGames,
  resolveUserSettingsSnapshot,
  requiresNotifications,
  buildNotificationSettingsPayload,
  persistUserSettingsToStorage,
  readStoredUserSettings,
} from '../userSettingsHelpers';

describe('context/app/userSettingsHelpers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('constantes', () => {
    it('FOLLOW_MODES = [off, auto, prompt]', () => {
      expect(FOLLOW_MODES).toEqual(['off', 'auto', 'prompt']);
    });

    it('USER_SETTINGS_STATUS', () => {
      expect(USER_SETTINGS_STATUS).toEqual({
        IDLE: 'idle',
        HYDRATING: 'hydrating',
        READY: 'ready',
      });
    });

    it('DEFAULT_USER_SETTINGS', () => {
      expect(DEFAULT_USER_SETTINGS).toEqual({
        newsNotifications: false,
        libraryFollowMode: 'off',
        wishlistFollowMode: 'off',
        confirmUnfollowGames: true,
      });
    });
  });

  describe('normalizeFollowMode()', () => {
    it.each(['off', 'auto', 'prompt'])('accepte "%s"', (mode) => {
      expect(normalizeFollowMode(mode)).toBe(mode);
    });

    it('case-insensitive', () => {
      expect(normalizeFollowMode('AUTO')).toBe('auto');
    });

    it('fallback legacy boolean (string "true" → auto)', () => {
      expect(normalizeFollowMode(undefined, 'true')).toBe('auto');
      expect(normalizeFollowMode(undefined, 'false')).toBe('off');
    });

    it('fallback legacy boolean (bool true → auto)', () => {
      expect(normalizeFollowMode(undefined, true)).toBe('auto');
      expect(normalizeFollowMode(undefined, false)).toBe('off');
    });

    it('défaut "off" si rien d\'utilisable', () => {
      expect(normalizeFollowMode(undefined)).toBe('off');
      expect(normalizeFollowMode('invalid')).toBe('off');
      expect(normalizeFollowMode(null, 'not-json')).toBe('off');
    });
  });

  describe('resolveNewsNotifications()', () => {
    it('priorité newsNotifications booléen', () => {
      expect(resolveNewsNotifications(true, false)).toBe(true);
      expect(resolveNewsNotifications(false, true)).toBe(false);
    });

    it('fallback legacy enabled', () => {
      expect(resolveNewsNotifications(undefined, true)).toBe(true);
      expect(resolveNewsNotifications(undefined, false)).toBe(false);
    });

    it('défaut DEFAULT_USER_SETTINGS.newsNotifications', () => {
      expect(resolveNewsNotifications(undefined, undefined)).toBe(false);
    });
  });

  describe('resolveConfirmUnfollowGames()', () => {
    it('renvoie la valeur si boolean', () => {
      expect(resolveConfirmUnfollowGames(false)).toBe(false);
      expect(resolveConfirmUnfollowGames(true)).toBe(true);
    });

    it('défaut true sinon', () => {
      expect(resolveConfirmUnfollowGames(undefined)).toBe(true);
      expect(resolveConfirmUnfollowGames('not-a-bool')).toBe(true);
    });
  });

  describe('resolveUserSettingsSnapshot()', () => {
    it('renvoie defaults si input invalide', () => {
      expect(resolveUserSettingsSnapshot(null)).toEqual(DEFAULT_USER_SETTINGS);
      expect(resolveUserSettingsSnapshot('not-object')).toEqual(DEFAULT_USER_SETTINGS);
    });

    it('résout les 4 champs depuis un input complet', () => {
      const snap = resolveUserSettingsSnapshot({
        newsNotifications: true,
        libraryFollowMode: 'auto',
        wishlistFollowMode: 'prompt',
        confirmUnfollowGames: false,
      });
      expect(snap).toEqual({
        newsNotifications: true,
        libraryFollowMode: 'auto',
        wishlistFollowMode: 'prompt',
        confirmUnfollowGames: false,
      });
    });

    it('legacy enabled → newsNotifications, legacy autoFollow* → modes', () => {
      const snap = resolveUserSettingsSnapshot({
        enabled: true,
        autoFollowNewGames: true,
        autoFollowWishlistGames: false,
      });
      expect(snap.newsNotifications).toBe(true);
      expect(snap.libraryFollowMode).toBe('auto');
      expect(snap.wishlistFollowMode).toBe('off');
    });
  });

  describe('requiresNotifications()', () => {
    it('true si news activées', () => {
      expect(requiresNotifications(true, 'off', 'off')).toBe(true);
    });

    it('true si un mode = prompt', () => {
      expect(requiresNotifications(false, 'prompt', 'off')).toBe(true);
      expect(requiresNotifications(false, 'off', 'prompt')).toBe(true);
    });

    it('false sinon', () => {
      expect(requiresNotifications(false, 'off', 'off')).toBe(false);
      expect(requiresNotifications(false, 'auto', 'auto')).toBe(false);
    });
  });

  describe('buildNotificationSettingsPayload()', () => {
    it('construit le payload backend (5 champs)', () => {
      const payload = buildNotificationSettingsPayload({
        newsNotifications: true,
        libraryFollowMode: 'prompt',
        wishlistFollowMode: 'auto',
        confirmUnfollowGames: false,
      });

      expect(payload).toEqual({
        newsNotifications: true,
        followPromptNotifications: true, // prompt → true
        libraryFollowMode: 'prompt',
        wishlistFollowMode: 'auto',
        confirmUnfollowGames: false,
      });
    });

    it('followPromptNotifications=false si aucun prompt', () => {
      const payload = buildNotificationSettingsPayload({
        libraryFollowMode: 'auto',
        wishlistFollowMode: 'off',
      });
      expect(payload.followPromptNotifications).toBe(false);
    });
  });

  describe('persistUserSettingsToStorage() + readStoredUserSettings()', () => {
    it('persist + relit round-trip', async () => {
      await persistUserSettingsToStorage({
        newsNotifications: true,
        libraryFollowMode: 'prompt',
        wishlistFollowMode: 'auto',
        confirmUnfollowGames: false,
      });

      const stored = await readStoredUserSettings();
      expect(stored).toEqual({
        newsNotifications: true,
        libraryFollowMode: 'prompt',
        wishlistFollowMode: 'auto',
        confirmUnfollowGames: false,
      });
    });

    it('readStoredUserSettings retourne defaults si rien stocké', async () => {
      const stored = await readStoredUserSettings();
      expect(stored).toEqual({
        newsNotifications: false,
        libraryFollowMode: 'off',
        wishlistFollowMode: 'off',
        confirmUnfollowGames: true,
      });
    });

    it('persist purge les clés legacy', async () => {
      await AsyncStorage.setItem('notificationsEnabled', 'true');
      await AsyncStorage.setItem('autoFollowEnabled', 'true');
      await AsyncStorage.setItem('autoFollowWishlistEnabled', 'true');

      await persistUserSettingsToStorage({
        newsNotifications: true,
        libraryFollowMode: 'off',
        wishlistFollowMode: 'off',
      });

      expect(await AsyncStorage.getItem('notificationsEnabled')).toBeNull();
      expect(await AsyncStorage.getItem('autoFollowEnabled')).toBeNull();
      expect(await AsyncStorage.getItem('autoFollowWishlistEnabled')).toBeNull();
    });

    it('lit le fallback legacy autoFollowEnabled', async () => {
      await AsyncStorage.setItem('autoFollowEnabled', 'true');
      const stored = await readStoredUserSettings();
      expect(stored.libraryFollowMode).toBe('auto');
    });
  });
});
