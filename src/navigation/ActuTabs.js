import React, {useCallback, useEffect, useRef} from 'react';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {SafeAreaView} from 'react-native-safe-area-context';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useNewsManager} from '../hooks/useNewsManager';
import FollowedGamesScreen from '../screens/FollowedGamesScreen';
import NewsFeedScreen from '../screens/NewsFeedScreen';

const Tab = createMaterialTopTabNavigator();

const ActuTabs = () => {
  const {t} = useTranslation();
  const {steamId, registerNotificationSyncHandler} = useAppContext();
  const {
    newsState,
    fetchNews,
    isNewsInitialized,
    isNewsLoading,
    removeNewsByAppId,
    setFavoritesOnlyFilter,
    toggleNewsFavorite,
  } = useNewsManager(steamId);
  const followedGamesExternalHandlerRef = useRef(null);

  useFocusEffect(
    useCallback(() => {
      if (!isNewsInitialized && !isNewsLoading) {
        fetchNews();
      }
    }, [fetchNews, isNewsInitialized, isNewsLoading]),
  );

  useEffect(() => {
    if (typeof registerNotificationSyncHandler !== 'function') {
      return undefined;
    }

    const unregisterNews = registerNotificationSyncHandler('news', appId => {
      if (appId) {
        removeNewsByAppId(appId);
      }
    });

    const unregisterFollowed = registerNotificationSyncHandler(
      'followed',
      appId => {
        if (appId && followedGamesExternalHandlerRef.current) {
          followedGamesExternalHandlerRef.current(appId);
        }
      },
    );

    return () => {
      unregisterNews();
      unregisterFollowed();
    };
  }, [registerNotificationSyncHandler, removeNewsByAppId]);

  const registerFollowedGamesExternalHandler = useCallback(handler => {
    followedGamesExternalHandlerRef.current = handler;
    return () => {
      if (followedGamesExternalHandlerRef.current === handler) {
        followedGamesExternalHandlerRef.current = null;
      }
    };
  }, []);

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
        <Tab.Screen name="Fil" options={{title: t('nav.feed')}}>
          {() => (
            <NewsFeedScreen
              steamId={steamId}
              newsState={newsState}
              fetchNews={fetchNews}
              onToggleFavoritesFilter={setFavoritesOnlyFilter}
              onToggleNewsFavorite={toggleNewsFavorite}
            />
          )}
        </Tab.Screen>
        <Tab.Screen
          name="JeuxSuivis"
          options={{title: t('nav.followedGames')}}>
          {() => (
            <FollowedGamesScreen
              registerExternalUnfollowHandler={
                registerFollowedGamesExternalHandler
              }
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default ActuTabs;
