import {useCallback, useState} from 'react';

/**
 * Etat de la barre de recherche globale (au-dessus de Mes jeux / Wishlist).
 * Decouple la query du filtering Mes jeux : la query peut etre consommee
 * par n'importe quel scope (filteredGames, filterWishlist, useStoreSearch).
 */
export const useGlobalSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const clearSearchQuery = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    clearSearchQuery,
  };
};
