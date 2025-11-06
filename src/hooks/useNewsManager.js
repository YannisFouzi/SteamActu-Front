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
      console.log('\n📰 [NEWS] fetchNews appelée');
      console.log('📰 [NEWS] steamId:', steamId || '(vide)');
      console.log('📰 [NEWS] showFollowedNewsOnly:', showFollowedNewsOnly);
      console.log('📰 [NEWS] silent:', options.silent);
      
      const silent = options.silent === true;

      if (!steamId) {
        console.log('📰 [NEWS] ❌ Pas de steamId → état vide');
        setNewsState(prev => ({
          ...prev,
          news: {
            ...createInitialNewsState(),
            initialized: true,
          },
        }));
        return;
      }
      
      console.log('📰 [NEWS] ⏳ Chargement des actualités...');

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
        console.log('📰 [NEWS] 🔄 GET /news/feed (perGameLimit: 20)');
        const response = await newsService.getNewsFeed(steamId, {
          followedOnly: showFollowedNewsOnly,
          perGameLimit: 20,
        });

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];

        console.log('📰 [NEWS] ✅ News récupérées:', items.length, 'items');
        console.log('📰 [NEWS] ✅ Chargement terminé\n');

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
        console.error('📰 [NEWS] ❌ Erreur lors du chargement du fil:', error);
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
    console.log('\n📰 [NEWS useEffect[steamId]] Déclenché');
    console.log('📰 [NEWS useEffect[steamId]] steamId:', steamId || '(vide)');
    console.log('📰 [NEWS useEffect[steamId]] Reset newsState');
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
