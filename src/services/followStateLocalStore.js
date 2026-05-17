import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getGamesCacheKey,
  getWishlistCacheKey,
} from '../context/app/libraryHelpers';
import {debugError} from '../hooks/hooksLogger';
import {
  buildStorageKey,
  getJSONItem,
  setJSONItem,
} from '../hooks/useAsyncStorage';
import {getGameIconUrl} from '../utils';

const PENDING_FOLLOW_MUTATIONS_PREFIX = 'pendingFollowMutations';

let pendingMutationLock = Promise.resolve();

const withPendingMutationLock = operation => {
  const run = async () => operation();
  const next = pendingMutationLock.then(run, run);
  pendingMutationLock = next.catch(() => {});
  return next;
};

export const normalizeFollowSteamId = steamId =>
  typeof steamId === 'string'
    ? steamId.trim()
    : String(steamId || '').trim();

export const normalizeFollowAppId = appId =>
  appId === null || appId === undefined ? '' : String(appId).trim();

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const getPendingFollowMutationsKey = steamId =>
  buildStorageKey(
    PENDING_FOLLOW_MUTATIONS_PREFIX,
    normalizeFollowSteamId(steamId),
  );

const resolveRecordAppId = record =>
  normalizeFollowAppId(record?.appid ?? record?.appId);

const buildHeaderImageFallback = appId =>
  appId
    ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
    : '';

export const buildFollowGameRef = (source = {}) => {
  const appId = normalizeFollowAppId(source?.appId ?? source?.appid);
  const iconUrl =
    source?.imageUrl ||
    source?.logoUrl ||
    source?.header_image ||
    source?.headerImage ||
    source?.capsule ||
    getGameIconUrl(appId, source?.img_icon_url) ||
    '';
  const headerImage =
    source?.header_image ||
    source?.headerImage ||
    source?.imageUrl ||
    source?.capsule ||
    buildHeaderImageFallback(appId);

  return {
    appId,
    name: String(source?.name || (appId ? `Game ${appId}` : '')).trim(),
    imageUrl: iconUrl,
    header_image: headerImage,
    followedAt: source?.followedAt || new Date().toISOString(),
  };
};

const normalizeMutation = (steamId, mutation) => {
  if (!isObject(mutation)) {
    return null;
  }

  const normalizedSteamId = normalizeFollowSteamId(
    mutation.steamId || steamId,
  );
  const appId = normalizeFollowAppId(mutation.appId);

  if (
    !normalizedSteamId ||
    !appId ||
    typeof mutation.targetIsFollowed !== 'boolean'
  ) {
    return null;
  }

  const updatedAt =
    typeof mutation.updatedAt === 'number' && mutation.updatedAt > 0
      ? mutation.updatedAt
      : Date.now();

  return {
    steamId: normalizedSteamId,
    appId,
    targetIsFollowed: mutation.targetIsFollowed,
    gameRef: buildFollowGameRef({
      appId,
      ...(isObject(mutation.gameRef) ? mutation.gameRef : {}),
    }),
    updatedAt,
  };
};

const normalizeMutationMap = (steamId, value) => {
  if (!isObject(value)) {
    return {};
  }

  return Object.values(value).reduce((acc, mutation) => {
    const normalized = normalizeMutation(steamId, mutation);
    if (normalized) {
      acc[normalized.appId] = normalized;
    }
    return acc;
  }, {});
};

export const readPendingFollowMutations = async steamId => {
  const key = getPendingFollowMutationsKey(steamId);
  if (!key) {
    return {};
  }

  const stored = await getJSONItem(key, {});
  return normalizeMutationMap(steamId, stored);
};

const writePendingFollowMutations = async (steamId, mutations) => {
  const key = getPendingFollowMutationsKey(steamId);
  if (!key) {
    return;
  }

  const normalized = normalizeMutationMap(steamId, mutations);
  if (Object.keys(normalized).length === 0) {
    await AsyncStorage.removeItem(key);
    return;
  }

  await setJSONItem(key, normalized);
};

export const queueLocalFollowMutation = async ({
  steamId,
  appId,
  targetIsFollowed,
  gameRef = {},
  updatedAt = null,
}) => {
  const normalizedSteamId = normalizeFollowSteamId(steamId);
  const normalizedAppId = normalizeFollowAppId(appId);

  if (!normalizedSteamId || !normalizedAppId) {
    return null;
  }

  return withPendingMutationLock(async () => {
    const current = await readPendingFollowMutations(normalizedSteamId);
    const mutation = normalizeMutation(normalizedSteamId, {
      steamId: normalizedSteamId,
      appId: normalizedAppId,
      targetIsFollowed: Boolean(targetIsFollowed),
      gameRef: buildFollowGameRef({
        appId: normalizedAppId,
        ...gameRef,
      }),
      updatedAt:
        typeof updatedAt === 'number' && updatedAt > 0
          ? updatedAt
          : Date.now(),
    });

    if (!mutation) {
      return null;
    }

    current[normalizedAppId] = mutation;
    await writePendingFollowMutations(normalizedSteamId, current);
    return mutation;
  });
};

