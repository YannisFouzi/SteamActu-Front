import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGamesCacheKey,
  getGamesVersionKey,
} from '../../context/app/libraryHelpers';
import {buildStorageKey, getJSONItem, setJSONItem} from '../../hooks/useAsyncStorage';

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

const mutateJsonCache = async (key, fallbackValue, updater) => {
  if (!key) {
    return;
  }

  const currentValue = await getJSONItem(key, fallbackValue);
  const nextValue = updater(currentValue);

  if (nextValue === currentValue) {
    return;
  }

  await setJSONItem(key, nextValue);
};

const reconcileGamesCache = async (steamId, appId) => {
  const gamesCacheKey = getGamesCacheKey(steamId);

  await mutateJsonCache(gamesCacheKey, null, currentGames => {
    if (!Array.isArray(currentGames)) {
      return currentGames;
    }

    return currentGames.map(game => {
      const currentAppId = String(game?.appid || game?.appId || '');
      if (currentAppId !== appId) {
        return game;
      }

      return {
        ...game,
        isFollowed: false,
      };
    });
  });
};

const reconcileFollowedGamesCache = async (steamId, appId) => {
  const followedGamesCacheKey = buildStorageKey('followedGames', steamId);

  await mutateJsonCache(followedGamesCacheKey, null, currentFollowedGames => {
    if (!Array.isArray(currentFollowedGames)) {
      return currentFollowedGames;
    }

    return currentFollowedGames.filter(
      game => String(game?.appId || game?.appid || '') !== appId,
    );
  });
};

const reconcileWishlistCache = async (steamId, appId) => {
  const wishlistCacheKey = buildStorageKey('wishlist', steamId);

  await mutateJsonCache(wishlistCacheKey, null, currentWishlist => {
    if (!Array.isArray(currentWishlist)) {
      return currentWishlist;
    }

    return currentWishlist.map(item => {
      const currentAppId = String(item?.appid || item?.appId || '');
      if (currentAppId !== appId) {
        return item;
      }

      return {
        ...item,
        isFollowed: false,
      };
    });
  });
};

const reconcileNewsFeedCaches = async (steamId, appId) => {
  const allKeys = await AsyncStorage.getAllKeys();
  const newsFeedKeyPrefix = `app:newsFeed:${steamId}:`;
  const newsFeedKeys = allKeys.filter(key => key.startsWith(newsFeedKeyPrefix));

  await Promise.all(
    newsFeedKeys.map(key =>
      mutateJsonCache(key, null, currentFeed => {
        if (!Array.isArray(currentFeed)) {
          return currentFeed;
        }

        return currentFeed.filter(
          item => String(item?.appId || item?.appid || '') !== appId,
        );
      }),
    ),
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

export async function reconcileNotificationUnfollowCaches({
  steamId,
  appId,
  gamesVersion = null,
}) {
  const normalizedAppId = normalizeAppId(appId);
  if (!steamId || !normalizedAppId) {
    return;
  }

  await Promise.all([
    reconcileGamesCache(steamId, normalizedAppId),
    reconcileFollowedGamesCache(steamId, normalizedAppId),
    reconcileWishlistCache(steamId, normalizedAppId),
    reconcileNewsFeedCaches(steamId, normalizedAppId),
  ]);

  if (gamesVersion) {
    const gamesVersionKey = getGamesVersionKey(steamId);
    if (gamesVersionKey) {
      await AsyncStorage.setItem(gamesVersionKey, gamesVersion);
    }
  }
}
