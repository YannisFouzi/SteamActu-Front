import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useRef} from 'react';
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
  const hasLeftScreen = useRef(false);

  // Utiliser les Ã©vÃ©nements de navigation pour dÃ©tecter quand l'utilisateur revient Ã  l'Ã©cran
  useEffect(() => {
    // Quand l'Ã©cran reÃ§oit le focus
    const onFocus = () => {
      // Toujours actualiser au focus pour gÃ©rer les reconnexions
      if (!refreshing) {
        handleRefresh();
      }

      hasLeftScreen.current = false; // RÃ©initialiser l'Ã©tat
    };

    // Quand l'Ã©cran perd le focus (l'utilisateur navigue ailleurs)
    const onBlur = () => {
      console.log("Ã‰vÃ©nement blur - l'utilisateur quitte l'Ã©cran Home");
      hasLeftScreen.current = true;
    };

    // S'abonner aux Ã©vÃ©nements
    const focusUnsubscribe = navigation.addListener('focus', onFocus);
    const blurUnsubscribe = navigation.addListener('blur', onBlur);

    // Nettoyage
    return () => {
      focusUnsubscribe();
      blurUnsubscribe();
    };
  }, [navigation, handleRefresh, refreshing]);

  // Log du nombre de jeux filtrÃ©s (refresh automatique supprimÃ©)
  useEffect(() => {}, [filteredGames.length]);

  // Fonction de dÃ©connexion adaptÃ©e avec navigation locale
  const handleLocalLogout = useCallback(async () => {
    // Appeler la fonction handleLogout du contexte
    await handleLogout();

    // Utiliser la navigation locale pour rediriger vers l'Ã©cran Login
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
            onPress={() => navigation.navigate('NewsFeed')}
          >
            <Text style={styles.headerButtonText}>Fil d'actu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerButtonText}>Parametres</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLocalLogout}>
            <Text style={styles.headerButtonText}>Deconnexion</Text>
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
            Analyse des jeux en cours... Les rÃ©sultats s'actualiseront
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