export const clearLocalFollowMutation = async ({steamId, appId}) => {
  const normalizedSteamId = normalizeFollowSteamId(steamId);
  const normalizedAppId = normalizeFollowAppId(appId);

  if (!normalizedSteamId || !normalizedAppId) {
    return;
  }

  await withPendingMutationLock(async () => {
    const current = await readPendingFollowMutations(normalizedSteamId);
    if (!current[normalizedAppId]) {
      return;
    }

    delete current[normalizedAppId];
    await writePendingFollowMutations(normalizedSteamId, current);
  });
};

export const clearLocalFollowMutationIfCurrent = async ({
  steamId,
  appId,
  targetIsFollowed,
  updatedAt,
}) => {
  const normalizedSteamId = normalizeFollowSteamId(steamId);
  const normalizedAppId = normalizeFollowAppId(appId);

  if (!normalizedSteamId || !normalizedAppId) {
    return false;
  }

  return withPendingMutationLock(async () => {
    const current = await readPendingFollowMutations(normalizedSteamId);
    const pending = current[normalizedAppId];

    if (!pending) {
      return true;
    }

    if (
      pending.targetIsFollowed !== Boolean(targetIsFollowed) ||
      (typeof updatedAt === 'number' && pending.updatedAt !== updatedAt)
    ) {
      return false;
    }

    delete current[normalizedAppId];
    await writePendingFollowMutations(normalizedSteamId, current);
    return true;
  });
};

export const clearPendingFollowMutations = async steamId => {
  const key = getPendingFollowMutationsKey(steamId);
  if (key) {
    await AsyncStorage.removeItem(key);
  }
};

export const hasPendingFollowMutation = async ({steamId, appId}) => {
  const normalizedAppId = normalizeFollowAppId(appId);
  if (!normalizedAppId) {
    return false;
  }

  const pending = await readPendingFollowMutations(steamId);
  return Boolean(pending[normalizedAppId]);
};

const getPendingMutationList = pendingMutations =>
  Object.values(normalizeMutationMap('', pendingMutations));

export const applyPendingFollowOverlayToUser = (
  user,
  pendingMutations = {},
) => {
  if (!user) {
    return user;
  }

  const followed = new Set(
    Array.isArray(user.followedGames)
      ? user.followedGames.map(normalizeFollowAppId).filter(Boolean)
      : [],
  );

  getPendingMutationList(pendingMutations).forEach(mutation => {
    if (mutation.targetIsFollowed) {
      followed.add(mutation.appId);
      return;
    }

    followed.delete(mutation.appId);
  });

  return {
    ...user,
    followedGames: Array.from(followed),
  };
};

export const applyPendingFollowOverlayToGames = (
  games,
  pendingMutations = {},
) => {
  if (!Array.isArray(games) || games.length === 0) {
    return Array.isArray(games) ? games : [];
  }

  const pending = normalizeMutationMap('', pendingMutations);
  if (Object.keys(pending).length === 0) {
    return games;
  }

  return games.map(game => {
    const appId = resolveRecordAppId(game);
    const mutation = pending[appId];
    if (!mutation) {
      return game;
    }

    return {
      ...game,
      isFollowed: mutation.targetIsFollowed,
    };
  });
};

export const applyPendingFollowOverlayToWishlist = (
  wishlist,
  pendingMutations = {},
) => applyPendingFollowOverlayToGames(wishlist, pendingMutations);

const toFollowedGameItem = (appId, existingItem, gameRef = {}) => {
  const normalizedRef = buildFollowGameRef({
    appId,
    ...(isObject(gameRef) ? gameRef : {}),
  });

  return {
    ...(isObject(existingItem) ? existingItem : {}),
    appId,
    name:
      normalizedRef.name ||
      existingItem?.name ||
      (appId ? `Game ${appId}` : ''),
    header_image:
      normalizedRef.header_image || existingItem?.header_image || '',
    imageUrl: normalizedRef.imageUrl || existingItem?.imageUrl || '',
    followedAt:
      normalizedRef.followedAt ||
      existingItem?.followedAt ||
      new Date().toISOString(),
  };
};

