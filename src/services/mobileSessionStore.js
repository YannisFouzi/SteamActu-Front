import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_TOKEN_KEY = 'mobileSessionToken';
const SESSION_EXPIRES_AT_KEY = 'mobileSessionExpiresAt';

export const clearMobileSession = async () => {
  await AsyncStorage.multiRemove([SESSION_TOKEN_KEY, SESSION_EXPIRES_AT_KEY]);
};

export const persistMobileSession = async session => {
  const token = session?.token || session?.sessionToken;
  const expiresAt = session?.expiresAt || session?.sessionExpiresAt || '';

  if (!token) {
    await clearMobileSession();
    return;
  }

  await AsyncStorage.multiSet([
    [SESSION_TOKEN_KEY, token],
    [SESSION_EXPIRES_AT_KEY, expiresAt],
  ]);
};

export const getMobileSession = async () => {
  const entries = await AsyncStorage.multiGet([
    SESSION_TOKEN_KEY,
    SESSION_EXPIRES_AT_KEY,
  ]);
  const session = Object.fromEntries(entries);
  const token = session[SESSION_TOKEN_KEY];
  const expiresAt = session[SESSION_EXPIRES_AT_KEY];

  if (!token) {
    return null;
  }

  if (expiresAt) {
    const expiresAtMs = Date.parse(expiresAt);

    if (Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs) {
      await clearMobileSession();
      return null;
    }
  }

  return {token, expiresAt};
};
