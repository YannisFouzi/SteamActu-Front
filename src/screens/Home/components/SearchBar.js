import React, {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useAppContext} from '../../../context/AppContext';
import {useDebounce} from '../../../hooks/useDebounce';
import SearchInput from './SearchInput';

const SearchBar = () => {
  const {t} = useTranslation();
  const {searchQuery, setSearchQuery, filterAndSortGames} = useAppContext();

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    filterAndSortGames();
  }, [debouncedSearchQuery, filterAndSortGames]);

  return (
    <SearchInput
      value={searchQuery}
      onChangeText={setSearchQuery}
      placeholder={t('games.searchMyGamesPlaceholder')}
    />
  );
};

export default SearchBar;
