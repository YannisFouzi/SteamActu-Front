import AsyncStorage from '@react-native-async-storage/async-storage';
import {debugError, debugLog} from '../hooks/hooksLogger';

const OFFLINE_SYNC_QUEUE_STORAGE_KEY = 'offlineSyncQueue:v1';
const BASE_RETRY_DELAY_MS = 30000;
const MAX_RETRY_DELAY_MS = 15 * 60 * 1000;
const RETRY_JITTER_RATIO = 0.3;
const MAX_QUEUE_SIZE = 100;

const handlers = new Map();

let queueLock = Promise.resolve();
let drainPromise = null;
let rerunRequested = false;
let rerunOptions = null;
let nextRunTimeout = null;
let queueOnline = true;

const normalizeKey = value =>
  typeof value === 'string' ? value.trim() : String(value || '').trim();

const createTaskId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const now = () => Date.now();

const withQueueLock = operation => {
  const run = async () => operation();
  const next = queueLock.then(run, run);
  queueLock = next.catch(() => {});
  return next;
};

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeTask = task => {
  if (!isObject(task)) {
    return null;
  }

  const type = normalizeKey(task.type);
  const scopeKey = normalizeKey(task.scopeKey);
  const dedupeKey = normalizeKey(task.dedupeKey);

  if (!type || !scopeKey || !dedupeKey) {
    return null;
  }

  return {
    id: normalizeKey(task.id) || createTaskId(),
    type,
    scopeKey,
    dedupeKey,
    payload: isObject(task.payload) ? task.payload : {},
    attempts:
      typeof task.attempts === 'number' && task.attempts > 0
        ? task.attempts
        : 0,
    createdAt:
      typeof task.createdAt === 'number' ? task.createdAt : now(),
    updatedAt:
      typeof task.updatedAt === 'number' ? task.updatedAt : now(),
    nextRunAt:
      typeof task.nextRunAt === 'number' ? task.nextRunAt : now(),
    lastError: typeof task.lastError === 'string' ? task.lastError : null,
  };
};

const readQueue = async () => {
  const raw = await AsyncStorage.getItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeTask)
      .filter(Boolean)
      .slice(-MAX_QUEUE_SIZE);
  } catch (error) {
    debugError('[OFFLINE_SYNC] Failed to parse persisted queue:', error);
    return [];
  }
};