export const applyPendingFollowOverlayToFollowedGames = (
  followedGames,
  pendingMutations = {},
) => {
  const source = Array.isArray(followedGames) ? followedGames : [];
  const pending = normalizeMutationMap('', pendingMutations);

  if (Object.keys(pending).length === 0) {
    return source;
  }

  const byAppId = new Map(
    source
      .map(game => [resolveRecordAppId(game), game])
      .filter(([appId]) => Boolean(appId)),
  );

  Object.values(pending).forEach(mutation => {
    if (!mutation.targetIsFollowed) {
      byAppId.delete(mutation.appId);
      return;
    }

    byAppId.set(
      mutation.appId,
      toFollowedGameItem(
        mutation.appId,
        byAppId.get(mutation.appId),
        mutation.gameRef,
      ),
    );
  });

  return Array.from(byAppId.values());
};

export const applyPendingFollowOverlayToNewsFeed = (
  newsItems,
  pendingMutations = {},
) => {
  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    return Array.isArray(newsItems) ? newsItems : [];
  }

  const pendingUnfollowIds = new Set(
    getPendingMutationList(pendingMutations)
      .filter(mutation => !mutation.targetIsFollowed)
      .map(mutation => mutation.appId),
  );

  if (pendingUnfollowIds.size === 0) {
    return newsItems;
  }

  return newsItems.filter(
    item => !pendingUnfollowIds.has(resolveRecordAppId(item)),
  );
};

const mutateJsonCache = async (key, fallbackValue, updater) => {
  if (!key || typeof updater !== 'function') {
    return null;
  }

  const currentValue = await getJSONItem(key, fallbackValue);
  const nextValue = updater(currentValue);

  if (nextValue === currentValue) {
    return currentValue;
  }

  await setJSONItem(key, nextValue);
  return nextValue;
};

const applyFollowMutationToUser = (user, mutation) =>
  applyPendingFollowOverlayToUser(user, {[mutation.appId]: mutation});

const applyFollowMutationToGames = (games, mutation) =>
  applyPendingFollowOverlayToGames(games, {[mutation.appId]: mutation});

const applyFollowMutationToFollowedGames = (followedGames, mutation) =>
  applyPendingFollowOverlayToFollowedGames(followedGames, {
    [mutation.appId]: mutation,
  });

const applyFollowMutationToNewsFeed = (newsItems, mutation) =>
  applyPendingFollowOverlayToNewsFeed(newsItems, {[mutation.appId]: mutation});

const reconcileNewsFeedCaches = async (steamId, mutation) => {
  if (mutation.targetIsFollowed) {
    return;
  }

  const allKeys = await AsyncStorage.getAllKeys();
  const newsFeedKeyPrefix = `app:newsFeed:${normalizeFollowSteamId(steamId)}:`;
  const newsFeedKeys = allKeys.filter(key => key.startsWith(newsFeedKeyPrefix));

  await Promise.all(
    newsFeedKeys.map(key =>
      mutateJsonCache(key, null, currentFeed => {
        if (!Array.isArray(currentFeed)) {
          return currentFeed;
        }

        return applyFollowMutationToNewsFeed(currentFeed, mutation);
      }),
    ),
  );
};

export const applyLocalFollowState = async ({
  steamId,
  appId,
  targetIsFollowed,
  gameRef = {},
  setUser,
  setGames,
  updatedAt = null,
}) => {
  const mutation = await queueLocalFollowMutation({
    steamId,
    appId,
    targetIsFollowed,
    gameRef,
    updatedAt,
  });

  if (!mutation) {
    return null;
  }

  try {
    if (typeof setUser === 'function') {
      setUser(currentUser =>
        currentUser ? applyFollowMutationToUser(currentUser, mutation) : currentUser,
      );
    }

    if (typeof setGames === 'function') {
      setGames(currentGames =>
        Array.isArray(currentGames)
          ? applyFollowMutationToGames(currentGames, mutation)
          : currentGames,
      );
    }

    await Promise.all([
      mutateJsonCache(getGamesCacheKey(steamId), null, currentGames => {
        if (!Array.isArray(currentGames)) {
          return currentGames;
        }

        return applyFollowMutationToGames(currentGames, mutation);
      }),
      mutateJsonCache(getWishlistCacheKey(steamId), null, currentWishlist => {
        if (!Array.isArray(currentWishlist)) {
          return currentWishlist;
        }

        return applyPendingFollowOverlayToWishlist(currentWishlist, {
          [mutation.appId]: mutation,
        });
      }),
      mutateJsonCache(
        buildStorageKey('followedGames', steamId),
        [],
        currentFollowedGames =>
          applyFollowMutationToFollowedGames(currentFollowedGames, mutation),
      ),
      reconcileNewsFeedCaches(steamId, mutation),
    ]);
  } catch (error) {
    debugError('[FOLLOW_LOCAL] Failed to apply local follow state:', error);
    throw error;
  }

  return mutation;
};
