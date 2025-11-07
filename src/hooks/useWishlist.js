import {useCallback, useEffect, useRef, useState} from 'react';
import {steamService} from '../services/api';
import {debugError, debugLog, showAlert} from './hooksLogger';

/**
 * Hook personnalisé pour gérer la wishlist Steam
 * Centralise la logique de chargement et de gestion de la wishlist
 */
export const useWishlist = steamId => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Charge la wishlist depuis le backend
   * @param {boolean} silent - Si true, ne pas afficher le loading
   */
  const fetchWishlist = useCallback(
    async (silent = false) => {
      if (!steamId) {
        debugLog('[WISHLIST] Pas de steamId fourni, skip fetch');
        return [];
      }

      const requestId = ++requestIdRef.current;
      const shouldProcess = () =>
        isMountedRef.current && requestId === requestIdRef.current;

      try {
        if (!silent) {
          safeSetState(setLoading, true);
        }
        safeSetState(setError, null);

        debugLog(`[WISHLIST] Chargement pour ${steamId}...`);
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

        if (!shouldProcess()) {
          return [];
        }

        debugLog(`[WISHLIST] Wishlist chargée (${wishlistItems.length} jeux)`);
        safeSetState(setWishlist, wishlistItems);

        return wishlistItems;
      } catch (err) {
        debugError('❌ Erreur lors du chargement de la wishlist:', err);

        if (!shouldProcess()) {
          return [];
        }

        // Gérer les erreurs spécifiques
        if (err.response?.status === 404) {
          safeSetState(setError, 'Wishlist non trouvée ou privée');
        } else if (err.response?.status === 403) {
          safeSetState(setError, 'Accès à la wishlist refusé (profil privé)');
        } else {
          safeSetState(setError, 'Erreur lors du chargement de la wishlist');
        }

        showAlert(
          'Erreur',
          'Impossible de charger votre wishlist. Assurez-vous que votre profil Steam est public.',
        );

        safeSetState(setWishlist, []);
        return [];
      } finally {
        if (!shouldProcess()) {
          return [];
        }

        safeSetState(setLoading, false);
        safeSetState(setRefreshing, false);
      }
    },
    [safeSetState, steamId],
  );

  /**
   * Rafraîchit la wishlist avec indicateur de refreshing
   */
  const handleRefresh = useCallback(async () => {
    safeSetState(setRefreshing, true);
    await fetchWishlist(false);
  }, [fetchWishlist, safeSetState]);

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
