import React, {useEffect} from 'react';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useWishlist} from '../hooks/useWishlist';
import MyGamesScreen from '../screens/MyGamesScreen';
import SearchGamesScreen from '../screens/SearchGamesScreen';
import WishlistScreen from '../screens/WishlistScreen';

const Tab = createMaterialTopTabNavigator();

const FollowTabs = () => {
  const {t} = useTranslation();
  const {steamId, registerNotificationSyncHandler} = useAppContext();

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
    filterWishlist,
    updateWishlistFollowState,
    maybeRefreshWishlist,
  };

  return (
    <SafeAreaView style={localStyles.safeArea} edges={['top']}>
      <Tab.Navigator
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
        <Tab.Screen
          name="Rechercher"
          component={SearchGamesScreen}
          options={{title: t('nav.search')}}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
});

export default FollowTabs;
