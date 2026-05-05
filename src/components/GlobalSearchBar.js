import React from 'react';
import {useTranslation} from 'react-i18next';
import {useAppContext} from '../context/AppContext';
import SearchInput from '../screens/Home/components/SearchInput';

/**
 * Barre de recherche globale au-dessus du tab navigator (Mes jeux | Wishlist).
 * Lit/ecrit `searchQuery` du AppContext (useGlobalSearch).
 */
const GlobalSearchBar = () => {
  const {t} = useTranslation();
  const {searchQuery, setSearchQuery} = useAppContext();

  return (
    <SearchInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder={t('search.unifiedPlaceholder')}
    />
  );
};

export default GlobalSearchBar;
