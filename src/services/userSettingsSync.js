import {debugLog, maskSteamId} from '../hooks/hooksLogger';
import {
  buildNotificationSettingsPayload,
  requiresNotifications,
  resolveUserSettingsSnapshot,
} from '../context/app/userSettingsHelpers';
import {userService} from './api';
import {
  registerFCMToken,
  unregisterFCMToken,
} from './notificationService';
import {
  clearOfflineSyncTasks,
  enqueueOfflineSyncTask,
  hasQueuedOfflineSyncTask,
  registerOfflineSyncTaskType,
  syncOfflineQueue,
} from './offlineSyncQueue';

const USER_SETTINGS_SYNC_TASK_TYPE = 'user-settings';
const USER_SETTINGS_SYNC_DEDUPE_KEY = 'user-settings';
const TOKEN_ACTIONS = ['none', 'register', 'unregister'];

const normalizeSteamId = steamId =>
  typeof steamId === 'string' ? steamId.trim() : String(steamId || '').trim();

const normalizeTokenAction = action =>
  TOKEN_ACTIONS.includes(action) ? action : 'none';

export const getSettingsNotificationTokenAction = (
  previousSnapshot,
  nextSnapshot,
) => {
  const previous = resolveUserSettingsSnapshot(previousSnapshot);
  const next = resolveUserSettingsSnapshot(nextSnapshot);
  const previousRequiresNotifications = requiresNotifications(
    previous.newsNotifications,
    previous.libraryFollowMode,
    previous.wishlistFollowMode,
  );
  const nextRequiresNotifications = requiresNotifications(
    next.newsNotifications,
    next.libraryFollowMode,
    next.wishlistFollowMode,
  );

  if (nextRequiresNotifications) {
    return 'register';
  }

  if (previousRequiresNotifications && !nextRequiresNotifications) {
    return 'unregister';
  }

  return 'none';
};

const syncNotificationToken = async ({steamId, notificationTokenAction}) => {
  if (notificationTokenAction === 'register') {
    const result = await registerFCMToken(steamId);

    if (result?.success) {
      return true;
    }

    if (['blocked', 'denied', 'missing-steamid'].includes(result?.status)) {
      debugLog('[SETTINGS] Token FCM non synchronise: permission indisponible', {
        status: result?.status,
      });
      return true;
    }

    throw new Error(`FCM token registration failed: ${result?.status}`);
  }

  if (notificationTokenAction === 'unregister') {
    await unregisterFCMToken(steamId);
  }

  return true;
};

registerOfflineSyncTaskType(
  USER_SETTINGS_SYNC_TASK_TYPE,
  async ({steamId, settings, notificationTokenAction}) => {
    const normalizedSteamId = normalizeSteamId(steamId);

    if (!normalizedSteamId) {
      const error = new Error('Invalid queued user settings');
      error.offlineSyncPermanent = true;
      throw error;
    }

    const snapshot = resolveUserSettingsSnapshot(settings);

    await userService.updateNotificationSettings(
      normalizedSteamId,
      buildNotificationSettingsPayload(snapshot),
    );

    await syncNotificationToken({
      steamId: normalizedSteamId,
      notificationTokenAction: normalizeTokenAction(notificationTokenAction),
    });
  },
);

export const hasQueuedUserSettingsSync = async steamId =>
  hasQueuedOfflineSyncTask({
    scopeKey: normalizeSteamId(steamId),
    type: USER_SETTINGS_SYNC_TASK_TYPE,
  });

export const queueUserSettingsSync = async (
  steamId,
  settings,
  options = {},
) => {
  const normalizedSteamId = normalizeSteamId(steamId);

  if (!normalizedSteamId) {
    return false;
  }

  const snapshot = resolveUserSettingsSnapshot(settings);
  const notificationTokenAction = normalizeTokenAction(
    options.notificationTokenAction,
  );

  await enqueueOfflineSyncTask({
    type: USER_SETTINGS_SYNC_TASK_TYPE,
    scopeKey: normalizedSteamId,
    dedupeKey: USER_SETTINGS_SYNC_DEDUPE_KEY,
    payload: {
      steamId: normalizedSteamId,
      settings: snapshot,
      notificationTokenAction,
    },
  });

  debugLog('[SETTINGS] settings sync queued', {
    steamId: maskSteamId(normalizedSteamId),
    notificationTokenAction,
  });

  return true;
};

export const clearQueuedUserSettingsSync = async scopeKey => {
  await clearOfflineSyncTasks({
    scopeKey,
    types: [USER_SETTINGS_SYNC_TASK_TYPE],
  });
};

export const syncQueuedUserSettings = ({steamId, ...options} = {}) =>
  syncOfflineQueue({
    scopeKey: normalizeSteamId(steamId),
    reason: 'user-settings',
    ...options,
  });
