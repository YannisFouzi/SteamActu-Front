import React, {useCallback, useMemo} from 'react';
import {
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
import LoadingContainer from '../../../components/common/LoadingContainer';
import {COLORS} from '../../../constants/theme';
import {useAppContext} from '../../../context/AppContext';
import {formatRelativeDate} from '../../../utils/gameHelpers';
import styles from '../styles';

/**
 * Composant pour l'onglet News
 * Extrait du HomeScreen pour réduire la complexité
 */
const NewsTab = ({
  steamId,
  showFollowedNewsOnly,
  setShowFollowedNewsOnly,
  newsState,
  fetchNews,
  handleFollowGame,
}) => {
  const {isGameFollowed} = useAppContext();

  const activeNewsState = newsState?.news || null;

  // Formater une date relative avec les minutes (spécifique aux news)
  const formatDate = useCallback(timestamp => {
    return formatRelativeDate(timestamp, {
      includeMinutes: true,
      fallback: '',
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
      Alert.alert(
        'Information',
        "Aucun lien n'est disponible pour cette actualité.",
      );
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
        // La mise à jour de l'état sera gérée par le parent
      } catch (error) {
        console.error('Erreur lors du changement de suivi:', error);
      }
    },
    [handleFollowGame],
  );

  const renderEmptyNewsList = useMemo(() => {
    const message = !steamId
      ? 'Connectez-vous pour afficher vos actualités.'
      : showFollowedNewsOnly
      ? 'Aucune actualité récente pour vos jeux suivis.'
      : 'Aucune actualité disponible pour le moment.';

    return () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  }, [showFollowedNewsOnly, steamId]);

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
    <View style={styles.newsContainer}>
      <View style={styles.newsFilterRow}>
        <Text style={styles.newsFilterLabel}>Jeux suivis uniquement</Text>
        <Switch
          value={showFollowedNewsOnly}
          onValueChange={setShowFollowedNewsOnly}
          trackColor={{false: '#2A3F5A', true: '#2A3F5A'}}
          thumbColor={showFollowedNewsOnly ? COLORS.STEAM_BLUE : '#f4f3f4'}
        />
      </View>

      {activeNewsState?.error ? (
        <View style={styles.newsErrorContainer}>
          <Text style={styles.newsErrorText}>{activeNewsState.error}</Text>
        </View>
      ) : null}

      {activeNewsState?.loading ? (
        <LoadingContainer text="Chargement du fil d'actualités..." />
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
              tintColor={COLORS.STEAM_BLUE}
            />
          }
          ListEmptyComponent={renderEmptyNewsList}
        />
      )}
    </View>
  );
};

export default NewsTab;
