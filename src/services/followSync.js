import {debugError, debugLog, maskSteamId} from '../hooks/hooksLogger';
import {userService} from './api';
import {
  buildFollowGameRef,
  clearLocalFollowMutationIfCurrent,
  normalizeFollowAppId,
  normalizeFollowSteamId,
  readPendingFollowMutations,
} from './followStateLocalStore';
import {
  clearOfflineSyncTasks,
  enqueueOfflineSyncTask,
  getOfflineSyncQueueSnapshot,
  hasQueuedOfflineSyncTask,
  registerOfflineSyncTaskType,
  syncOfflineQueue,
} from './offlineSyncQueue';

const FOLLOW_SYNC_TASK_TYPE = 'game-follow-state';

const normalizeErrorText = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getErrorStatus = error =>
  error?.status ?? error?.response?.status ?? null;

const getErrorMessage = error =>
  error?.data?.message ||
  error?.response?.data?.message ||
  error?.message ||
  '';

const isIdempotentFollowError = (error, targetIsFollowed) => {
  const status = getErrorStatus(error);
  const message = normalizeErrorText(getErrorMessage(error));

  if (status !== 400) {
    return false;
  }

  if (targetIsFollowed) {
    return message.includes('deja suivi');
  }

  return message.includes('pas suivi');
};

const isPermanentFollowFailure = error => {
  const status = getErrorStatus(error);
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
};

const buildFollowDedupeKey = appId =>
  `${FOLLOW_SYNC_TASK_TYPE}:${normalizeFollowAppId(appId)}`;

registerOfflineSyncTaskType(
  FOLLOW_SYNC_TASK_TYPE,
  async ({
    steamId,
    appId,
    targetIsFollowed,
    gameRef,
    mutationUpdatedAt,
    notifications,
  }) => {
    const normalizedSteamId = normalizeFollowSteamId(steamId);
    const normalizedAppId = normalizeFollowAppId(appId);

    if (
      !normalizedSteamId ||
      !normalizedAppId ||
      typeof targetIsFollowed !== 'boolean'
    ) {
      const error = new Error('Invalid queued follow mutation');
      error.offlineSyncPermanent = true;
      throw error;
    }

    const normalizedGameRef = buildFollowGameRef({
      appId: normalizedAppId,
      ...(gameRef || {}),
    });

    try {
      if (targetIsFollowed) {
        // notifications:false = suivi silencieux (bouton +). Les mutations
        // legacy en file (sans le champ) suivent en notifié, comme avant.
        await userService.followGame(
          normalizedSteamId,
          normalizedAppId,
          normalizedGameRef.name,
          normalizedGameRef.imageUrl,
          notifications !== false,
        );
      } else {
        await userService.unfollowGame(normalizedSteamId, normalizedAppId);
      }
    } catch (error) {
      if (isIdempotentFollowError(error, targetIsFollowed)) {
        debugLog('[FOLLOW_SYNC] Idempotent server response treated as success', {
          steamId: maskSteamId(normalizedSteamId),
          appId: normalizedAppId,
          targetIsFollowed,
        });
      } else {
        if (isPermanentFollowFailure(error)) {
          await clearLocalFollowMutationIfCurrent({
            steamId: normalizedSteamId,
            appId: normalizedAppId,
            targetIsFollowed,
            updatedAt: mutationUpdatedAt,
          });
        }

        throw error;
      }
    }

    await clearLocalFollowMutationIfCurrent({
      steamId: normalizedSteamId,
      appId: normalizedAppId,
      targetIsFollowed,
      updatedAt: mutationUpdatedAt,
    });
  },
);

export const queueFollowSync = async ({
  steamId,
  appId,
  targetIsFollowed,
  gameRef = {},
  updatedAt = null,
  notifications = true,
}) => {
  const normalizedSteamId = normalizeFollowSteamId(steamId);
  const normalizedAppId = normalizeFollowAppId(appId);

  if (!normalizedSteamId || !normalizedAppId) {
    return false;
  }

  const normalizedGameRef = buildFollowGameRef({
    appId: normalizedAppId,
    ...gameRef,
  });

  await enqueueOfflineSyncTask({
    type: FOLLOW_SYNC_TASK_TYPE,
    scopeKey: normalizedSteamId,
    dedupeKey: buildFollowDedupeKey(normalizedAppId),
    payload: {
      steamId: normalizedSteamId,
      appId: normalizedAppId,
      targetIsFollowed: Boolean(targetIsFollowed),
      gameRef: normalizedGameRef,
      mutationUpdatedAt: updatedAt,
      notifications: notifications !== false,
    },
  });

  debugLog('[FOLLOW_SYNC] follow mutation queued', {
    steamId: maskSteamId(normalizedSteamId),
    appId: normalizedAppId,
    targetIsFollowed: Boolean(targetIsFollowed),
  });

  return true;
};

export const hasQueuedFollowSync = async steamId =>
  hasQueuedOfflineSyncTask({
    scopeKey: normalizeFollowSteamId(steamId),
    type: FOLLOW_SYNC_TASK_TYPE,
  });

export const clearQueuedFollowSync = async steamId => {
  await clearOfflineSyncTasks({
    scopeKey: normalizeFollowSteamId(steamId),
    types: [FOLLOW_SYNC_TASK_TYPE],
  });
};

export const syncQueuedFollow = ({steamId, reason = 'follow-sync', ...options} = {}) =>
  syncOfflineQueue({
    scopeKey: normalizeFollowSteamId(steamId),
    reason,
    ...options,
  });

export const reconcilePendingFollowMutations = async ({steamId} = {}) => {
  const normalizedSteamId = normalizeFollowSteamId(steamId);
  if (!normalizedSteamId) {
    return 0;
  }

  let pendingMutations;
  let queueSnapshot;
  try {
    [pendingMutations, queueSnapshot] = await Promise.all([
      readPendingFollowMutations(normalizedSteamId),
      getOfflineSyncQueueSnapshot(),
    ]);
  } catch (error) {
    debugError('[FOLLOW_SYNC] Reconciliation read failed:', error);
    return 0;
  }

  const pendingList = Object.values(pendingMutations);
  if (pendingList.length === 0) {
    return 0;
  }

  const queuedDedupeKeys = new Set(
    queueSnapshot
      .filter(
        task =>
          task.type === FOLLOW_SYNC_TASK_TYPE &&
          task.scopeKey === normalizedSteamId,
      )
      .map(task => task.dedupeKey),
  );

  let requeuedCount = 0;
  for (const mutation of pendingList) {
    const dedupeKey = buildFollowDedupeKey(mutation.appId);
    if (queuedDedupeKeys.has(dedupeKey)) {
      continue;
    }

    const enqueued = await queueFollowSync({
      steamId: normalizedSteamId,
      appId: mutation.appId,
      targetIsFollowed: mutation.targetIsFollowed,
      gameRef: mutation.gameRef,
      updatedAt: mutation.updatedAt,
      notifications: mutation.notifications,
    });

    if (enqueued) {
      requeuedCount += 1;
      debugLog('[FOLLOW_SYNC] Orphan pending mutation re-enqueued', {
        steamId: maskSteamId(normalizedSteamId),
        appId: mutation.appId,
        targetIsFollowed: mutation.targetIsFollowed,
      });
    }
  }

  return requeuedCount;
};

export {FOLLOW_SYNC_TASK_TYPE};
