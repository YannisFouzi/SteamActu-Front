import React, { useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useDebounce } from '../../../hooks/useDebounce';
import SearchInput from './SearchInput';

const SearchBar = () => {
  const {searchQuery, setSearchQuery, filterAndSortGames} = useAppContext();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    filterAndSortGames();
  }, [debouncedSearchQuery, filterAndSortGames]);

  return (
    <SearchInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder="Rechercher dans mes jeux..."
    />
  );
};

export default SearchBar;
