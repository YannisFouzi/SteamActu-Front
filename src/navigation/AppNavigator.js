import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import {useAppContext} from '../context/AppContext';
import {APP_CONFIG} from '../config/env';
import GameDetailsScreen from '../screens/GameDetailsScreen';
import HomeScreen from '../screens/Home';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {
  DEFAULT_SCREEN_OPTIONS,
  NAVIGATION_THEME,
  SCREEN_CONFIGS,
} from '../constants';

const Stack = createStackNavigator();

const linking = {
  prefixes: [APP_CONFIG.APP_SCHEME, APP_CONFIG.STEAM_RETURN_URL],
  config: {
    screens: {
      Login: 'auth',
      Home: 'home',
      GameDetails: 'game/:gameId?',
      Settings: 'settings',
    },
  },
};

const AppNavigator = () => {
  const {steamId, user} = useAppContext();
  const isAuthenticated = Boolean(steamId && user);
  const navigatorKey = isAuthenticated ? 'auth-stack' : 'guest-stack';
  const initialRouteName = isAuthenticated ? 'Home' : 'Login';

  return (
    <NavigationContainer theme={NAVIGATION_THEME} linking={linking}>
      <Stack.Navigator
        key={navigatorKey}
        initialRouteName={initialRouteName}
        screenOptions={DEFAULT_SCREEN_OPTIONS}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={SCREEN_CONFIGS.Login}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={SCREEN_CONFIGS.Home}
        />
        <Stack.Screen
          name="GameDetails"
          component={GameDetailsScreen}
          options={SCREEN_CONFIGS.GameDetails.getDynamicOptions}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={SCREEN_CONFIGS.Settings}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