const writeQueue = async queue => {
  const normalizedQueue = Array.isArray(queue)
    ? queue.map(normalizeTask).filter(Boolean).slice(-MAX_QUEUE_SIZE)
    : [];

  if (normalizedQueue.length === 0) {
    await AsyncStorage.removeItem(OFFLINE_SYNC_QUEUE_STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    OFFLINE_SYNC_QUEUE_STORAGE_KEY,
    JSON.stringify(normalizedQueue),
  );
};

const getErrorSummary = error => {
  const status = error?.status ?? error?.response?.status ?? null;
  const message =
    error?.message ||
    error?.data?.message ||
    error?.response?.data?.message ||
    'Offline sync task failed';

  return status ? `${status}: ${message}` : message;
};

const isPermanentFailure = error => {
  if (error?.offlineSyncPermanent === true) {
    return true;
  }

  const status = error?.status ?? error?.response?.status ?? null;
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
};

const computeRetryDelay = attempts => {
  const exponent = Math.max(0, attempts - 1);
  const baseDelay = Math.min(
    BASE_RETRY_DELAY_MS * 2 ** exponent,
    MAX_RETRY_DELAY_MS,
  );
  const jitter = baseDelay * RETRY_JITTER_RATIO * Math.random();
  return Math.round(baseDelay + jitter);
};

const selectReadyTask = (queue, {scopeKey, force}) => {
  const currentTime = now();
  const normalizedScopeKey = normalizeKey(scopeKey);

  return queue
    .filter(task => {
      if (!handlers.has(task.type)) {
        return false;
      }
      if (normalizedScopeKey && task.scopeKey !== normalizedScopeKey) {
        return false;
      }
      return force || task.nextRunAt <= currentTime;
    })
    .sort((left, right) => {
      if (left.nextRunAt !== right.nextRunAt) {
        return left.nextRunAt - right.nextRunAt;
      }
      return left.createdAt - right.createdAt;
    })[0];
};

const scheduleNextDueSync = async ({scopeKey} = {}) => {
  if (nextRunTimeout !== null) {
    clearTimeout(nextRunTimeout);
    nextRunTimeout = null;
  }

  const nextTask = await withQueueLock(async () => {
    const queue = await readQueue();
    const normalizedScopeKey = normalizeKey(scopeKey);
    return queue
      .filter(task => {
        if (!handlers.has(task.type)) {
          return false;
        }
        return !normalizedScopeKey || task.scopeKey === normalizedScopeKey;
      })
      .sort((left, right) => left.nextRunAt - right.nextRunAt)[0];
  });

  if (!nextTask) {
    return;
  }

  const delay = Math.max(0, nextTask.nextRunAt - now());
  nextRunTimeout = setTimeout(() => {
    nextRunTimeout = null;
    syncOfflineQueue({
      scopeKey,
      reason: 'retry-timer',
    }).catch(error => {
      debugError('[OFFLINE_SYNC] Scheduled sync failed:', error);
    });
  }, delay);
};

const removeTaskIfCurrent = async task => {
  await withQueueLock(async () => {
    const queue = await readQueue();
    const nextQueue = queue.filter(
      queuedTask =>
        !(
          queuedTask.id === task.id &&
          queuedTask.type === task.type &&
          queuedTask.scopeKey === task.scopeKey &&
          queuedTask.dedupeKey === task.dedupeKey
        ),
    );
    await writeQueue(nextQueue);
  });
};

const markTaskFailedIfCurrent = async (task, error) => {
  await withQueueLock(async () => {
    const queue = await readQueue();
    const taskIndex = queue.findIndex(
      queuedTask =>
        queuedTask.id === task.id &&
        queuedTask.type === task.type &&
        queuedTask.scopeKey === task.scopeKey &&
        queuedTask.dedupeKey === task.dedupeKey,
    );

    if (taskIndex === -1) {
      return;
    }

    const failedTask = queue[taskIndex];
    const attempts = failedTask.attempts + 1;
    const retryDelay = computeRetryDelay(attempts);

    queue[taskIndex] = {
      ...failedTask,
      attempts,
      updatedAt: now(),
      nextRunAt: now() + retryDelay,
      lastError: getErrorSummary(error),
    };

    await writeQueue(queue);
  });
};

const drainQueue = async options => {
  const {scopeKey = '', force = false, isOnline, reason = 'manual'} =
    options || {};
  const effectiveOnline =
    typeof isOnline === 'boolean' ? isOnline : queueOnline;

  if (effectiveOnline === false) {
    debugLog('[OFFLINE_SYNC] Skip drain while offline', {reason});
    return false;
  }

  while (true) {
    const task = await withQueueLock(async () => {
      const queue = await readQueue();
      return selectReadyTask(queue, {scopeKey, force});
    });

    if (!task) {
      await scheduleNextDueSync({scopeKey});
      return true;
    }

    const handler = handlers.get(task.type);

    try {
      debugLog('[OFFLINE_SYNC] Running task', {
        type: task.type,
        scopeKey: task.scopeKey,
        reason,
        attempts: task.attempts,
      });
      await handler(task.payload, task);
      await removeTaskIfCurrent(task);
      debugLog('[OFFLINE_SYNC] Task synced', {
        type: task.type,
        scopeKey: task.scopeKey,
      });
    } catch (error) {
      if (isPermanentFailure(error)) {
        debugError('[OFFLINE_SYNC] Dropping permanent failure:', {
          type: task.type,
          scopeKey: task.scopeKey,
          error: getErrorSummary(error),
        });
        await removeTaskIfCurrent(task);
        continue;
      }

      debugError('[OFFLINE_SYNC] Task failed, will retry:', {
        type: task.type,
        scopeKey: task.scopeKey,
        error: getErrorSummary(error),
      });
      await markTaskFailedIfCurrent(task, error);
      await scheduleNextDueSync({scopeKey});
      return false;
    }
  }
};

export const registerOfflineSyncTaskType = (type, handler) => {
  const normalizedType = normalizeKey(type);

  if (!normalizedType || typeof handler !== 'function') {
    throw new Error('Invalid offline sync task registration');
  }

  handlers.set(normalizedType, handler);
};

export const setOfflineSyncConnectivity = isOnline => {
  queueOnline = isOnline !== false;
};

export const enqueueOfflineSyncTask = async ({
  type,
  scopeKey,
  dedupeKey,
  payload,
}) => {
  const normalizedType = normalizeKey(type);
  const normalizedScopeKey = normalizeKey(scopeKey);
  const normalizedDedupeKey = normalizeKey(dedupeKey);

  if (!normalizedType || !normalizedScopeKey || !normalizedDedupeKey) {
    return false;
  }

  const currentTime = now();
  const nextTask = {
    id: createTaskId(),
    type: normalizedType,
    scopeKey: normalizedScopeKey,
    dedupeKey: normalizedDedupeKey,
    payload: isObject(payload) ? payload : {},
    attempts: 0,
    createdAt: currentTime,
    updatedAt: currentTime,
    nextRunAt: currentTime,
    lastError: null,
  };

  await withQueueLock(async () => {
    const queue = await readQueue();
    const existingIndex = queue.findIndex(
      task =>
        task.type === normalizedType &&
        task.scopeKey === normalizedScopeKey &&
        task.dedupeKey === normalizedDedupeKey,
    );

    if (existingIndex >= 0) {
      nextTask.createdAt = queue[existingIndex].createdAt;
      queue[existingIndex] = nextTask;
    } else {
      queue.push(nextTask);
    }

    await writeQueue(queue);
  });

  debugLog('[OFFLINE_SYNC] Task queued', {
    type: normalizedType,
    scopeKey: normalizedScopeKey,
    dedupeKey: normalizedDedupeKey,
  });

  await scheduleNextDueSync({scopeKey: normalizedScopeKey});
  return true;
};

export const hasQueuedOfflineSyncTask = async ({scopeKey, type} = {}) => {
  const normalizedScopeKey = normalizeKey(scopeKey);
  const normalizedType = normalizeKey(type);

  return withQueueLock(async () => {
    const queue = await readQueue();
    return queue.some(task => {
      if (normalizedScopeKey && task.scopeKey !== normalizedScopeKey) {
        return false;
      }
      if (normalizedType && task.type !== normalizedType) {
        return false;
      }
      return true;
    });
  });
};

export const clearOfflineSyncTasks = async ({scopeKey, types} = {}) => {
  const normalizedScopeKey = normalizeKey(scopeKey);
  const normalizedTypes = Array.isArray(types)
    ? types.map(normalizeKey).filter(Boolean)
    : [];

  if (nextRunTimeout !== null) {
    clearTimeout(nextRunTimeout);
    nextRunTimeout = null;
  }

  await withQueueLock(async () => {
    const queue = await readQueue();
    const nextQueue = queue.filter(task => {
      if (normalizedScopeKey && task.scopeKey !== normalizedScopeKey) {
        return true;
      }
      if (normalizedTypes.length > 0 && !normalizedTypes.includes(task.type)) {
        return true;
      }
      return false;
    });
    await writeQueue(nextQueue);
  });
};

export const syncOfflineQueue = (options = {}) => {
  if (drainPromise) {
    rerunRequested = true;
    rerunOptions = {...(rerunOptions || {}), ...options};
    return drainPromise;
  }

  drainPromise = drainQueue(options).finally(() => {
    drainPromise = null;

    if (rerunRequested) {
      const nextOptions = rerunOptions || {};
      rerunRequested = false;
      rerunOptions = null;
      syncOfflineQueue(nextOptions).catch(error => {
        debugError('[OFFLINE_SYNC] Rerun failed:', error);
      });
    }
  });

  return drainPromise;
};

export const getOfflineSyncQueueSnapshot = async () =>
  withQueueLock(readQueue);
