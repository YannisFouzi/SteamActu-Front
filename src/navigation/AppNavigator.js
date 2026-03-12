import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { APP_CONFIG } from '../config/env';
import {
  DEFAULT_SCREEN_OPTIONS,
  NAVIGATION_THEME,
  SCREEN_CONFIGS,
} from '../constants';
import { useAppContext } from '../context/AppContext';
import MainTabNavigator from './MainTabNavigator';
import LoginScreen from '../screens/LoginScreen';
import { useTutorial } from '../tutorial/useTutorial';

const Stack = createStackNavigator();

const linking = {
  prefixes: [APP_CONFIG.APP_SCHEME],
  config: {
    screens: {
      Login: 'auth',
      Home: {
        path: 'home',
        screens: {
          Actu: {
            path: 'actu',
            screens: {
              Fil: 'fil',
              JeuxSuivis: 'jeux-suivis',
            },
          },
          SuivreUnJeu: {
            path: 'suivre',
            screens: {
              MesJeux: 'mes-jeux',
              Wishlist: 'wishlist',
              Rechercher: 'rechercher',
            },
          },
          MonCompte: {
            path: 'compte',
            screens: {
              Settings: 'settings',
              Contact: 'contact',
              TermsOfService: 'terms',
              PrivacyPolicy: 'privacy',
            },
          },
        },
      },
    },
  },
};

const AppNavigator = () => {
  const {steamId, user} = useAppContext();
  const navigationRef = useNavigationContainerRef();
  const {registerNavigationRef, startTutorialIfNeeded, state: tutorialState} =
    useTutorial();
  const isAuthenticated = Boolean(steamId && user);
  const navigatorKey = isAuthenticated ? 'auth-stack' : 'guest-stack';
  const initialRouteName = isAuthenticated ? 'Home' : 'Login';

  React.useEffect(() => {
    registerNavigationRef(navigationRef);
  }, [navigationRef, registerNavigationRef]);

  React.useEffect(() => {
    if (isAuthenticated && tutorialState.status !== 'running') {
      startTutorialIfNeeded();
    }
  }, [isAuthenticated, startTutorialIfNeeded, tutorialState.status]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={NAVIGATION_THEME}
      linking={linking}>
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
          component={MainTabNavigator}
          options={SCREEN_CONFIGS.Home}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
