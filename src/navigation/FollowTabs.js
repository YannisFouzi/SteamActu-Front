import React, {useEffect} from 'react';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
} from '@react-navigation/material-top-tabs';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import GlobalSearchBar from '../components/GlobalSearchBar';
import {COLORS} from '../constants';
import TutorialTarget from '../tutorial/TutorialTarget';
import {useAppContext} from '../context/AppContext';
import {useWishlist} from '../hooks/useWishlist';
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
});

export default FollowTabs;
