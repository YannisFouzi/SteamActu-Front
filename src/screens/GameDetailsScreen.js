import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LoadingContainer from '../components/LoadingContainer';
import NewsItem from '../components/NewsItem';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../constants';
import { useGameNews } from '../hooks/useGameNews';
import { getGameAppId } from '../utils';

const GameDetailsScreen = ({route, navigation}) => {
  const game = route?.params?.game ?? null;

  useEffect(() => {
    navigation.setOptions({
      title: game?.name || 'Détails du jeu',
    });
  }, [game?.name, navigation]);

  if (!game) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Impossible d’afficher ce jeu. Revenez à l’écran précédent.
          </Text>
        </View>
      </View>
    );
  }

  const {news, loading, refreshing, hasNews, handleRefresh} = useGameNews(game);

  // Fonction pour ouvrir un lien d'actualité
  const openNewsLink = useCallback(() => {
    // Utiliser la fonction utilitaire pour récupérer l'ID du jeu
    const gameId = getGameAppId(game);
    if (!gameId) {
      Alert.alert('Information', 'Identifiant de jeu introuvable.');
      return;
    }
    const steamCommunityUrl = `https://steamcommunity.com/games/${gameId}/announcements`;

    // Ouvrir directement le lien Steam
    Linking.openURL(steamCommunityUrl).catch(err => {
      debugError("Erreur lors de l'ouverture du lien Steam:", err);
      Alert.alert(
        'Erreur',
        "Impossible d'ouvrir Steam. Veuillez vérifier que l'application Steam est installée.",
      );
    });
  }, [game]);

  // Fonction pour afficher un élément de la liste des actualités
  const renderNewsItem = useCallback(
    ({item}) => <NewsItem item={item} onPress={openNewsLink} />,
    [openNewsLink],
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <LoadingContainer
          text="Chargement des actualités..."
          style={styles.loadingContainer}
        />
      ) : !hasNews ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Aucune actualité disponible pour ce jeu.
          </Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item, index) => `${item.gid || ''}-${index}`}
          contentContainerStyle={styles.newsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.STEAM_BLUE]}
              tintColor={COLORS.STEAM_BLUE}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  loadingContainer: {
    backgroundColor: COLORS.STEAM_NAVY,
  },
  newsList: {
    padding: 16,
  },
  emptyContainer: {
    ...CONTAINER_STYLES.emptyContainer,
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    ...TEXT_STYLES.emptyText,
  },
});

export default GameDetailsScreen;
