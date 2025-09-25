import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LoadingContainer from '../../components/common/LoadingContainer';
import {COLORS} from '../../constants/theme';
import {useAppContext} from '../../context/AppContext';
import {useNewsManager} from '../../hooks/useNewsManager';
import FilterModal from './components/FilterModal';
import GamesList from './components/GamesList';
import NewsTab from './components/NewsTab';
import SearchBar from './components/SearchBar';
import SortModal from './components/SortModal';
import styles from './styles';

const TABS = {
  NEWS: 'news',
  MY_GAMES: 'myGames',
};

const TAB_ITEMS = [
  {key: TABS.NEWS, label: 'Actus'},
  {key: TABS.MY_GAMES, label: 'Mes jeux'},
];

const HomeScreen = () => {
  const {
    loading: gamesLoading,
    refreshing,
    handleRefresh,
    steamId,
    handleFollowGame,
  } = useAppContext();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.MY_GAMES);
  const [showFollowedNewsOnly, setShowFollowedNewsOnly] = useState(false);

  const isNewsTab = activeTab === TABS.NEWS;

  // Hook personnalisé pour la gestion des news
  const {
    newsState,
    fetchNews,
    updateNewsFollowStatus,
    isNewsInitialized,
    isNewsLoading,
  } = useNewsManager(steamId, showFollowedNewsOnly);

  // Charger les news au premier accès à l'onglet
  useEffect(() => {
    if (isNewsTab && !isNewsInitialized && !isNewsLoading) {
      fetchNews();
    }
  }, [isNewsTab, isNewsInitialized, isNewsLoading, fetchNews]);

  useEffect(() => {
    const onFocus = () => {
      if (!refreshing) {
        handleRefresh();
      }

      if (isNewsTab) {
        fetchNews({silent: true});
      }
    };

    const focusUnsubscribe = navigation.addListener('focus', onFocus);

    return () => {
      focusUnsubscribe();
    };
  }, [navigation, handleRefresh, refreshing, isNewsTab, fetchNews]);

  // Gestionnaire pour le suivi/désuivi des jeux depuis les news
  const handleNewsToggleFollow = useCallback(
    async (appId, isFollowed) => {
      if (!appId) return;

      try {
        await handleFollowGame(appId, isFollowed);
        updateNewsFollowStatus(appId, isFollowed);
      } catch (error) {
        console.error('Erreur lors du changement de suivi:', error);
      }
    },
    [handleFollowGame, updateNewsFollowStatus],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Steam Actu</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.headerButtonText}>Parametres</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {TAB_ITEMS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab(tab.key)}>
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isNewsTab ? (
        <NewsTab
          steamId={steamId}
          showFollowedNewsOnly={showFollowedNewsOnly}
          setShowFollowedNewsOnly={setShowFollowedNewsOnly}
          newsState={newsState}
          fetchNews={fetchNews}
          handleFollowGame={handleNewsToggleFollow}
        />
      ) : (
        <>
          <SearchBar />
          {gamesLoading ? (
            <LoadingContainer text="Chargement des jeux..." />
          ) : (
            <GamesList />
          )}
        </>
      )}

      {activeTab === TABS.MY_GAMES && refreshing ? (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={COLORS.STEAM_BLUE} />
          <Text style={styles.loadingMoreText}>
            Analyse des jeux en cours... Les résultats seront mis à jour
            automatiquement.
          </Text>
        </View>
      ) : null}

      <SortModal />
      <FilterModal />
    </SafeAreaView>
  );
};

export default HomeScreen;
