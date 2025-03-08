import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import {useAppContext} from '../../context/AppContext';
import GamesList from './components/GamesList';
import SearchBar from './components/SearchBar';
import SortModal from './components/SortModal';
import styles from './styles';

const HomeScreen = () => {
  const {loading, refreshing} = useAppContext();

  return (
    <View style={styles.container}>
      <SearchBar />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement des jeux...</Text>
        </View>
      ) : (
        <GamesList />
      )}

      {refreshing && (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#66C0F4" />
          <Text style={styles.loadingMoreText}>
            Analyse des jeux en cours... Les résultats s'actualiseront
            automatiquement.
          </Text>
        </View>
      )}

      <SortModal />
    </View>
  );
};

export default HomeScreen;
