import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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

const NewsImage = ({url}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !url) {
    return null;
  }

  return (
    <Image
      source={{uri: url}}
      style={styles.newsImage}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
};

const GameLogo = ({logoUrl}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !logoUrl) {
    return (
      <View style={[styles.gameLogo, styles.gameLogoPlaceholder]}>
        <Icon name="game-controller-outline" size={20} color={COLORS.STEAM_TEXT_GRAY} />
      </View>
    );
  }

  return (
    <Image
      source={{uri: logoUrl}}
      style={styles.gameLogo}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
};

/**
 * Composant pour l'onglet News
 * Extrait du HomeScreen pour réduire la complexité
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
            <View style={styles.newsGameInfo}>
              {/* Logo du jeu */}
              <GameLogo logoUrl={item.gameLogoUrl} />
              <View style={styles.newsMetadata}>
                <Text style={styles.newsGameName}>{item.gameName}</Text>
                <Text style={styles.newsMetaText}>
                  {formatDate(item.news?.date)}
                </Text>
              </View>
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

          {/* Titre de la news */}
          <Text style={styles.newsTitle}>{item.news?.title}</Text>

          {/* Image de la news (si disponible, masquée si erreur de chargement) */}
          <NewsImage url={item.news?.firstImageUrl} />
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
