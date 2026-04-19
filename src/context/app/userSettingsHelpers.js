import AsyncStorage from '@react-native-async-storage/async-storage';

export const FOLLOW_MODES = ['off', 'auto', 'prompt'];

export const USER_SETTINGS_STATUS = {
  IDLE: 'idle',
  HYDRATING: 'hydrating',
  READY: 'ready',
};

export const DEFAULT_USER_SETTINGS = {
  newsNotifications: false,
  libraryFollowMode: 'off',
  wishlistFollowMode: 'off',
};

const LEGACY_STORAGE_KEYS = [
  'notificationsEnabled',
  'autoFollowEnabled',
  'autoFollowWishlistEnabled',
];

export const normalizeFollowMode = (value, legacyBoolean = undefined) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (FOLLOW_MODES.includes(normalized)) {
      return normalized;
    }
  }

  if (typeof legacyBoolean === 'string') {
    try {
      const parsed = JSON.parse(legacyBoolean);
      if (typeof parsed === 'boolean') {
        return parsed ? 'auto' : 'off';
      }
    } catch {
      // Ignore parse errors from legacy values.
    }
  }

  if (typeof legacyBoolean === 'boolean') {
    return legacyBoolean ? 'auto' : 'off';
  }

  return DEFAULT_USER_SETTINGS.libraryFollowMode;
};

export const resolveNewsNotifications = (newsNotifications, legacyEnabled) =>
  typeof newsNotifications === 'boolean'
    ? newsNotifications
    : typeof legacyEnabled === 'boolean'
    ? legacyEnabled
    : DEFAULT_USER_SETTINGS.newsNotifications;

export const resolveUserSettingsSnapshot = notificationSettings => {
  if (!notificationSettings || typeof notificationSettings !== 'object') {
    return {...DEFAULT_USER_SETTINGS};
  }

  const {
    newsNotifications,
    enabled,
    libraryFollowMode,
    wishlistFollowMode,
    autoFollowNewGames,
    autoFollowWishlistGames,
  } = notificationSettings;

  return {
    newsNotifications: resolveNewsNotifications(newsNotifications, enabled),
    libraryFollowMode: normalizeFollowMode(
      libraryFollowMode,
      autoFollowNewGames,
    ),
    wishlistFollowMode: normalizeFollowMode(
      wishlistFollowMode,
      autoFollowWishlistGames,
    ),
  };
};

const shouldEnablePrompts = (libraryFollowMode, wishlistFollowMode) =>
  libraryFollowMode === 'prompt' || wishlistFollowMode === 'prompt';

export const requiresNotifications = (
  newsNotifications,
  libraryFollowMode,
  wishlistFollowMode,
) =>
  Boolean(newsNotifications) ||
  shouldEnablePrompts(libraryFollowMode, wishlistFollowMode);

export const persistUserSettingsToStorage = async ({
  newsNotifications,
  libraryFollowMode,
  wishlistFollowMode,
}) => {
  await AsyncStorage.multiSet([
    ['newsNotifications', JSON.stringify(Boolean(newsNotifications))],
    ['libraryFollowMode', normalizeFollowMode(libraryFollowMode)],
    ['wishlistFollowMode', normalizeFollowMode(wishlistFollowMode)],
  ]);

  await AsyncStorage.multiRemove(LEGACY_STORAGE_KEYS);
};

export const readStoredUserSettings = async () => {
  const [
    storedNews,
    storedLibraryMode,
    storedWishlistMode,
    legacyLibraryMode,
    legacyWishlistMode,
  ] = await AsyncStorage.multiGet([
    'newsNotifications',
    'libraryFollowMode',
    'wishlistFollowMode',
    'autoFollowEnabled',
    'autoFollowWishlistEnabled',
  ]);

  const localNews =
    storedNews[1] !== null ? JSON.parse(storedNews[1]) : false;

  return {
    newsNotifications: Boolean(localNews),
    libraryFollowMode: normalizeFollowMode(
      storedLibraryMode[1],
      legacyLibraryMode[1],
    ),
    wishlistFollowMode: normalizeFollowMode(
      storedWishlistMode[1],
      legacyWishlistMode[1],
    ),
  };
};
