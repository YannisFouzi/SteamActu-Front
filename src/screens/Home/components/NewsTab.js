import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LoadingContainer from '../../../components/LoadingContainer';
import { COLORS } from '../../../constants';
import { formatRelativeDate } from '../../../utils';
import styles from '../styles';

/**
 * Composant pour l'onglet News
 * Extrait du HomeScreen pour rÃ©duire la complexitÃ©
 */
const NewsTab = ({steamId, newsState, fetchNews}) => {
  const activeNewsState = newsState?.news || null;

  // Formater une date relative avec les minutes (spÃ©cifique aux news)
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
        "Aucun lien n'est disponible pour cette actualitÃ©.",
      );
      return;
    }

    Linking.openURL(targetUrl).catch(err => {
      debugError("Erreur lors de l'ouverture du lien:", err);
      Alert.alert('Erreur', "Impossible d'ouvrir le lien sur Steam.");
    });
  }, []);

  const renderEmptyNewsList = useMemo(() => {
    const message = !steamId
      ? 'Connectez-vous pour afficher vos actualitÃ©s.'
      : 'Aucune actualitÃ© rÃ©cente pour vos jeux suivis.';

    return () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  }, [steamId]);

  const renderNewsItem = useCallback(
    ({item}) => {
      if (!item) {
        return null;
      }

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
          </View>
          <Text style={styles.newsTitle}>{item.news?.title}</Text>
        </TouchableOpacity>
      );
    },
    [formatDate, openNews],
  );

  const newsKeyExtractor = useCallback(
    (item, index) => `${item.appId}-${item.news?.id || index}`,
    [],
  );

  return (
    <View style={styles.newsContainer}>
      {activeNewsState?.error ? (
        <View style={styles.newsErrorContainer}>
          <Text style={styles.newsErrorText}>{activeNewsState.error}</Text>
        </View>
      ) : null}

      {activeNewsState?.loading ? (
        <LoadingContainer text="Chargement du fil d'actualitÃ©s..." />
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
