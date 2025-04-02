import React, {useEffect, useState} from 'react';
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
import {newsService} from '../services/api';

const GameDetailsScreen = ({route, navigation}) => {
  // Récupération de l'ID du jeu, quelle que soit la structure
  const game = route.params.game;
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Définir le titre de la page au démarrage
  useEffect(() => {
    if (game && game.name) {
      navigation.setOptions({
        title: game.name,
      });
    }
  }, [game, navigation]);

  // Charger les actualités au démarrage
  useEffect(() => {
    loadNews();
  }, []);

  // Fonction pour charger les actualités d'un jeu
  const loadNews = async () => {
    try {
      setLoading(true);

      // Récupérer l'ID du jeu, qui peut être dans des propriétés différentes selon la source
      const gameId = game.appId || game.appid;

      if (!gameId) {
        throw new Error('ID du jeu non trouvé');
      }

      console.log('Chargement des actualités pour le jeu ID:', gameId);

      // Récupérer les actualités
      const response = await newsService.getGameNews(gameId, 10, 500);

      // Log pour déboguer les URLs
      if (response.data && response.data.length > 0) {
        console.log('Format des URLs reçues:');
        response.data.forEach((item, index) => {
          console.log(`News ${index + 1}: URL = ${item.url}`);
        });
      }

      setNews(response.data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des actualités:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger les actualités. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    setRefreshing(true);
    loadNews();
  };

  // Vérifier si nous avons des actualités à afficher
  const hasNews = news && Array.isArray(news) && news.length > 0;

  // Fonction pour formater une date
  const formatDate = timestamp => {
    const date = new Date(timestamp * 1000); // Convertir en millisecondes
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fonction pour ouvrir un lien
  const openLink = url => {
    // Créer une URL directe vers la page d'annonces Steam pour ce jeu
    const steamCommunityUrl = `https://steamcommunity.com/games/${
      game.appId || game.appid
    }/announcements`;

    // Log pour déboguer
    console.log('Ouverture directe du lien Steam:', steamCommunityUrl);

    // Ouvrir directement le lien Steam sans essayer d'ouvrir l'URL originale
    Linking.openURL(steamCommunityUrl).catch(err => {
      console.error("Erreur lors de l'ouverture du lien Steam:", err);
      Alert.alert(
        'Erreur',
        "Impossible d'ouvrir Steam. Veuillez vérifier que l'application Steam est installée.",
      );
    });
  };

  // Fonction pour afficher un élément de la liste des actualités
  const renderNewsItem = ({item}) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() => openLink(item.url)}>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsDate}>{formatDate(item.date)}</Text>
      <Text style={styles.newsContent}>{item.contents}</Text>
      <Text style={styles.newsLink}>Lire la suite</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement des actualités...</Text>
        </View>
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
              colors={['#66C0F4']}
              tintColor="#66C0F4"
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
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#444',
  },
  newsList: {
    padding: 16,
  },
  newsItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  newsDate: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  newsContent: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 22,
    marginBottom: 12,
  },
  newsLink: {
    color: '#66C0F4',
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});

export default GameDetailsScreen;
