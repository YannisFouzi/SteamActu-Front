import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {steamService, userService} from '../services/api';

const HomeScreen = ({navigation}) => {
  const [games, setGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [user, setUser] = useState(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const appState = useRef(AppState.currentState);
  const [appStateVisible, setAppStateVisible] = useState(appState.current);

  // États pour le filtrage et le tri
  const [searchQuery, setSearchQuery] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortOption, setSortOption] = useState('default'); // default, recent, mostPlayed

  // Charger les données au démarrage
  useEffect(() => {
    loadData();

    // Configurer la détection du changement d'état de l'application
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Lorsque l'app revient au premier plan après avoir été en arrière-plan
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        checkLastVerificationDate();
      }

      appState.current = nextAppState;
      setAppStateVisible(appState.current);
    });

    // Configurer une vérification périodique des nouveaux jeux (toutes les 10 minutes)
    const intervalId = setInterval(() => {
      if (appStateVisible === 'active' && steamId) {
        console.log('Vérification périodique des nouveaux jeux');
        checkForNewGames();
      }
    }, 600000); // 10 minutes

    return () => {
      // Nettoyer les abonnements lors du démontage
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [steamId, appStateVisible]);

  // Effet pour filtrer et trier les jeux quand les données changent
  useEffect(() => {
    filterAndSortGames();
  }, [games, searchQuery, sortOption]);

  // Fonction pour filtrer et trier les jeux
  const filterAndSortGames = () => {
    let result = [...games];

    // Filtrer par recherche
    if (searchQuery) {
      result = result.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // Trier selon l'option choisie
    switch (sortOption) {
      case 'recent':
        // Tri par temps de jeu récent (si disponible)
        result.sort(
          (a, b) => (b.playtime.recent || 0) - (a.playtime.recent || 0),
        );
        break;
      case 'mostPlayed':
        // Tri par temps de jeu total
        result.sort((a, b) => b.playtime.forever - a.playtime.forever);
        break;
      // Par défaut, ne pas trier (ordre d'origine)
    }

    setFilteredGames(result);
  };

  // Vérifier la dernière date de vérification complète
  const checkLastVerificationDate = async () => {
    try {
      // Récupérer la date de dernière vérification complète
      const savedVerificationDate = await AsyncStorage.getItem(
        'lastVerificationDate',
      );
      const currentDate = new Date();

      if (savedVerificationDate) {
        const lastVerificationDate = new Date(parseInt(savedVerificationDate));
        const diffTime = Math.abs(currentDate - lastVerificationDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        console.log(`Dernière vérification complète il y a ${diffDays} jours`);

        // Si la dernière vérification date de plus d'un jour, faire une vérification complète
        if (diffDays >= 1) {
          console.log("Plus d'un jour s'est écoulé, vérification complète...");
          loadData(true);
        } else {
          // Sinon, faire une vérification simple
          if (Date.now() - lastRefreshTime > 300000) {
            // Plus de 5 minutes
            checkForNewGames();
          }
        }
      } else {
        // Première utilisation, enregistrer la date actuelle
        await AsyncStorage.setItem(
          'lastVerificationDate',
          Date.now().toString(),
        );
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la date:', error);
    }
  };

  // Fonction pour charger les données
  const loadData = async (isFullCheck = false) => {
    try {
      if (!isFullCheck) {
        setLoading(true);
      }

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
      const newGames = gamesResponse.data;

      // Si c'est une vérification complète et que nous avions déjà des jeux,
      // vérifier s'il y a des nouveaux jeux
      if (isFullCheck && games.length > 0) {
        // Comparer avec les jeux actuels pour voir s'il y a des nouveautés
        if (newGames.length > games.length) {
          const currentAppIds = games.map(game => game.appId);
          const addedGames = newGames.filter(
            game => !currentAppIds.includes(game.appId),
          );

          if (addedGames.length > 0) {
            // Notifier l'utilisateur des nouveaux jeux
            Alert.alert(
              'Nouveaux jeux détectés',
              `${addedGames.length} nouveau(x) jeu(x) ont été ajoutés à votre bibliothèque pendant votre absence.`,
              [{text: 'OK'}],
            );
          }
        }
      }

      // Mettre à jour la liste des jeux
      setGames(newGames);
      setFilteredGames(newGames);

      // Mettre à jour la date de dernière vérification complète
      await AsyncStorage.setItem('lastVerificationDate', Date.now().toString());
      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      if (!isFullCheck) {
        Alert.alert(
          'Erreur',
          'Impossible de charger vos jeux. Veuillez réessayer.',
        );
      }
    } finally {
      if (!isFullCheck) {
        setLoading(false);
      }
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

  // Fonction pour afficher le temps de jeu formaté
  const formatPlaytime = minutes => {
    if (!minutes) return '0 heure';

    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} minutes`;
    return `${hours} heure${hours > 1 ? 's' : ''}`;
  };

  // Fonction pour vérifier les nouveaux jeux sans afficher l'indicateur de chargement
  const checkForNewGames = async () => {
    try {
      if (!steamId) return;

      console.log('Vérification des nouveaux jeux pour', steamId);
      const gamesResponse = await steamService.getUserGames(steamId);
      const newGames = gamesResponse.data;

      // Comparer avec les jeux actuels pour voir s'il y a des nouveautés
      if (newGames.length > games.length) {
        console.log(
          `${newGames.length - games.length} nouveaux jeux détectés!`,
        );

        // Trouver les nouveaux jeux
        const currentAppIds = games.map(game => game.appId);
        const addedGames = newGames.filter(
          game => !currentAppIds.includes(game.appId),
        );

        if (addedGames.length > 0) {
          // Notifier l'utilisateur
          Alert.alert(
            'Nouveaux jeux détectés',
            `${addedGames.length} nouveau(x) jeu(x) ont été ajoutés à votre bibliothèque.`,
            [{text: 'OK', onPress: () => setGames(newGames)}],
          );
        }
      }

      setLastRefreshTime(Date.now());
    } catch (error) {
      console.error('Erreur lors de la vérification des nouveaux jeux:', error);
    }
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
          Temps de jeu: {formatPlaytime(item.playtime.forever)}
        </Text>
        {item.playtime.recent > 0 && (
          <Text style={styles.gameRecentPlaytime}>
            Récent: {formatPlaytime(item.playtime.recent)}
          </Text>
        )}
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

  // Modal pour les options de tri
  const renderSortModal = () => (
    <Modal
      visible={sortModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSortModalVisible(false)}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setSortModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Trier par</Text>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'default' && styles.selectedSortOption,
            ]}
            onPress={() => {
              setSortOption('default');
              setSortModalVisible(false);
            }}>
            <Text style={styles.sortOptionText}>Par défaut</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'recent' && styles.selectedSortOption,
            ]}
            onPress={() => {
              setSortOption('recent');
              setSortModalVisible(false);
            }}>
            <Text style={styles.sortOptionText}>Joué récemment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sortOption,
              sortOption === 'mostPlayed' && styles.selectedSortOption,
            ]}
            onPress={() => {
              setSortOption('mostPlayed');
              setSortModalVisible(false);
            }}>
            <Text style={styles.sortOptionText}>Plus joué</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
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

      {/* Barre de recherche et filtres */}
      <View style={styles.filterContainer}>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un jeu..."
            placeholderTextColor="#8F98A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortModalVisible(true)}>
          <Text style={styles.sortButtonText}>Trier</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#66C0F4" />
          <Text style={styles.loadingText}>Chargement de vos jeux...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredGames}
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
                {searchQuery
                  ? `Aucun jeu ne correspond à "${searchQuery}"`
                  : 'Aucun jeu trouvé dans votre bibliothèque Steam.'}
              </Text>
            </View>
          }
        />
      )}

      {renderSortModal()}
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
  // Styles pour la recherche et le tri
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1B2838',
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F5A',
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#2A3F5A',
    borderRadius: 4,
    marginRight: 8,
  },
  searchInput: {
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  sortButton: {
    backgroundColor: '#2A3F5A',
    borderRadius: 4,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sortButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  // Styles pour le modal de tri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1B2838',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  selectedSortOption: {
    backgroundColor: '#2A3F5A',
  },
  sortOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  // Styles existants
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
  gameRecentPlaytime: {
    fontSize: 12,
    color: '#66C0F4',
    marginTop: 2,
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
