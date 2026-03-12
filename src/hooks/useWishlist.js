import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { steamService } from '../services/api';
import { debugError, debugLog, maskSteamId, showAlert } from './hooksLogger';
import {
    buildStorageKey,
    getJSONItem,
    setJSONItem,
} from './useAsyncStorage';

const STATUS_DEBOUNCE_DELAY = 250;

/**
 * Hook personnalisé pour gérer la wishlist Steam
 * Centralise la logique de chargement, le cache et le versioning.
 */
export const useWishlist = steamId => {
  const { t } = useTranslation();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [wishlistVersion, setWishlistVersion] = useState(null);

  const { setWishlistVersion: setContextWishlistVersion } = useAppContext();

  const isMountedRef = useRef(true);
  const wishlistFetchInFlightRef = useRef(false);
  const wishlistLastRequestIdRef = useRef(null);
  const wishlistFetchAbortControllerRef = useRef(null);
  const statusDebounceTimeoutRef = useRef(null);
  const wishlistHydratedFromCacheRef = useRef(false);

  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
        statusDebounceTimeoutRef.current = null;
      }
      if (wishlistFetchAbortControllerRef.current) {
        try {
          wishlistFetchAbortControllerRef.current.abort();
        } catch (abortError) {
          debugError('[WISHLIST] Erreur lors de l’annulation du fetch:', abortError);
        }
        wishlistFetchAbortControllerRef.current = null;
      }
    };
  }, []);

  const persistWishlistCache = useCallback(
    async (items, targetSteamId = steamId) => {
      const cacheKey = buildStorageKey('wishlist', targetSteamId);
      if (!cacheKey) {
        return;
      }
      await setJSONItem(cacheKey, items);
    },
    [steamId],
  );

  const persistWishlistVersion = useCallback(
    async (newVersion, targetSteamId = steamId, meta = {}) => {
      if (!newVersion) {
        return;
      }

      const versionKey = buildStorageKey('wishlistVersion', targetSteamId);
      if (!versionKey) {
        return;
      }

      const serverTs = Date.parse(newVersion);
      const localTs = wishlistVersion ? Date.parse(wishlistVersion) : null;

      const shouldUpdate =
        !wishlistVersion ||
        Number.isNaN(serverTs) ||
        Number.isNaN(localTs) ||
        serverTs >= localTs;

      if (!shouldUpdate) {
        debugLog('[WISHLIST-VERSION] Version locale conservée', {
          raison: meta.origin || 'persistWishlistVersion',
          locale: wishlistVersion,
          serveur: newVersion,
        });
        return;
      }

      safeSetState(setWishlistVersion, newVersion);
      if (typeof setContextWishlistVersion === 'function') {
        setContextWishlistVersion(newVersion);
      }
      await AsyncStorage.setItem(versionKey, newVersion);
    },
    [safeSetState, setContextWishlistVersion, steamId, wishlistVersion],
  );

  useEffect(() => {
    if (!steamId) {
      safeSetState(setWishlist, []);
      safeSetState(setWishlistVersion, null);
      if (typeof setContextWishlistVersion === 'function') {
        setContextWishlistVersion(null);
      }
      wishlistHydratedFromCacheRef.current = false;
      return;
    }

    let isActive = true;
    wishlistHydratedFromCacheRef.current = false;

    const hydrateFromCache = async currentSteamId => {
      try {
        const cacheKey = buildStorageKey('wishlist', currentSteamId);
        const versionKey = buildStorageKey('wishlistVersion', currentSteamId);

        const [cachedWishlist, cachedVersion] = await Promise.all([
          getJSONItem(cacheKey, null),
          AsyncStorage.getItem(versionKey),
        ]);

        if (!isActive || !isMountedRef.current) {
          return;
        }

        if (Array.isArray(cachedWishlist)) {
          wishlistHydratedFromCacheRef.current = true;
          safeSetState(setWishlist, cachedWishlist);
          debugLog('[WISHLIST] cache_hit', {count: cachedWishlist.length});
        } else {
          debugLog('[WISHLIST] cache_miss');
        }

        if (cachedVersion) {
          safeSetState(setWishlistVersion, cachedVersion);
          if (typeof setContextWishlistVersion === 'function') {
            setContextWishlistVersion(cachedVersion);
          }
        }
      } catch (error) {
        debugError('[WISHLIST] Erreur lors du chargement du cache:', error);
      }
    };

    hydrateFromCache(steamId);

    return () => {
      isActive = false;
    };
  }, [safeSetState, setContextWishlistVersion, steamId]);

  useEffect(() => {
    if (wishlistFetchAbortControllerRef.current) {
      wishlistFetchAbortControllerRef.current.abort();
      wishlistFetchAbortControllerRef.current = null;
      wishlistFetchInFlightRef.current = false;
    }
    wishlistLastRequestIdRef.current = null;
    wishlistHydratedFromCacheRef.current = false;
  }, [steamId]);

  const fetchWishlist = useCallback(
    async (silent = false, options = {}) => {
      if (!steamId) {
        debugLog('[WISHLIST] Pas de steamId fourni, skip fetch');
        return [];
      }

      if (wishlistFetchInFlightRef.current) {
        debugLog('[WISHLIST] refresh_skipped_inflight');
        return [];
      }

      const {expectedWishlistVersion, origin = 'fetchWishlist'} = options;

      const requestId = `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

      wishlistFetchInFlightRef.current = true;
      wishlistLastRequestIdRef.current = requestId;

      const abortController = new AbortController();
      wishlistFetchAbortControllerRef.current = abortController;
      const requestConfig = {signal: abortController.signal};

      const shouldProcess = () =>
        isMountedRef.current && wishlistLastRequestIdRef.current === requestId;

      try {
        if (!silent) {
          safeSetState(setLoading, true);
        }
        safeSetState(setError, null);

        debugLog('[WISHLIST] Chargement...', {
          steamId: maskSteamId(steamId),
          origin,
          silent,
        });
        const response = await steamService.getUserWishlist(
          steamId,
          requestConfig,
        );

        let wishlistItems = [];
        if (Array.isArray(response.data)) {
          wishlistItems = response.data;
        } else if (response.data?.items) {
          wishlistItems = response.data.items;
        } else if (response.data?.response?.items) {
          wishlistItems = response.data.response.items;
        }

        if (!shouldProcess()) {
          return wishlistItems;
        }

        debugLog('[WISHLIST] Wishlist chargée', {
          count: wishlistItems.length,
          origin,
        });
        safeSetState(setWishlist, wishlistItems);
        wishlistHydratedFromCacheRef.current = true;

        let serverWishlistVersion = expectedWishlistVersion || null;
        if (!serverWishlistVersion) {
          try {
            debugLog('[WISHLIST-VERSION] status_check_start', {origin});
            const statusResponse = await steamService.fetchStatus(
              steamId,
              requestConfig,
            );
            serverWishlistVersion =
              statusResponse?.data?.wishlistVersion || null;
            debugLog('[WISHLIST-VERSION] status_check_ok', {
              origin,
              serverWishlistVersion,
            });
          } catch (statusError) {
            if (
              statusError?.name === 'CanceledError' ||
              statusError?.name === 'AbortError' ||
              statusError?.code === 'ERR_CANCELED'
            ) {
              debugLog('[WISHLIST-VERSION] status_check_cancelled', {origin});
            } else {
              debugError('[WISHLIST-VERSION] status_check_fail', statusError);
            }
          }
        }

        if (serverWishlistVersion) {
          await persistWishlistVersion(serverWishlistVersion, steamId, {
            origin,
          });
        }

        await persistWishlistCache(wishlistItems, steamId);

        return wishlistItems;
      } catch (err) {
        if (
          err?.name === 'CanceledError' ||
          err?.name === 'AbortError' ||
          err?.code === 'ERR_CANCELED'
        ) {
          debugLog('[WISHLIST] Requête annulée', {origin});
          return [];
        }

        debugError('❌ Erreur lors du chargement de la wishlist:', err);

        if (!shouldProcess()) {
          return [];
        }

        if (err.response?.status === 404) {
          safeSetState(setError, t('games.wishlistNotFoundOrPrivate'));
        } else if (err.response?.status === 403) {
          safeSetState(setError, t('games.wishlistAccessDenied'));
        } else {
          safeSetState(setError, t('games.wishlistLoadError'));
        }

        showAlert(
          t('common.error'),
          t('games.wishlistProfilePublicHint'),
        );

        safeSetState(setWishlist, []);
        await persistWishlistCache([], steamId);

        return [];
      } finally {
        if (shouldProcess()) {
          safeSetState(setLoading, false);
          safeSetState(setRefreshing, false);
          wishlistLastRequestIdRef.current = null;
        }
        wishlistFetchInFlightRef.current = false;
        if (wishlistFetchAbortControllerRef.current === abortController) {
          wishlistFetchAbortControllerRef.current = null;
        }
      }
    },
    [
      persistWishlistCache,
      persistWishlistVersion,
      safeSetState,
      steamId,
      t,
    ],
  );

  const handleRefresh = useCallback(async () => {
    safeSetState(setRefreshing, true);
    await fetchWishlist(false, {origin: 'handleRefresh'});
  }, [fetchWishlist, safeSetState]);

  const sortedWishlist = useCallback(() => {
    if (!Array.isArray(wishlist)) {
      return [];
    }

    return [...wishlist].sort((a, b) => {
      const dateA = a.date_added || 0;
      const dateB = b.date_added || 0;
      return dateB - dateA;
    });
  }, [wishlist]);

  const filterWishlist = useCallback(
    query => {
      if (!query || query.trim() === '') {
        return sortedWishlist();
      }

      const lowercaseQuery = query.toLowerCase().trim();
      return sortedWishlist().filter(item =>
        item.name?.toLowerCase().includes(lowercaseQuery),
      );
    },
    [sortedWishlist],
  );

  const wishlistStats = useCallback(() => {
    if (!Array.isArray(wishlist)) {
      return {
        total: 0,
        recentlyAdded: 0,
      };
    }

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const recentlyAdded = wishlist.filter(
      item => (item.date_added || 0) > thirtyDaysAgo,
    ).length;

    return {
      total: wishlist.length,
      recentlyAdded,
    };
  }, [wishlist]);

  const updateWishlistFollowState = useCallback(
    (appId, nextIsFollowed) => {
      if (!appId) {
        return;
      }

      safeSetState(setWishlist, current => {
        if (!Array.isArray(current)) {
          return current;
        }

        const next = current.map(item =>
          item?.appid?.toString() === appId?.toString()
            ? {...item, isFollowed: nextIsFollowed}
            : item,
        );

        wishlistHydratedFromCacheRef.current = true;
        persistWishlistCache(next, steamId).catch(err => {
          debugError('[WISHLIST] Erreur lors de la mise à jour du cache:', err);
        });

        return next;
      });
    },
    [persistWishlistCache, safeSetState, steamId],
  );

  const removeWishlistEntry = useCallback(
    appId => {
      if (!appId) {
        return;
      }

      safeSetState(setWishlist, current => {
        if (!Array.isArray(current)) {
          return current;
        }

        const next = current.map(item =>
          item?.appid?.toString() === appId.toString()
            ? {...item, isFollowed: false}
            : item,
        );

        wishlistHydratedFromCacheRef.current = true;
        persistWishlistCache(next, steamId).catch(err => {
          debugError('[WISHLIST] Erreur lors de la mise à jour du cache:', err);
        });

        return next;
      });
    },
    [persistWishlistCache, safeSetState, steamId],
  );

  const maybeRefreshWishlist = useCallback(
    async (origin = 'maybeRefreshWishlist') => {
      if (!steamId) {
        return;
      }

      if (loading || refreshing || wishlistFetchInFlightRef.current) {
        debugLog('[WISHLIST-VERSION] refresh_skipped_inflight', {
          origin,
          loading,
          refreshing,
        });
        return;
      }

      const runStatusCheck = async () => {
        try {
          debugLog('[WISHLIST-VERSION] status_check_start', {origin});
          const statusResponse = await steamService.fetchStatus(steamId);
          const serverWishlistVersion =
            statusResponse?.data?.wishlistVersion || null;

          if (!serverWishlistVersion) {
            debugLog('[WISHLIST-VERSION] status_missing', {origin});
            return;
          }

          if (serverWishlistVersion !== wishlistVersion) {
            debugLog('[WISHLIST-VERSION] status_mismatch', {
              origin,
              serveur: serverWishlistVersion,
              locale: wishlistVersion,
            });
            await fetchWishlist(false, {
              expectedWishlistVersion: serverWishlistVersion,
              origin,
            });
          } else {
            debugLog('[WISHLIST-VERSION] status_match', {
              origin,
              version: serverWishlistVersion,
            });
          }
        } catch (error) {
          debugError('[WISHLIST-VERSION] status_check_fail', error);
        } finally {
          statusDebounceTimeoutRef.current = null;
        }
      };

      if (statusDebounceTimeoutRef.current) {
        clearTimeout(statusDebounceTimeoutRef.current);
      }

      statusDebounceTimeoutRef.current = setTimeout(
        runStatusCheck,
        STATUS_DEBOUNCE_DELAY,
      );
    },
    [fetchWishlist, loading, refreshing, steamId, wishlistVersion],
  );

  return {
    wishlist,
    loading,
    refreshing,
    error,
    fetchWishlist,
    handleRefresh,
    sortedWishlist,
    filterWishlist,
    wishlistStats,
    updateWishlistFollowState,
    removeWishlistEntry,
    maybeRefreshWishlist,
  };
};
