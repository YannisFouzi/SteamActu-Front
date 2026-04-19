import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {normalizeLanguage, translate} from '../i18n';
import {newsService, userService} from '../services/api';
import {debugError, debugLog, maskSteamId} from './hooksLogger';
import {
  buildStorageKey,
  getJSONItem,
  setJSONItem,
} from './useAsyncStorage';

const buildNewsKey = (appId, newsId) => `${appId}:${newsId}`;

const buildInitialNewsState = (overrides = {}) => ({
  items: [],
  loading: false,
  refreshing: false,
  error: null,
  initialized: false,
  favoritesOnly: false,
  hasFavorites: false,
  favoriteIds: [],
  favoriteCount: 0,
  ...overrides,
});

export const useNewsManager = steamId => {
  const {i18n} = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  const createInitialNewsState = useCallback((overrides = {}) => {
    debugLog('[NEWS] Initialisation de letat des actualites');
    return buildInitialNewsState(overrides);
  }, []);

  const [newsState, setNewsState] = useState({
    news: buildInitialNewsState(),
  });
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
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

  const getCacheKey = useCallback(
    targetSteamId => buildStorageKey('newsFeed', `${targetSteamId}:${language}`),
    [language],
  );

  const persistNewsCache = useCallback(
    async (items, targetSteamId = steamId) => {
      const cacheKey = getCacheKey(targetSteamId);
      if (!cacheKey) {
        return;
      }
      await setJSONItem(cacheKey, items);
      debugLog('[NEWS] Cache sauvegarde', {count: items.length, language});
    },
    [getCacheKey, language, steamId],
  );

  const fetchNews = useCallback(
    async (options = {}) => {
      debugLog('[NEWS] fetchNews appelee');
      debugLog('[NEWS] steamId:', maskSteamId(steamId) || '(vide)');
      debugLog('[NEWS] language:', language);
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
        debugLog('[NEWS] Pas de steamId -> etat vide');
        safeSetNewsState(prev => ({
          ...prev,
          news: createInitialNewsState({
            favoritesOnly: requestedFavoritesOnly,
            initialized: true,
          }),
        }));
        return [];
      }

      safeSetNewsState(prev => {
        const previous = prev.news || createInitialNewsState();
        return {
          ...prev,
          news: {
            ...previous,
            loading: !silent && previous.items.length === 0,
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
          language,
          favoritesOnly: requestedFavoritesOnly,
        });

        if (!shouldProcess()) {
          return [];
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

        return items;
      } catch (error) {
        debugError('[NEWS] Erreur lors du chargement du fil:', error);
        if (!shouldProcess()) {
          return [];
        }

        safeSetNewsState(prev => {
          const previous = prev.news || createInitialNewsState();
          return {
            ...prev,
            news: {
              ...previous,
              loading: false,
              refreshing: false,
              error: translate('errors.connectionDataMessage'),
              initialized: true,
              favoritesOnly: requestedFavoritesOnly,
            },
          };
        });

        return [];
      }
    },
    [createInitialNewsState, language, persistNewsCache, safeSetNewsState, steamId],
  );

  useEffect(() => {
    let canceled = false;

    const initializeNews = async () => {
      debugLog('[NEWS] reset state', {steamId: steamId || '(vide)', language});

      favoritesOnlyRef.current = false;
      safeSetNewsState({
        news: buildInitialNewsState({
          loading: Boolean(steamId),
        }),
      });

      if (!steamId) {
        safeSetNewsState({
          news: buildInitialNewsState({
            initialized: true,
          }),
        });
        return;
      }

      const cacheKey = getCacheKey(steamId);
      if (!cacheKey) {
        await fetchNews();
        return;
      }

      try {
        const cachedNews = await getJSONItem(cacheKey, null);
        if (canceled || !isMountedRef.current) {
          return;
        }

        if (Array.isArray(cachedNews) && cachedNews.length > 0) {
          safeSetNewsState({
            news: buildInitialNewsState({
              items: cachedNews,
              initialized: true,
            }),
          });
          debugLog('[NEWS] Hydrate depuis le cache', {
            count: cachedNews.length,
            language,
          });
          fetchNews({silent: true}).catch(error => {
            debugError('[NEWS] Refresh silencieux post-cache échoué:', error);
          });
          return;
        }
      } catch (err) {
        debugError('[NEWS] Erreur hydratation cache:', err);
      }

      if (canceled || !isMountedRef.current) {
        return;
      }

      await fetchNews();
    };

    initializeNews();

    return () => {
      canceled = true;
    };
  }, [fetchNews, getCacheKey, language, safeSetNewsState, steamId]);

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
      fetchNews({favoritesOnly: value});
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
        await fetchNews({silent: true, favoritesOnly: favoritesOnlyRef.current});
      } catch (error) {
        debugError('[NEWS] toggle favorite error', error);
        await fetchNews({favoritesOnly: favoritesOnlyRef.current});
      }
    },
    [createInitialNewsState, fetchNews, safeSetNewsState, steamId],
  );

  return {
    newsState,
    fetchNews,
    removeNewsByAppId,
    setFavoritesOnlyFilter,
    toggleNewsFavorite,
  };
};
