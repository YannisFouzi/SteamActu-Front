import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppContext} from '../../context/AppContext';
import FilterModal from './components/FilterModal';
import GamesList from './components/GamesList';
import SearchBar from './components/SearchBar';
import SortModal from './components/SortModal';
import styles from './styles';

const HomeScreen = () => {
  const {loading, refreshing, handleLogout, handleRefresh, filteredGames} =
    useAppContext();
  const navigation = useNavigation();

  // Déclencher un rafraîchissement automatique lorsque l'écran est affiché pour la première fois
  useEffect(() => {
    console.log(
      'HomeScreen monté, nombre de jeux filtrés :',
      filteredGames.length,
    );

    // Si aucun jeu n'est chargé, déclencher un rafraîchissement
    if (filteredGames.length === 0 && !loading && !refreshing) {
      console.log(
        'Aucun jeu trouvé, déclenchement du rafraîchissement automatique',
      );
      handleRefresh();
    }
  }, [filteredGames.length, handleRefresh, loading, refreshing]);

  // Fonction de déconnexion adaptée avec navigation locale
  const handleLocalLogout = useCallback(async () => {
    // Appeler la fonction handleLogout du contexte
    await handleLogout();

    // Utiliser la navigation locale pour rediriger vers l'écran Login
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  }, [handleLogout, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Jeux</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerButtonText}>Paramètres</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLocalLogout}>
            <Text style={styles.headerButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

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
      <FilterModal />
    </SafeAreaView>
  );
};

export default HomeScreen;
