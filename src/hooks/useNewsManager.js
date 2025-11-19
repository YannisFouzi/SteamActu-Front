import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { newsService, userService } from '../services/api';
import { debugError, debugLog, maskSteamId } from './hooksLogger';
import {
  buildStorageKey,
  getJSONItem,
  setJSONItem,
} from './useAsyncStorage';

const buildNewsKey = (appId, newsId) => `${appId}:${newsId}`;

/**
 * Hook personnalisé pour la gestion des actualités
 * Extrait la logique complexe de gestion des news du HomeScreen
 * Inclut un système de cache pour afficher instantanément les news
 */
export const useNewsManager = steamId => {
  // Factory pour créer l'état initial des news
  const createInitialNewsState = useCallback(() => {
    debugLog('[NEWS] Initialisation de letat des actualites');
    return {
      items: [],
      loading: false,
      refreshing: false,
      error: null,
      initialized: false,
      favoritesOnly: false,
      hasFavorites: false,
      favoriteIds: [],
      favoriteCount: 0,
    };
  }, []);

  const [newsState, setNewsState] = useState({
    news: createInitialNewsState(),
  });
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const newsHydratedFromCacheRef = useRef(false);
  const favoritesOnlyRef = useRef(false);

  useEffect(() => {
    favoritesOnlyRef.current = Boolean(newsState.news?.favoritesOnly);
  }, [newsState.news?.favoritesOnly]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetNewsState = useCallback(updater => {
    if (!isMountedRef.current) {
      return;
    }

    if (typeof updater === 'function') {
      setNewsState(prev => updater(prev));
      return;
    }

    setNewsState(updater);
  }, []);

  const persistNewsCache = useCallback(
    async (items, targetSteamId = steamId) => {
      const cacheKey = buildStorageKey('newsFeed', targetSteamId);
      if (!cacheKey) {
        return;
      }
      await setJSONItem(cacheKey, items);
      debugLog('[NEWS] Cache sauvegardé', { count: items.length });
    },
    [steamId],
  );

  // Fonction pour récupérer les actualités
  const fetchNews = useCallback(
    async (options = {}) => {
      debugLog('[NEWS] fetchNews appelée');
      debugLog('[NEWS] steamId:', maskSteamId(steamId) || '(vide)');
      debugLog('[NEWS] silent:', options.silent);

      const silent = options.silent === true;
      const requestedFavoritesOnly =
        typeof options.favoritesOnly === 'boolean'
          ? options.favoritesOnly
          : favoritesOnlyRef.current;
      const requestId = ++requestIdRef.current;
      const shouldProcess = () =>
        isMountedRef.current && requestId === requestIdRef.current;

      favoritesOnlyRef.current = requestedFavoritesOnly;

      if (!steamId) {
        debugLog('[NEWS] Pas de steamId → état vide');
        safeSetNewsState(prev => ({
          ...prev,
          news: {
            ...createInitialNewsState(),
            favoritesOnly: requestedFavoritesOnly,
            initialized: true,
          },
        }));
        return;
      }

      debugLog('[NEWS] Chargement des actualités...');

      safeSetNewsState(prev => {
        const previous = prev.news || createInitialNewsState();
        return {
          ...prev,
          news: {
            ...previous,
            loading: !silent,
            refreshing: silent,
            error: null,
            initialized: true,
            favoritesOnly: requestedFavoritesOnly,
          },
        };
      });

      try {
        const response = await newsService.getNewsFeed(steamId, {
          perGameLimit: 20,
          favoritesOnly: requestedFavoritesOnly,
        });

        if (!shouldProcess()) {
          return;
        }

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];
        const favoriteStats = response.data?.metadata?.favoriteStats || {};
        const favoriteIds = items
          .filter(item => item?.isFavorite)
          .map(item => buildNewsKey(item.appId, item.news?.id));

        await persistNewsCache(items);

        safeSetNewsState(prev => {
          const previous = prev.news || createInitialNewsState();
          return {
            ...prev,
            news: {
              ...previous,
              items,
              loading: false,
              refreshing: false,
              error: null,
              initialized: true,
              favoritesOnly: requestedFavoritesOnly,
              hasFavorites:
                Boolean(favoriteStats.hasFavorites) || favoriteIds.length > 0,
              favoriteIds,
              favoriteCount: favoriteStats.count ?? favoriteIds.length,
            },
          };
        });
      } catch (error) {
        debugError('[NEWS] Erreur lors du chargement du fil:', error);
        if (!shouldProcess()) {
          return;
        }

        safeSetNewsState(prev => {
          const previous = prev.news || createInitialNewsState();
          return {
            ...prev,
            news: {
              ...previous,
              loading: false,
              refreshing: false,
              error:
                'Impossible de récupérer les actualités pour le moment. Veuillez réessayer.',
              initialized: true,
              favoritesOnly: requestedFavoritesOnly,
            },
          };
        });
      }
    },
    [createInitialNewsState, safeSetNewsState, steamId, persistNewsCache],
  );
  // Hydratation depuis le cache au montage
  useEffect(() => {
    const hydrateFromCache = async () => {
      if (!steamId || newsHydratedFromCacheRef.current) {
        return;
      }

      const cacheKey = buildStorageKey('newsFeed', steamId);
      if (!cacheKey) {
        return;
      }

      try {
        const cachedNews = await getJSONItem(cacheKey, null);
        if (Array.isArray(cachedNews) && cachedNews.length > 0) {
          newsHydratedFromCacheRef.current = true;
          safeSetNewsState(prev => ({
            ...prev,
            news: {
              ...createInitialNewsState(),
              items: cachedNews,
              initialized: true,
            },
          }));
          debugLog('[NEWS] Hydraté depuis le cache', {
            count: cachedNews.length,
          });
        }
      } catch (err) {
        debugError('[NEWS] Erreur hydratation cache:', err);
      }
    };

    hydrateFromCache();
  }, [steamId, safeSetNewsState, createInitialNewsState]);

  // Fonction pour mettre à jour le statut de suivi d'un jeu dans les news
  const updateNewsFollowStatus = useCallback(
    (appId, isFollowed) => {
      safeSetNewsState(prev => {
        const previous = prev.news || createInitialNewsState();
        return {
          ...prev,
          news: {
            ...previous,
            items: previous.items.map(item =>
              item.appId?.toString() === appId
                ? {...item, isFollowed: !isFollowed}
                : item,
            ),
          },
        };
      });
    },
    [createInitialNewsState, safeSetNewsState],
  );

  const removeNewsByAppId = useCallback(
    appId => {
      if (!appId) {
        return;
      }

      safeSetNewsState(prev => {
        const previous = prev.news || createInitialNewsState();
        return {
          ...prev,
          news: {
            ...previous,
            items: previous.items.filter(
              item => item.appId?.toString() !== appId.toString(),
            ),
          },
        };
      });
    },
    [createInitialNewsState, safeSetNewsState],
  );

  const setFavoritesOnlyFilter = useCallback(
    value => {
      fetchNews({ favoritesOnly: value });
    },
    [fetchNews],
  );

  const toggleNewsFavorite = useCallback(
    async newsItem => {
      if (!steamId || !newsItem?.news?.id || !newsItem?.appId || !newsItem.news?.date) {
        return;
      }

      const newsId = newsItem.news.id;
      const appId = newsItem.appId;
      const isFavorite = Boolean(newsItem.isFavorite);
      const key = buildNewsKey(appId, newsId);
      const newsDate = newsItem.news.date;

      safeSetNewsState(prev => {
        const previous = prev.news || createInitialNewsState();
        const favoriteSet = new Set(previous.favoriteIds || []);
        if (isFavorite) {
          favoriteSet.delete(key);
        } else {
          favoriteSet.add(key);
        }

        return {
          ...prev,
          news: {
            ...previous,
            items: previous.items.map(item =>
              item.appId === appId && item.news?.id === newsId
                ? {...item, isFavorite: !isFavorite}
                : item,
            ),
            favoriteIds: Array.from(favoriteSet),
            hasFavorites: favoriteSet.size > 0,
          },
        };
      });

      try {
        if (isFavorite) {
          await userService.removeNewsFavorite(steamId, appId, newsId);
        } else {
          await userService.addNewsFavorite(steamId, {
            appId,
            newsId,
            newsDate,
          });
        }
        await fetchNews({ silent: true, favoritesOnly: favoritesOnlyRef.current });
      } catch (error) {
        debugError('[NEWS] toggle favorite error', error);
        await fetchNews({ favoritesOnly: favoritesOnlyRef.current });
      }
    },
    [steamId, fetchNews, safeSetNewsState, createInitialNewsState],
  );

  // Réinitialiser les news quand le steamId change
  useEffect(() => {
    debugLog('\n📰 [NEWS useEffect[steamId]] Déclenché');
    debugLog('📰 [NEWS useEffect[steamId]] steamId:', steamId || '(vide)');
    debugLog('📰 [NEWS useEffect[steamId]] Reset newsState');
    safeSetNewsState({
      news: createInitialNewsState(),
    });
  }, [createInitialNewsState, safeSetNewsState, steamId]);

  // Charger les news quand le filtre change
  useEffect(() => {
    if (!newsState.news?.initialized) {
      return;
    }
    fetchNews();
  }, [fetchNews, newsState.news?.initialized]);

  return {
    newsState,
    fetchNews,
    updateNewsFollowStatus,
    removeNewsByAppId,
     setFavoritesOnlyFilter,
     toggleNewsFavorite,
    activeNewsState: newsState.news,
    isNewsInitialized: newsState.news?.initialized,
    isNewsLoading: newsState.news?.loading,
  };
};
