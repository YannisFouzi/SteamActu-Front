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
import UpdateRequiredScreen from '../screens/UpdateRequiredScreen';
import {checkAppVersion} from '../services/versionService';
import {
  consumeNavigationInitialNotification,
  isInitialNotificationBootstrapResolved,
  subscribeInitialNotificationBootstrap,
} from '../services/initialNotificationStore';
import {extractNotificationPayload} from '../services/notifications/helpers';
import {
  registerNavigationRef as registerGlobalNavigationRef,
  unregisterNavigationRef as unregisterGlobalNavigationRef,
} from '../services/navigationService';
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
              AdminStats: 'admin',
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

const buildStartupIntent = followPromptData => {
  const params = {initialSort: 'recent'};

  if (followPromptData?.gameName) {
    params.confirmedGameName = String(followPromptData.gameName);
  }

  return {
    tabName: 'Actu',
    screenName: 'JeuxSuivis',
    params,
  };
};

const extractStartupIntentFromNotification = notification => {
  if (!notification) {
    return undefined;
  }

  if (notification.source === 'firebase') {
    const payload = extractNotificationPayload(notification.data);
    return payload?.type === 'follow_prompt'
      ? buildStartupIntent(payload.data)
      : undefined;
  }

  if (notification.source === 'notifee') {
    const candidate = notification.data?.notification?.data;
    return candidate?.type === 'follow_prompt'
      ? buildStartupIntent(candidate)
      : undefined;
  }

  if (notification.source === 'follow_prompt_action') {
    return buildStartupIntent({
      appId: notification.data?.appId,
      gameName: notification.data?.gameName,
    });
  }

  return undefined;
};

const AppNavigator = () => {
  const {isBootstrapping, isAuthenticated, user} = useAppContext();
  const navigationRef = useNavigationContainerRef();
  const navigationReadyRef = React.useRef(false);
  const [initialNotificationResolved, setInitialNotificationResolved] =
    React.useState(isInitialNotificationBootstrapResolved());
  const [startupIntent, setStartupIntent] = React.useState(null);
  // Version gate : 'checking' au boot, 'ok' une fois validee (ou fail-open en cas
  // d'erreur reseau), 'outdated' si backend repond minSupportedVersion > APP_VERSION.
  // Skip en dev pour ne pas embeter le workflow local. Fail-open dans versionService.
  const [versionStatus, setVersionStatus] = React.useState(
    __DEV__ ? 'ok' : 'checking',
  );
  const [versionUpdateUrl, setVersionUpdateUrl] = React.useState(null);
  const {registerNavigationRef, startTutorialIfNeeded, state: tutorialState} =
    useTutorial();
  const navigatorKey = isAuthenticated ? 'auth-stack' : 'guest-stack';

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
    registerGlobalNavigationRef(navigationRef);
    return () => unregisterGlobalNavigationRef(navigationRef);
  }, [navigationRef]);

  React.useEffect(() => {
    if (isAuthenticated && user && tutorialState.status !== 'running') {
      startTutorialIfNeeded();
    }
  }, [isAuthenticated, startTutorialIfNeeded, tutorialState.status, user]);

  React.useEffect(() => {
    hideBootSplashIfReady();
  }, [hideBootSplashIfReady]);

  React.useEffect(() => {
    return subscribeInitialNotificationBootstrap(setInitialNotificationResolved);
  }, []);

  React.useEffect(() => {
    if (__DEV__) {
      return undefined;
    }
    let mounted = true;
    checkAppVersion().then(result => {
      if (!mounted) {
        return;
      }
      setVersionStatus(result.status);
      setVersionUpdateUrl(result.updateUrl);
    });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!initialNotificationResolved) {
      return;
    }

    const notification = consumeNavigationInitialNotification();
    setStartupIntent(
      extractStartupIntentFromNotification(notification) || undefined,
    );
  }, [initialNotificationResolved]);

  if (versionStatus === 'outdated') {
    return <UpdateRequiredScreen updateUrl={versionUpdateUrl} />;
  }

  if (
    versionStatus === 'checking' ||
    isBootstrapping ||
    !initialNotificationResolved ||
    startupIntent === null
  ) {
    return <StartupScreen />;
  }

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
        {isAuthenticated ? (
          <Stack.Screen name="Home" options={ROOT_STACK_SCREEN_OPTIONS.home}>
            {() => <MainTabNavigator startupIntent={startupIntent} />}
          </Stack.Screen>
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
