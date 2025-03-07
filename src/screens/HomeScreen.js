import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {steamService, userService} from '../services/api';

const HomeScreen = ({navigation}) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);

  // Charger les données au démarrage
  useEffect(() => {
    loadData();
  }, []);

  // Fonction pour charger les données
  const loadData = async () => {
    try {
      setLoading(true);

      // Récupérer le SteamID stocké
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        // Si pas de SteamID, retourner à l'écran de connexion
        navigation.replace('Login');
        return;
      }

      setSteamId(savedSteamId);

      // Récupérer les informations de l'utilisateur
      const userResponse = await userService.getUser(savedSteamId);
      setUser(userResponse.data);

      // Récupérer les jeux de l'utilisateur
      const gamesResponse = await steamService.getUserGames(savedSteamId);
      setGames(gamesResponse.data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos jeux. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fonction pour rafraîchir les données
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('steamId');
      navigation.replace('Login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Fonction pour suivre un jeu (recevoir des notifications)
  const followGame = async game => {
    try {
      // Vérifier si l'utilisateur a déjà des jeux suivis
      const followedGames = user.followedGames || [];

      // Vérifier si le jeu est déjà suivi
      const isFollowed = followedGames.some(g => g.appId === game.appId);

      let updatedGames;

      if (isFollowed) {
        // Retirer le jeu de la liste des jeux suivis
        updatedGames = followedGames.filter(g => g.appId !== game.appId);
      } else {
        // Ajouter le jeu à la liste des jeux suivis
        updatedGames = [
          ...followedGames,
          {
            appId: game.appId,
            name: game.name,
            logoUrl: game.logoUrl,
          },
        ];
      }

      // Mettre à jour sur le serveur
      const response = await userService.updateGames(steamId, updatedGames);

      // Mettre à jour l'utilisateur localement
      setUser(response.data);

      Alert.alert(
        'Succès',
        isFollowed
          ? `Vous ne suivez plus les actualités de ${game.name}`
          : `Vous suivez maintenant les actualités de ${game.name}`,
      );
    } catch (error) {
      console.error('Erreur lors du suivi du jeu:', error);
      Alert.alert(
        'Erreur',
        'Impossible de mettre à jour vos préférences. Veuillez réessayer.',
      );
    }
  };

  // Fonction pour afficher si un jeu est suivi
  const isGameFollowed = appId => {
    if (!user || !user.followedGames) return false;
    return user.followedGames.some(game => game.appId === appId);
  };

  // Rendu d'un élément de jeu
  const renderGameItem = ({item}) => (
    <TouchableOpacity
      style={styles.gameItem}
      onPress={() =>
        navigation.navigate('GameDetails', {
          gameId: item.appId,
          gameName: item.name,
        })
      }>
      <Image
        source={{
          uri:
            item.logoUrl ||
            'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/0/0_capsule_184x69.jpg',
        }}
        style={styles.gameImage}
        resizeMode="cover"
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName}>{item.name}</Text>
        <Text style={styles.gamePlaytime}>
          Temps de jeu: {Math.floor(item.playtime.forever / 60)} heures
        </Text>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          isGameFollowed(item.appId) ? styles.followedButton : {},
        ]}
        onPress={() => followGame(item)}>
        <Text style={styles.followButtonText}>
          {isGameFollowed(item.appId) ? 'Suivi' : 'Suivre'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#171A21" barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Mes Jeux Steam</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsButtonText}>Paramètres</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement de vos jeux...</Text>
        </View>
      ) : (
        <FlatList
          data={games}
          renderItem={renderGameItem}
          keyExtractor={item => item.appId}
          contentContainerStyle={styles.gamesList}
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
                Aucun jeu trouvé dans votre bibliothèque Steam.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F5A',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  settingsButton: {
    backgroundColor: '#2A3F5A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#c62828',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  gamesList: {
    padding: 12,
  },
  gameItem: {
    flexDirection: 'row',
    backgroundColor: '#2A3F5A',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  gameImage: {
    width: 100,
    height: 60,
  },
  gameInfo: {
    flex: 1,
    padding: 12,
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gamePlaytime: {
    fontSize: 14,
    color: '#8F98A0',
  },
  followButton: {
    backgroundColor: '#66C0F4',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
  },
  followedButton: {
    backgroundColor: '#4CAF50',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
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

export default HomeScreen;
