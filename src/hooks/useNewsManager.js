import {useCallback, useEffect, useState} from 'react';
import {newsService} from '../services/api';

/**
 * Hook personnalisé pour la gestion des actualités
 * Extrait la logique complexe de gestion des news du HomeScreen
 */
export const useNewsManager = (steamId, showFollowedNewsOnly) => {
  // Factory pour créer l'état initial des news
  const createInitialNewsState = useCallback(() => {
    console.log('🔄 useNewsManager: createInitialNewsState appelée');
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

  // Fonction pour récupérer les actualités
  const fetchNews = useCallback(
    async (options = {}) => {
      console.log(
        '🔄 useNewsManager: fetchNews appelée - steamId:',
        steamId,
        'showFollowedNewsOnly:',
        showFollowedNewsOnly,
      );
      const silent = options.silent === true;

      if (!steamId) {
        setNewsState(prev => ({
          ...prev,
          news: {
            ...createInitialNewsState(),
            initialized: true,
          },
        }));
        return;
      }

      setNewsState(prev => {
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
        const response = await newsService.getNewsFeed(steamId, {
          followedOnly: showFollowedNewsOnly,
          perGameLimit: 20,
        });

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];

        setNewsState(prev => {
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
        console.error('Erreur lors du chargement du fil:', error);
        setNewsState(prev => {
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
    [showFollowedNewsOnly, steamId],
  );

  // Fonction pour mettre à jour le statut de suivi d'un jeu dans les news
  const updateNewsFollowStatus = useCallback((appId, isFollowed) => {
    setNewsState(prev => {
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
  }, []);

  // Réinitialiser les news quand le steamId change
  useEffect(() => {
    console.log(
      '🔄 useNewsManager: useEffect steamId déclenché - steamId:',
      steamId,
    );
    setNewsState({
      news: createInitialNewsState(),
    });
  }, [steamId]);

  // Charger les news quand le filtre change
  useEffect(() => {
    console.log(
      '🔄 useNewsManager: useEffect filtre déclenché - showFollowedNewsOnly:',
      showFollowedNewsOnly,
      'initialized:',
      newsState.news?.initialized,
    );
    const activeNewsState = newsState.news;
    if (!activeNewsState?.initialized) {
      return;
    }
    fetchNews();
  }, [showFollowedNewsOnly, fetchNews]);

  return {
    newsState,
    fetchNews,
    updateNewsFollowStatus,
    activeNewsState: newsState.news,
    isNewsInitialized: newsState.news?.initialized,
    isNewsLoading: newsState.news?.loading,
  };
};
