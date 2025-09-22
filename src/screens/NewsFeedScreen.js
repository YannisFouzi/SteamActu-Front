import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppContext} from '../context/AppContext';
import {newsService} from '../services/api';

const NewsFeedScreen = () => {
  const {steamId, handleFollowGame, isGameFollowed} = useAppContext();
  const [feedItems, setFeedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followedOnly, setFollowedOnly] = useState(true);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(
    async (options = {}) => {
      if (!steamId) {
        setFeedItems([]);
        setLoading(false);
        return;
      }

      try {
        if (!options.silent) {
          setLoading(true);
        }
        setError(null);

        const response = await newsService.getNewsFeed(steamId, {
          followedOnly,
          limit: 30,
          perGameLimit: 3,
        });

        const items = Array.isArray(response.data?.items)
          ? response.data.items
          : [];

        setFeedItems(items);
      } catch (err) {
        console.error('Erreur lors du chargement du fil:', err);
        setError(
          "Impossible de recuperer les actualites pour le moment. Veuillez reessayer."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [steamId, followedOnly]
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed({silent: true});
  }, [fetchFeed]);

  const toggleFollowedOnly = useCallback(
    value => {
      setLoading(true);
      setFollowedOnly(value);
    },
    []
  );

  const renderEmptyList = useMemo(
    () => () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {followedOnly
            ? "Aucune actualite recente pour vos jeux suivis."
            : "Aucune actualite disponible pour le moment."}
        </Text>
      </View>
    ),
    [followedOnly]
  );


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

  const handleToggleFollow = useCallback(
    async (appId, isFollowed) => {
      if (!appId) {
        return;
      }

      try {
        await handleFollowGame(appId, isFollowed);
        setFeedItems((previous) =>
          previous.map((item) =>
            item.appId === appId
              ? {...item, isFollowed: !isFollowed}
              : item
          )
        );
      } catch (err) {
        console.error('Erreur lors du changement de suivi:', err);
      }
    },
    [handleFollowGame]
  );

  const openNews = useCallback(
    (item) => {
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

      Linking.openURL(targetUrl).catch((err) => {
        console.error("Erreur lors de l'ouverture du lien:", err);
        Alert.alert('Erreur', "Impossible d'ouvrir le lien sur Steam.");
      });
    },
    []
  );

  const renderItem = useCallback(
    ({item}) => {
      const appId = item.appId?.toString();
      const isFollowedFromData =
        typeof item.isFollowed === 'boolean'
          ? item.isFollowed
          : isGameFollowed(appId);
      const isFollowed = isFollowedFromData;

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => openNews(item)}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.gameName}>{item.gameName}</Text>
              <Text style={styles.metaText}>{formatDate(item.news?.date)}</Text>
            </View>
            <TouchableOpacity
              style={styles.followButton}
              onPress={() => handleToggleFollow(appId, isFollowed)}>
              <Icon
                name={isFollowed ? 'notifications' : 'notifications-outline'}
                size={22}
                color={isFollowed ? '#4CAF50' : '#757575'}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.newsTitle}>{item.news?.title}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>
              {item.subscribersCount || 0} abonnes suivent ce jeu
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [formatDate, handleToggleFollow, isGameFollowed, openNews]
  );

  const keyExtractor = useCallback(
    (item, index) => `${item.appId}-${item.news?.id || index}`,
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            !followedOnly && styles.toggleButtonActive,
          ]}
          onPress={() => toggleFollowedOnly(false)}>
          <Text
            style={[
              styles.toggleText,
              !followedOnly && styles.toggleTextActive,
            ]}>
            Toutes les actus
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            followedOnly && styles.toggleButtonActive,
          ]}
          onPress={() => toggleFollowedOnly(true)}>
          <Text
            style={[
              styles.toggleText,
              followedOnly && styles.toggleTextActive,
            ]}>
            Jeux suivis
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement du fil d'actualites...</Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#66C0F4"
            />
          }
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2838',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#171A21',
    borderBottomWidth: 1,
    borderBottomColor: '#2A475E',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#2A3F5A',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#66C0F4',
  },
  toggleText: {
    color: '#8F98A0',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#0B1A2B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#8F98A0',
    marginTop: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B2838',
  },
  metaText: {
    fontSize: 12,
    color: '#4B5C6B',
  },
  followButton: {
    padding: 6,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  cardFooter: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#757575',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8F98A0',
    fontSize: 15,
    textAlign: 'center',
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8B0000',
  },
  errorText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default NewsFeedScreen;