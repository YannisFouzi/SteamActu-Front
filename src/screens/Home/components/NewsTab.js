import React, { useCallback, useMemo } from 'react';
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
import LoadingContainer from '../../../components/LoadingContainer';
import { COLORS } from '../../../constants';
import { debugError } from '../../../hooks/hooksLogger';
import { formatRelativeDate } from '../../../utils';
import styles from '../styles';
import EmptyStateMessage from './EmptyStateMessage';

/**
 * Composant pour l'onglet News
 * Extrait du HomeScreen pour rÃ©duire la complexitÃ©
 */
const NewsTab = ({
  steamId,
  newsState,
  fetchNews,
  favoritesOnly = false,
  hasFavorites = false,
  onToggleFavoritesFilter,
  onToggleFavorite,
}) => {
  const activeNewsState = newsState?.news || null;
  const showFavoritesToggle =
    (hasFavorites || favoritesOnly) && typeof onToggleFavoritesFilter === 'function';

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
    const commonProps = {
      styles,
      align: 'top',
    };

    if (!steamId) {
      return () => (
        <EmptyStateMessage
          {...commonProps}
          iconName="log-in-outline"
          title="Connectez-vous pour vos actus"
          text="Identifiez-vous pour retrouver les actualités de vos jeux suivis."
          subtext="Allez dans les paramètres pour vous connecter à votre compte Steam."
        />
      );
    }

    return () => (
      <EmptyStateMessage
        {...commonProps}
        iconName="newspaper-outline"
        title="Aucune actualité récente"
        text="Vos jeux suivis n'ont pas publié de nouvelles actualités. Revenez plus tard ou suivez d'autres jeux pour élargir le flux."
      />
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
            {steamId && typeof onToggleFavorite === 'function' ? (
              <TouchableOpacity
                style={styles.newsFavoriteButton}
                accessibilityRole="button"
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
                onPress={() => onToggleFavorite(item)}>
                <Icon
                  name={item.isFavorite ? 'star' : 'star-outline'}
                  size={20}
                  color={
                    item.isFavorite
                      ? COLORS.FAVORITE_GOLD
                      : COLORS.STEAM_TEXT_GRAY
                  }
                />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.newsTitle}>{item.news?.title}</Text>
        </TouchableOpacity>
      );
    },
    [formatDate, onToggleFavorite, openNews, steamId],
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

      {showFavoritesToggle ? (
        <View style={styles.newsFavoritesToggle}>
          <Text style={styles.newsFavoritesToggleLabel}>
            Afficher uniquement les favoris
          </Text>
          <Switch
            value={favoritesOnly}
            onValueChange={onToggleFavoritesFilter}
            trackColor={{
              false: COLORS.STEAM_BORDER,
              true: COLORS.STEAM_LIGHT_BLUE,
            }}
            thumbColor={
              favoritesOnly ? COLORS.STEAM_BLUE : COLORS.STEAM_TEXT_GRAY
            }
          />
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
              onRefresh={() =>
                fetchNews({silent: true, favoritesOnly})
              }
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
