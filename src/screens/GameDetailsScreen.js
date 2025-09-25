import React, {useCallback, useEffect} from 'react';
import {
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LoadingContainer from '../components/common/LoadingContainer';
import NewsItem from '../components/common/NewsItem';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants/theme';
import {useGameNews} from '../hooks/useGameNews';
import {getGameAppId} from '../utils/gameHelpers';

const GameDetailsScreen = ({route, navigation}) => {
  // Récupération des données du jeu
  const game = route.params.game;

  // Hook personnalisé pour la gestion des actualités
  const {news, loading, refreshing, hasNews, handleRefresh} = useGameNews(game);

  // Définir le titre de la page au démarrage
  useEffect(() => {
    if (game && game.name) {
      navigation.setOptions({
        title: game.name,
      });
    }
  }, [game, navigation]);

  // Fonction pour ouvrir un lien d'actualité
  const openNewsLink = useCallback(() => {
    // Utiliser la fonction utilitaire pour récupérer l'ID du jeu
    const gameId = getGameAppId(game);
    const steamCommunityUrl = `https://steamcommunity.com/games/${gameId}/announcements`;

    // Ouvrir directement le lien Steam
    Linking.openURL(steamCommunityUrl).catch(err => {
      console.error("Erreur lors de l'ouverture du lien Steam:", err);
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
