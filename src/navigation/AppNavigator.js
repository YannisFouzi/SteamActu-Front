import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';
import BootSplash from 'react-native-bootsplash';
import {APP_CONFIG} from '../config/env';
import {NAVIGATION_THEME} from '../constants';
import {useAppContext} from '../context/AppContext';
import {debugError} from '../hooks/hooksLogger';
import LoginScreen from '../screens/LoginScreen';
import StartupScreen from '../screens/StartupScreen';
import {useTutorial} from '../tutorial/useTutorial';
import {
  DEFAULT_STACK_SCREEN_OPTIONS,
  ROOT_STACK_SCREEN_OPTIONS,
} from './options';
import MainTabNavigator from './MainTabNavigator';

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
  const {isBootstrapping, isAuthenticated, user} = useAppContext();
  const navigationRef = useNavigationContainerRef();
  const navigationReadyRef = React.useRef(false);
  const {registerNavigationRef, startTutorialIfNeeded, state: tutorialState} =
    useTutorial();
  const navigatorKey = isBootstrapping
    ? 'bootstrap-stack'
    : isAuthenticated
    ? 'auth-stack'
    : 'guest-stack';

  const hideBootSplashIfReady = React.useCallback(async () => {
    if (!navigationReadyRef.current || isBootstrapping) {
      return;
    }

    try {
      await BootSplash.hide({fade: true});
    } catch (error) {
      debugError('[BOOTSTRAP] Erreur lors du masquage du splash natif:', error);
    }
  }, [isBootstrapping]);

  React.useEffect(() => {
    registerNavigationRef(navigationRef);
  }, [navigationRef, registerNavigationRef]);

  React.useEffect(() => {
    if (isAuthenticated && user && tutorialState.status !== 'running') {
      startTutorialIfNeeded();
    }
  }, [isAuthenticated, startTutorialIfNeeded, tutorialState.status, user]);

  React.useEffect(() => {
    hideBootSplashIfReady();
  }, [hideBootSplashIfReady]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={NAVIGATION_THEME}
      linking={linking}
      onReady={() => {
        navigationReadyRef.current = true;
        hideBootSplashIfReady();
      }}>
      <Stack.Navigator
        key={navigatorKey}
        screenOptions={DEFAULT_STACK_SCREEN_OPTIONS}>
        {isBootstrapping ? (
          <Stack.Screen
            name="Startup"
            component={StartupScreen}
            options={ROOT_STACK_SCREEN_OPTIONS.startup}
          />
        ) : isAuthenticated ? (
          <Stack.Screen
            name="Home"
            component={MainTabNavigator}
            options={ROOT_STACK_SCREEN_OPTIONS.home}
          />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={ROOT_STACK_SCREEN_OPTIONS.login}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
