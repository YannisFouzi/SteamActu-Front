import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {steamService} from '../services/api';

/**
 * Hook personnalisé pour gérer la wishlist Steam
 * Centralise la logique de chargement et de gestion de la wishlist
 */
export const useWishlist = steamId => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Charge la wishlist depuis le backend
   * @param {boolean} silent - Si true, ne pas afficher le loading
   */
  const fetchWishlist = useCallback(
    async (silent = false) => {
      if (!steamId) {
        console.log('⚠️ Pas de steamId fourni pour fetchWishlist');
        return;
      }

      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);

        console.log(`📋 Chargement wishlist pour ${steamId}...`);
        const response = await steamService.getUserWishlist(steamId);

        // La réponse peut être un tableau ou un objet avec items
        let wishlistItems = [];
        if (Array.isArray(response.data)) {
          wishlistItems = response.data;
        } else if (response.data?.items) {
          wishlistItems = response.data.items;
        } else if (response.data?.response?.items) {
          wishlistItems = response.data.response.items;
        }

        console.log(`✅ Wishlist chargée : ${wishlistItems.length} jeux`);
        setWishlist(wishlistItems);

        return wishlistItems;
      } catch (err) {
        console.error('❌ Erreur lors du chargement de la wishlist:', err);

        // Gérer les erreurs spécifiques
        if (err.response?.status === 404) {
          setError('Wishlist non trouvée ou privée');
        } else if (err.response?.status === 403) {
          setError('Accès à la wishlist refusé (profil privé)');
        } else {
          setError('Erreur lors du chargement de la wishlist');
        }

        Alert.alert(
          'Erreur',
          'Impossible de charger votre wishlist. Assurez-vous que votre profil Steam est public.',
        );

        setWishlist([]);
        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [steamId],
  );

  /**
   * Rafraîchit la wishlist avec indicateur de refreshing
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWishlist(false);
  }, [fetchWishlist]);

  /**
   * Trie la wishlist par date d'ajout (plus récents d'abord)
   */
  const sortedWishlist = useCallback(() => {
    if (!Array.isArray(wishlist)) return [];

    return [...wishlist].sort((a, b) => {
      const dateA = a.date_added || 0;
      const dateB = b.date_added || 0;
      return dateB - dateA; // Plus récents d'abord
    });
  }, [wishlist]);

  /**
   * Filtre la wishlist par nom de jeu
   * @param {string} query - Terme de recherche
   */
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

  /**
   * Statistiques de la wishlist
   */
  const wishlistStats = useCallback(() => {
    if (!Array.isArray(wishlist)) {
      return {
        total: 0,
        recentlyAdded: 0,
      };
    }

    // Jeux ajoutés dans les 30 derniers jours
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
    const recentlyAdded = wishlist.filter(
      item => (item.date_added || 0) > thirtyDaysAgo,
    ).length;

    return {
      total: wishlist.length,
      recentlyAdded,
    };
  }, [wishlist]);

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
  };
};




