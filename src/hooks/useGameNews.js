import {useCallback, useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {newsService} from '../services/api';
import {getGameAppId} from '../utils/gameHelpers';

/**
 * Hook personnalisé pour la gestion des actualités d'un jeu
 * Centralise la logique de chargement et de rafraîchissement des actualités
 */
export const useGameNews = game => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fonction pour charger les actualités d'un jeu
  const loadNews = useCallback(async () => {
    try {
      setLoading(true);

      // Utiliser la fonction utilitaire centralisée pour récupérer l'ID
      const gameId = getGameAppId(game);

      if (!gameId) {
        throw new Error('ID du jeu non trouvé');
      }

      // Récupérer les actualités
      const response = await newsService.getGameNews(gameId, 10, 500);

      setNews(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des actualités:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les actualités. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [game]);

  // Fonction pour rafraîchir les données
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
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
