import { useCallback, useEffect, useRef, useState } from 'react';
import { newsService } from '../services/api';
import { getGameAppId } from '../utils';
import { debugError, debugLog, showAlert } from './hooksLogger';

/**
 * Hook personnalisé pour la gestion des actualités d'un jeu
 * Centralise la logique de chargement et de rafraîchissement des actualités
 */
export const useGameNews = game => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fonction pour charger les actualités d'un jeu
  const loadNews = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const shouldProcess = () =>
      isMountedRef.current && requestId === requestIdRef.current;

    if (shouldProcess()) {
      setLoading(true);
    }

    try {
      const gameId = getGameAppId(game);

      if (!gameId) {
        throw new Error('ID du jeu non trouvé');
      }

      debugLog('[GAME NEWS] Chargement pour le jeu', gameId);
      const response = await newsService.getGameNews(gameId, 10, 500);
      const nextNews = response.data || [];

      if (!shouldProcess()) {
        return;
      }

      setNews(Array.isArray(nextNews) ? nextNews : []);
    } catch (error) {
      debugError('Erreur lors du chargement des actualités:', error);

      if (!shouldProcess()) {
        return;
      }

      showAlert(
        'Erreur',
        'Impossible de charger les actualités. Veuillez réessayer.',
      );
    } finally {
      if (!shouldProcess()) {
        return;
      }

      setLoading(false);
      setRefreshing(false);
    }
  }, [game]);

  // Fonction pour rafraîchir les données
  const handleRefresh = useCallback(() => {
    if (isMountedRef.current) {
      setRefreshing(true);
    }
    loadNews();
  }, [loadNews]);

  // Charger les actualités au démarrage
  useEffect(() => {
    loadNews();
  }, [loadNews]);

  // Vérifier si nous avons des actualités à afficher
  const hasNews = news && Array.isArray(news) && news.length > 0;

  return {
    news,
    loading,
    refreshing,
    hasNews,
    loadNews,
    handleRefresh,
  };
};
