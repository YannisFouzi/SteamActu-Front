import {getJSONItem, setJSONItem, buildStorageKey} from '../../hooks/useAsyncStorage';
import {steamService} from '../../services/api';

export const getSteamProfileCacheKey = steamId =>
  buildStorageKey('steamProfile', steamId);

export const normalizeSteamProfile = profile => {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const personaname =
    typeof profile.personaname === 'string' ? profile.personaname.trim() : '';
  const avatarfull =
    typeof profile.avatarfull === 'string' ? profile.avatarfull.trim() : '';

  if (!personaname && !avatarfull) {
    return null;
  }

  return {
    personaname,
    avatarfull,
  };
};

export const readStoredSteamProfile = async steamId =>
  normalizeSteamProfile(
    await getJSONItem(getSteamProfileCacheKey(steamId), null),
  );

export const persistSteamProfile = async (steamId, profile) => {
  const normalizedProfile = normalizeSteamProfile(profile);
  await setJSONItem(getSteamProfileCacheKey(steamId), normalizedProfile);
  return normalizedProfile;
};

export const fetchSteamProfile = async steamId => {
  const response = await steamService.getProfile(steamId);
  return normalizeSteamProfile(response?.data);
};
