import React, {useEffect, useState} from 'react';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
} from '@react-navigation/material-top-tabs';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GlobalSearchBar from '../components/GlobalSearchBar';
import {COLORS} from '../constants';
import TutorialTarget from '../tutorial/TutorialTarget';
import {useAppContext} from '../context/AppContext';
import {useAdminAccess} from '../hooks/useAdminAccess';
import {showErrorMessage, showSuccessMessage} from '../hooks/hooksLogger';
import {useWishlist} from '../hooks/useWishlist';
import {adminService} from '../services/api';
import MyGamesScreen from '../screens/MyGamesScreen';
import UnifiedSearchView from '../screens/UnifiedSearchView';
import WishlistScreen from '../screens/WishlistScreen';

const Tab = createMaterialTopTabNavigator();

// Barre d'onglets encadrable par le tutoriel (cible `topbar-follow`).
const FollowTopTabBar = props => (
  <TutorialTarget id="topbar-follow">
    <MaterialTopTabBar {...props} />
  </TutorialTarget>
);

const FollowTabs = () => {
  const {t} = useTranslation();
  const {steamId, registerNotificationSyncHandler, searchQuery} =
    useAppContext();

  const {
    wishlist,
    loading,
    refreshing,
    handleRefresh,
    filterWishlist,
    updateWishlistFollowState,
    removeWishlistEntry,
    maybeRefreshWishlist,
  } = useWishlist(steamId);

  useEffect(() => {
    if (typeof registerNotificationSyncHandler !== 'function') {
      return undefined;
    }

    const unregisterWishlist = registerNotificationSyncHandler(
      'wishlist',
      appId => {
        if (appId) {
          removeWishlistEntry(appId);
        }
      },
    );

    return () => {
      unregisterWishlist();
    };
  }, [registerNotificationSyncHandler, removeWishlistEntry]);

  const wishlistProps = {
    wishlist,
    loading,
    refreshing,
    handleRefresh,
    updateWishlistFollowState,
    maybeRefreshWishlist,
  };

  // Admin-only: manual re-scan (library + Steam Family + wishlist), the on-demand
  // equivalent of the daily cron. Visible only when the SteamID is in the admin
  // allowlist (server-checked via useAdminAccess).
  const isAdmin = useAdminAccess();
  const [adminRefreshing, setAdminRefreshing] = useState(false);

  const handleAdminRefresh = async () => {
    if (adminRefreshing) {
      return;
    }
    setAdminRefreshing(true);
    try {
      await adminService.refreshAccount();
      showSuccessMessage(
        'Scan terminé',
        'Bibliothèque, Steam Famille et wishlist resynchronisées.',
      );
      // Reflect the wishlist changes right away; library refreshes on next load.
      handleRefresh?.();
    } catch (error) {
      showErrorMessage(
        'Échec du scan',
        error?.message || 'Réessaie dans un instant.',
      );
    } finally {
      setAdminRefreshing(false);
    }
  };

  const isSearching = (searchQuery || '').trim().length > 0;

  return (
    <SafeAreaView style={localStyles.safeArea} edges={['top']}>
      <TutorialTarget id="search-bar">
        <GlobalSearchBar />
      </TutorialTarget>
      {isSearching ? (
        <View style={localStyles.unifiedContainer}>
          <UnifiedSearchView
            wishlist={wishlist}
            filterWishlist={filterWishlist}
            onWishlistFollowToggle={updateWishlistFollowState}
          />
        </View>
      ) : (
        <>
          {isAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rescan bibliothèque et wishlist"
              style={localStyles.adminRefreshButton}
              onPress={handleAdminRefresh}
              disabled={adminRefreshing}>
              {adminRefreshing ? (
                <ActivityIndicator size="small" color={COLORS.WHITE} />
              ) : (
                <Ionicons name="refresh" size={16} color={COLORS.WHITE} />
              )}
              <Text style={localStyles.adminRefreshText}>
                {adminRefreshing
                  ? 'Scan en cours…'
                  : 'Rescan biblio + Famille + wishlist'}
              </Text>
            </Pressable>
          )}
          <Tab.Navigator
            tabBar={FollowTopTabBar}
          screenOptions={{
            lazy: true,
            tabBarIndicatorStyle: {backgroundColor: COLORS.STEAM_BLUE},
            tabBarActiveTintColor: COLORS.WHITE,
            tabBarInactiveTintColor: COLORS.STEAM_TEXT_GRAY,
            tabBarStyle: {
              backgroundColor: COLORS.STEAM_NAVY,
              borderBottomColor: COLORS.STEAM_BORDER,
            },
          }}>
          <Tab.Screen
            name="MesJeux"
            component={MyGamesScreen}
            options={{title: t('nav.myGames')}}
          />
          <Tab.Screen name="Wishlist" options={{title: t('nav.wishlist')}}>
            {() => <WishlistScreen {...wishlistProps} />}
          </Tab.Screen>
          </Tab.Navigator>
        </>
      )}
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  unifiedContainer: {
    flex: 1,
  },
  adminRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.STEAM_BLUE,
  },
  adminRefreshText: {
    color: COLORS.WHITE,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FollowTabs;
