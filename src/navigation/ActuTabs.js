import React, {useEffect} from 'react';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useNewsManager} from '../hooks/useNewsManager';
import FollowedGamesScreen from '../screens/FollowedGamesScreen';
import NewsFeedScreen from '../screens/NewsFeedScreen';

const Tab = createMaterialTopTabNavigator();

const ActuTabs = ({startupIntent = undefined}) => {
  const {t} = useTranslation();
  const {steamId, registerNotificationSyncHandler} = useAppContext();
  const initialRouteName =
    startupIntent?.screenName === 'JeuxSuivis' ? 'JeuxSuivis' : 'Fil';
  const followedGamesInitialParams =
    startupIntent?.screenName === 'JeuxSuivis'
      ? startupIntent.params
      : undefined;
  const {
    newsState,
    fetchNews,
    removeNewsByAppId,
    syncNewsFeedAfterFollowToggle,
    setFavoritesOnlyFilter,
    toggleNewsFavorite,
  } = useNewsManager(steamId);

  useEffect(() => {
    if (typeof registerNotificationSyncHandler !== 'function') {
      return undefined;
    }

    const unregisterNews = registerNotificationSyncHandler('news', appId => {
      if (appId) {
        removeNewsByAppId(appId);
      }
    });

    return () => {
      unregisterNews();
    };
  }, [registerNotificationSyncHandler, removeNewsByAppId]);

  return (
    <SafeAreaView style={localStyles.safeArea} edges={['top']}>
      <Tab.Navigator
        initialRouteName={initialRouteName}
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
        <Tab.Screen name="Fil" options={{title: t('nav.feed')}}>
          {() => (
            <NewsFeedScreen
              steamId={steamId}
              newsState={newsState}
              fetchNews={fetchNews}
              onToggleFavoritesFilter={setFavoritesOnlyFilter}
              onToggleNewsFavorite={toggleNewsFavorite}
              syncNewsFeedAfterFollowToggle={syncNewsFeedAfterFollowToggle}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="JeuxSuivis"
          initialParams={followedGamesInitialParams}
          options={{title: t('nav.followedGames')}}>
          {() => <FollowedGamesScreen />}
        </Tab.Screen>
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

export default ActuTabs;
