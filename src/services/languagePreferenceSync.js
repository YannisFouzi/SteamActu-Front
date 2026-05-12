import {normalizeLanguage, SUPPORTED_LANGUAGES} from '../i18n';
import {debugLog, maskSteamId} from '../hooks/hooksLogger';
import {userService} from './api';
import {
  clearOfflineSyncTasks,
  enqueueOfflineSyncTask,
  syncOfflineQueue,
  registerOfflineSyncTaskType,
} from './offlineSyncQueue';

const LANGUAGE_SYNC_TASK_TYPE = 'app-language';
const LANGUAGE_SYNC_DEDUPE_KEY = 'app-language';

const normalizeSteamId = steamId =>
  typeof steamId === 'string' ? steamId.trim() : String(steamId || '').trim();

const isValidLanguage = language => SUPPORTED_LANGUAGES.includes(language);

registerOfflineSyncTaskType(
  LANGUAGE_SYNC_TASK_TYPE,
  async ({steamId, language}) => {
    const normalizedSteamId = normalizeSteamId(steamId);
    const normalizedLanguage = normalizeLanguage(language);

    if (!normalizedSteamId || !isValidLanguage(normalizedLanguage)) {
      const error = new Error('Invalid queued language preference');
      error.offlineSyncPermanent = true;
      throw error;
    }

    await userService.updateLanguage(normalizedSteamId, normalizedLanguage);
  },
);

export const queueLanguagePreferenceSync = async (steamId, language) => {
  const normalizedSteamId = normalizeSteamId(steamId);
  const normalizedLanguage = normalizeLanguage(language);

  if (!normalizedSteamId || !isValidLanguage(normalizedLanguage)) {
    return false;
  }

  await enqueueOfflineSyncTask({
    type: LANGUAGE_SYNC_TASK_TYPE,
    scopeKey: normalizedSteamId,
    dedupeKey: LANGUAGE_SYNC_DEDUPE_KEY,
    payload: {
      steamId: normalizedSteamId,
      language: normalizedLanguage,
    },
  });

  debugLog('[i18n] language sync queued', {
    steamId: maskSteamId(normalizedSteamId),
    language: normalizedLanguage,
  });

  return true;
};

export const clearQueuedLanguagePreferenceSync = async scopeKey => {
  await clearOfflineSyncTasks({
    scopeKey,
    types: [LANGUAGE_SYNC_TASK_TYPE],
  });
};

export const syncQueuedLanguagePreference = ({steamId, ...options} = {}) =>
  syncOfflineQueue({
    scopeKey: normalizeSteamId(steamId),
    reason: 'language-preference',
    ...options,
  });
