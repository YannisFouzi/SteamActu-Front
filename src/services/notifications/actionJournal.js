import {getJSONItem, setJSONItem} from '../../hooks/useAsyncStorage';

const NOTIFICATION_ACTION_QUEUE_KEY = 'app:notificationActionQueue';

const normalizeAppId = appId => (appId ? String(appId) : '');

const buildQueueSignature = action =>
  [
    action?.kind || '',
    action?.steamId || '',
    normalizeAppId(action?.appId),
  ].join(':');

const readNotificationActionQueue = async () => {
  const queue = await getJSONItem(NOTIFICATION_ACTION_QUEUE_KEY, []);
  return Array.isArray(queue) ? queue : [];
};

const writeNotificationActionQueue = async queue => {
  await setJSONItem(
    NOTIFICATION_ACTION_QUEUE_KEY,
    Array.isArray(queue) ? queue : [],
  );
};

export async function queueNotificationAction(action) {
  if (!action?.kind || !action?.steamId || !action?.appId) {
    return;
  }

  const normalizedAction = {
    ...action,
    appId: normalizeAppId(action.appId),
    createdAt: action.createdAt || new Date().toISOString(),
  };

  const currentQueue = await readNotificationActionQueue();
  const signature = buildQueueSignature(normalizedAction);
  const nextQueue = currentQueue.filter(
    queuedAction => buildQueueSignature(queuedAction) !== signature,
  );

  nextQueue.push(normalizedAction);
  await writeNotificationActionQueue(nextQueue);
}

export async function consumeNotificationActionsForSteamId(steamId) {
  if (!steamId) {
    return [];
  }

  const currentQueue = await readNotificationActionQueue();
  const matchingActions = [];
  const remainingActions = [];

  currentQueue.forEach(action => {
    if (action?.steamId === steamId) {
      matchingActions.push(action);
      return;
    }

    remainingActions.push(action);
  });

  await writeNotificationActionQueue(remainingActions);
  return matchingActions;
}
