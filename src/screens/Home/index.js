import {useNavigation} from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useAppContext} from '../../context/AppContext';
import {newsService} from '../../services/api';
import FilterModal from './components/FilterModal';
import GamesList from './components/GamesList';
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

const createInitialNewsState = () => ({
  items: [],
  loading: false,
  refreshing: false,
  error: null,
  initialized: false,
});

const HomeScreen = () => {
  const {
    loading: gamesLoading,
    refreshing,
    handleRefresh,
    steamId,
    handleFollowGame,
    isGameFollowed,
  } = useAppContext();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(TABS.MY_GAMES);
  const [showFollowedNewsOnly, setShowFollowedNewsOnly] = useState(false);
  const [newsState, setNewsState] = useState({
    [TABS.NEWS]: createInitialNewsState(),
  });

  const isNewsTab = activeTab === TABS.NEWS;
  const activeNewsState = isNewsTab ? newsState[TABS.NEWS] : null;
  const isNewsInitialized = activeNewsState?.initialized;
  const isNewsLoading = activeNewsState?.loading;
  const fetchNews = useCallback(
    async (options = {}) => {
      const silent = options.silent === true;

      if (!steamId) {
        setNewsState(prev => ({
          ...prev,
          [TABS.NEWS]: {
            ...createInitialNewsState(),
            initialized: true,
          },
        }));
        return;
      }

      setNewsState(prev => {
        const previous = prev[TABS.NEWS] || createInitialNewsState();
        return {
          ...prev,
          [TABS.NEWS]: {
            ...previous,
            loading: !silent,
            refreshing: silent,
            error: null,
            initialized: true,
          },
        };
      });

      try {
        const response = await newsService.getNewsFeed(steamId, {
          followedOnly: showFollowedNewsOnly,
          perGameLimit: 10,
        });

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];

        setNewsState(prev => {
          const previous = prev[TABS.NEWS] || createInitialNewsState();
          return {
            ...prev,
            [TABS.NEWS]: {
              ...previous,
              items,
              loading: false,
              refreshing: false,
              error: null,
              initialized: true,
            },
          };
        });
      } catch (error) {
        console.error('Erreur lors du chargement du fil:', error);
        setNewsState(prev => {
          const previous = prev[TABS.NEWS] || createInitialNewsState();
          return {
            ...prev,
            [TABS.NEWS]: {
              ...previous,
              loading: false,
              refreshing: false,
              error:
                "Impossible de recuperer les actualites pour le moment. Veuillez reessayer.",
              initialized: true,
            },
          };
        });
      }
    },
    [showFollowedNewsOnly, steamId],
  );

  useEffect(() => {
    setNewsState({
      [TABS.NEWS]: createInitialNewsState(),
    });
  }, [steamId]);

  useEffect(() => {
    if (!isNewsTab) {
      return;
    }

    if (!isNewsInitialized && !isNewsLoading) {
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

  useEffect(() => {
    if (!isNewsTab || !isNewsInitialized) {
      return;
    }

    fetchNews();
  }, [showFollowedNewsOnly, isNewsTab, isNewsInitialized, fetchNews]);

  const formatDate = useCallback(timestamp => {
    if (!timestamp) {
      return '';
    }
    const date = new Date(timestamp);
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    }
    if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const openNews = useCallback(item => {
    if (!item) {
      return;
    }

    const appId = item.appId?.toString();
    let targetUrl = item.news?.url;

    if (!targetUrl && appId) {
      targetUrl = `https://store.steampowered.com/news/app/${appId}`;
    }

    if (!targetUrl) {
      Alert.alert('Information', "Aucun lien n'est disponible pour cette actualite.");
      return;
    }

    Linking.openURL(targetUrl).catch(err => {
      console.error("Erreur lors de l'ouverture du lien:", err);
      Alert.alert('Erreur', "Impossible d'ouvrir le lien sur Steam.");
    });
  }, []);

  const handleNewsToggleFollow = useCallback(
    async (appId, isFollowed) => {
      if (!appId) {
        return;
      }

      try {
        await handleFollowGame(appId, isFollowed);
        setNewsState(prev => {
          const previous = prev[TABS.NEWS] || createInitialNewsState();
          return {
            ...prev,
            [TABS.NEWS]: {
              ...previous,
              items: previous.items.map(item =>
                item.appId?.toString() === appId
                  ? {...item, isFollowed: !isFollowed}
                  : item,
              ),
            },
          };
        });
      } catch (error) {
        console.error('Erreur lors du changement de suivi:', error);
      }
    },
    [handleFollowGame],
  );

  const renderEmptyNewsList = useMemo(() => {
    if (!isNewsTab) {
      return () => null;
    }

    const message = !steamId
      ? 'Connectez-vous pour afficher vos actualites.'
      : showFollowedNewsOnly
      ? "Aucune actualite recente pour vos jeux suivis."
      : 'Aucune actualite disponible pour le moment.';

    return () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  }, [isNewsTab, showFollowedNewsOnly, steamId]);

  const renderNewsItem = useCallback(
    ({item}) => {
      if (!item) {
        return null;
      }

      const appId = item.appId?.toString();
      const rawFollowed =
        typeof item.isFollowed === 'boolean'
          ? item.isFollowed
          : isGameFollowed(appId);
      const isFollowed = rawFollowed;

      return (
        <TouchableOpacity
          style={styles.newsCard}
          activeOpacity={0.9}
          onPress={() => openNews(item)}>
          <View style={styles.newsCardHeader}>
            <View>
              <Text style={styles.newsGameName}>{item.gameName}</Text>
              <Text style={styles.newsMetaText}>
                {formatDate(item.news?.date)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.newsFollowButton}
              onPress={() => handleNewsToggleFollow(appId, isFollowed)}>
              <Icon
                name={isFollowed ? 'notifications' : 'notifications-outline'}
                size={22}
                color={isFollowed ? '#4CAF50' : '#757575'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.newsTitle}>{item.news?.title}</Text>
        </TouchableOpacity>
      );
    },
    [formatDate, handleNewsToggleFollow, isGameFollowed, openNews],
  );

  const newsKeyExtractor = useCallback(
    (item, index) => `${item.appId}-${item.news?.id || index}`,
    [],
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
        <View style={styles.newsContainer}>
          <View style={styles.newsFilterRow}>
            <Text style={styles.newsFilterLabel}>Jeux suivis uniquement</Text>
            <Switch
              value={showFollowedNewsOnly}
              onValueChange={setShowFollowedNewsOnly}
              trackColor={{false: '#2A3F5A', true: '#2A3F5A'}}
              thumbColor={showFollowedNewsOnly ? '#66C0F4' : '#f4f3f4'}
            />
          </View>

          {activeNewsState?.error ? (
            <View style={styles.newsErrorContainer}>
              <Text style={styles.newsErrorText}>{activeNewsState.error}</Text>
            </View>
          ) : null}

          {activeNewsState?.loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#66C0F4" />
              <Text style={styles.loadingText}>
                Chargement du fil d'actualites...
              </Text>
            </View>
          ) : (
            <FlatList
              data={activeNewsState?.items || []}
              keyExtractor={newsKeyExtractor}
              renderItem={renderNewsItem}
              contentContainerStyle={styles.newsListContent}
              refreshControl={
                <RefreshControl
                  refreshing={Boolean(activeNewsState?.refreshing)}
                  onRefresh={() => fetchNews({silent: true})}
                  tintColor="#66C0F4"
                />
              }
              ListEmptyComponent={renderEmptyNewsList}
            />
          )}
        </View>
      ) : (
        <>
          <SearchBar />
          {gamesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#66C0F4" />
              <Text style={styles.loadingText}>Chargement des jeux...</Text>
            </View>
          ) : (
            <GamesList />
          )}
        </>
      )}

      {activeTab === TABS.MY_GAMES && refreshing ? (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color="#66C0F4" />
          <Text style={styles.loadingMoreText}>
            Analyse des jeux en cours... Les resultats seront mis a jour automatiquement.
          </Text>
        </View>
      ) : null}

      <SortModal />
      <FilterModal />
    </SafeAreaView>
  );
};

export default HomeScreen;



