import React from 'react';
import OptionModal from '../../../components/common/OptionModal';
import {useAppContext} from '../../../context/AppContext';

// Configuration des options de tri
const SORT_OPTIONS = [
  {value: 'default', label: 'Ordre alphabétique'},
  {value: 'recent', label: 'Joué récemment'},
  {value: 'mostPlayed', label: 'Plus joué'},
  {value: 'recentlyUpdated', label: 'Mis à jour récemment'},
];

const SortModal = () => {
  const {
    sortModalVisible,
    setSortModalVisible,
    sortOption,
    setSortOption,
    filterAndSortGames,
  } = useAppContext();

  // Fonction pour gérer le changement d'option de tri
  const handleSortOptionChange = option => {
    // Mettre à jour l'option de tri dans l'état
    setSortOption(option);

    // Appliquer immédiatement le tri avec la nouvelle option
    filterAndSortGames(option);
  };

  return (
    <OptionModal
      visible={sortModalVisible}
      onClose={() => setSortModalVisible(false)}
      title="Trier par"
      options={SORT_OPTIONS}
      selectedValue={sortOption}
      onSelect={handleSortOptionChange}
    />
  );
};

export default SortModal;
