import { useCallback, useEffect, useRef, useState } from 'react';
import { newsService } from '../services/api';
import { debugError, debugLog } from './hooksLogger';

/**
 * Hook personnalisé pour la gestion des actualités
 * Extrait la logique complexe de gestion des news du HomeScreen
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
    };
  }, []);

  const [newsState, setNewsState] = useState({
    news: createInitialNewsState(),
  });
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

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

  // Fonction pour récupérer les actualités
  const fetchNews = useCallback(
    async (options = {}) => {
      debugLog('\n📰 [NEWS] fetchNews appelée');
      debugLog('📰 [NEWS] steamId:', steamId || '(vide)');
      debugLog('📰 [NEWS] silent:', options.silent);
      
      const silent = options.silent === true;
      const requestId = ++requestIdRef.current;
      const shouldProcess = () =>
        isMountedRef.current && requestId === requestIdRef.current;

      if (!steamId) {
        debugLog('📰 [NEWS] ❌ Pas de steamId → état vide');
        safeSetNewsState(prev => ({
          ...prev,
          news: {
            ...createInitialNewsState(),
            initialized: true,
          },
        }));
        return;
      }
      
      debugLog('📰 [NEWS] ⏳ Chargement des actualités...');

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
          },
        };
      });

      try {
        debugLog('📰 [NEWS] 🔄 GET /news/feed (perGameLimit: 20)');
        const response = await newsService.getNewsFeed(steamId, {
          perGameLimit: 20,
        });

        if (!shouldProcess()) {
          return;
        }

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];

        debugLog('📰 [NEWS] ✅ News récupérées:', items.length, 'items');
        debugLog('📰 [NEWS] ✅ Chargement terminé\n');

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
            },
          };
        });
      } catch (error) {
        debugError('📰 [NEWS] ❌ Erreur lors du chargement du fil:', error);
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
            },
          };
        });
      }
    },
    [createInitialNewsState, safeSetNewsState, steamId],
  );

  // Fonction pour mettre à jour le statut de suivi d'un jeu dans les news
  const updateNewsFollowStatus = useCallback((appId, isFollowed) => {
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
  }, [createInitialNewsState, safeSetNewsState]);

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
    activeNewsState: newsState.news,
    isNewsInitialized: newsState.news?.initialized,
    isNewsLoading: newsState.news?.loading,
  };
};
