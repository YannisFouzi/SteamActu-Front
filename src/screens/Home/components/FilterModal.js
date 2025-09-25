import React from 'react';
import OptionModal from '../../../components/common/OptionModal';
import {useAppContext} from '../../../context/AppContext';

// Configuration des options de filtre
const FILTER_OPTIONS = [
  {value: 'all', label: 'Tous les jeux'},
  {value: 'followed', label: 'Jeux suivis'},
  {value: 'unfollowed', label: 'Jeux non suivis'},
];

const FilterModal = () => {
  const {
    filterModalVisible,
    setFilterModalVisible,
    followFilter,
    setFollowFilter,
    filterAndSortGames,
  } = useAppContext();

  // Fonction pour gérer le changement d'option de filtre
  const handleFilterChange = option => {
    // Mettre à jour l'option de filtre dans l'état
    setFollowFilter(option);

    // Appliquer immédiatement le filtrage avec la nouvelle option
    filterAndSortGames(null, option);
  };

  return (
    <OptionModal
      visible={filterModalVisible}
      onClose={() => setFilterModalVisible(false)}
      title="Filtrer par"
      options={FILTER_OPTIONS}
      selectedValue={followFilter}
      onSelect={handleFilterChange}
    />
  );
};

export default FilterModal;
