import React, { useCallback, useEffect } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { useWishlist } from '../hooks/useWishlist';
import MyGamesScreen from '../screens/MyGamesScreen';
import SearchGamesScreen from '../screens/SearchGamesScreen';
import WishlistScreen from '../screens/WishlistScreen';

const Tab = createMaterialTopTabNavigator();

const FollowTabs = () => {
  const {steamId, registerNotificationSyncHandler} = useAppContext();

  const {
    wishlist,
    loading,
    refreshing,
    fetchWishlist,
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
    fetchWishlist,
    handleRefresh,
    filterWishlist,
    updateWishlistFollowState,
    removeWishlistEntry,
    maybeRefreshWishlist,
  };

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.STEAM_NAVY}} edges={['top']}>
      <Tab.Navigator
        screenOptions={{
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
          options={{title: 'Mes jeux'}}
        />
        <Tab.Screen
          name="Wishlist"
          options={{title: 'Wishlist'}}>
          {() => <WishlistScreen {...wishlistProps} />}
        </Tab.Screen>
        <Tab.Screen
          name="Rechercher"
          component={SearchGamesScreen}
          options={{title: 'Rechercher'}}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default FollowTabs;
