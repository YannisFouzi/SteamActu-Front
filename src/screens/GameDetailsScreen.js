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
  const {gameId, gameName} = route.params;
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les actualités au démarrage
  useEffect(() => {
    loadNews();
  }, []);

  // Fonction pour charger les actualités d'un jeu
  const loadNews = async () => {
    try {
      setLoading(true);

      // Récupérer les actualités
      const response = await newsService.getGameNews(gameId, 10, 500);
      setNews(response.data);
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

  // Fonction pour formater la date
  const formatDate = timestamp => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Fonction pour ouvrir le lien d'une actualité
  const openNewsLink = url => {
    Linking.openURL(url).catch(err => {
      console.error("Erreur lors de l'ouverture du lien:", err);
      Alert.alert('Erreur', "Impossible d'ouvrir ce lien");
    });
  };

  // Affichage d'une actualité
  const renderNewsItem = ({item}) => (
    <TouchableOpacity
      style={styles.newsItem}
      onPress={() =>
        navigation.navigate('NewsDetail', {
          title: item.title,
          content: item.contents,
          url: item.url,
          date: item.date,
        })
      }>
      <Text style={styles.newsDate}>{formatDate(item.date)}</Text>
      <Text style={styles.newsTitle}>{item.title}</Text>
      <Text style={styles.newsContent} numberOfLines={3}>
        {item.contents.replace(/<[^>]*>?/gm, '')}
      </Text>
      <TouchableOpacity
        style={styles.readMoreButton}
        onPress={() => openNewsLink(item.url)}>
        <Text style={styles.readMoreText}>Lire sur Steam</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement des actualités...</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={item => item.gid}
          contentContainerStyle={styles.newsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#66C0F4']}
              tintColor="#66C0F4"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Aucune actualité récente trouvée pour ce jeu.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171A21',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F5A',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8F98A0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8F98A0',
  },
  newsList: {
    padding: 12,
  },
  newsItem: {
    backgroundColor: '#2A3F5A',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  newsDate: {
    fontSize: 12,
    color: '#66C0F4',
    marginBottom: 4,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  newsContent: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 12,
    lineHeight: 20,
  },
  readMoreButton: {
    alignSelf: 'flex-end',
  },
  readMoreText: {
    color: '#66C0F4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8F98A0',
    textAlign: 'center',
  },
});

export default GameDetailsScreen;
