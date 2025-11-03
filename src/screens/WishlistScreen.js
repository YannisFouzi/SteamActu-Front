import {useNavigation} from '@react-navigation/native';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants/theme';
import {useAppContext} from '../context/AppContext';
import {useWishlist} from '../hooks/useWishlist';

const WishlistScreen = () => {
  const navigation = useNavigation();
  const {steamId} = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    wishlist,
    loading,
    refreshing,
    error,
    fetchWishlist,
    handleRefresh,
    filterWishlist,
    wishlistStats,
  } = useWishlist(steamId);

  // Charger la wishlist au montage
  useEffect(() => {
    if (steamId) {
      fetchWishlist();
    }
  }, [steamId, fetchWishlist]);

  // Filtrer la wishlist selon la recherche
  const filteredWishlist = searchQuery
    ? filterWishlist(searchQuery)
    : wishlist;

  const stats = wishlistStats();

  // Rendu d'un jeu de la wishlist
  const renderWishlistItem = ({item}) => (
    <TouchableOpacity
      style={styles.gameCard}
      onPress={() =>
        navigation.navigate('GameDetails', {
          appId: item.appid.toString(),
          gameName: item.name,
        })
      }>
      <Image
        source={{uri: item.header_image || item.capsule}}
        style={styles.gameImage}
        resizeMode="cover"
      />
      <View style={styles.gameInfo}>
        <Text style={styles.gameName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.release_string && (
          <Text style={styles.gameRelease}>{item.release_string}</Text>
        )}
        {item.review_desc && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewText}>
              {item.review_desc} ({item.reviews_percent}%)
            </Text>
          </View>
        )}
        <Text style={styles.dateAdded}>
          Ajouté le {new Date(item.date_added * 1000).toLocaleDateString('fr-FR')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // État de chargement initial
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Wishlist</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.STEAM_BLUE} />
          <Text style={styles.loadingText}>Chargement de la wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // État d'erreur
  if (error && !loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Wishlist</Text>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchWishlist()}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist</Text>
      </View>

      {/* Statistiques */}
      {stats.total > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {stats.total} jeu{stats.total > 1 ? 'x' : ''}
            {stats.recentlyAdded > 0 &&
              ` · ${stats.recentlyAdded} récent${stats.recentlyAdded > 1 ? 's' : ''}`}
          </Text>
        </View>
      )}

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un jeu..."
          placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des jeux */}
      {filteredWishlist.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {searchQuery
              ? 'Aucun jeu trouvé'
              : 'Votre wishlist est vide\n\nAjoutez des jeux sur Steam pour les voir ici'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredWishlist}
          renderItem={renderWishlistItem}
          keyExtractor={item => item.appid.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.STEAM_BLUE}
              colors={[COLORS.STEAM_BLUE]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.STEAM_NAVY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.STEAM_BLUE,
    fontWeight: '600',
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 22,
  },
  statsContainer: {
    padding: 12,
    backgroundColor: COLORS.STEAM_NAVY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  statsText: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.STEAM_NAVY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    paddingHorizontal: 12,
    color: COLORS.WHITE,
    fontSize: 14,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  listContent: {
    padding: 12,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  gameImage: {
    width: 120,
    height: 90,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  gameInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  gameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  gameRelease: {
    fontSize: 12,
    color: COLORS.STEAM_TEXT_GRAY,
    marginBottom: 4,
  },
  reviewContainer: {
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 11,
    color: COLORS.STEAM_BLUE,
  },
  dateAdded: {
    fontSize: 11,
    color: COLORS.STEAM_TEXT_GRAY,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    ...TEXT_STYLES.loadingText,
    marginTop: 16,
  },
  emptyText: {
    ...TEXT_STYLES.emptyText,
    fontSize: 18,
    lineHeight: 28,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.ERROR,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.STEAM_BLUE,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WishlistScreen;

