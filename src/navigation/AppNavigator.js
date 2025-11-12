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
import ContactScreen from '../screens/ContactScreen';
import HomeScreen from '../screens/Home';
import LoginScreen from '../screens/LoginScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import { useTutorial } from '../tutorial/useTutorial';

const Stack = createStackNavigator();

const linking = {
  prefixes: [APP_CONFIG.APP_SCHEME, APP_CONFIG.STEAM_RETURN_URL],
  config: {
    screens: {
      Login: 'auth',
      Home: 'home',
      Settings: 'settings',
      Contact: 'contact',
      TermsOfService: 'terms',
      PrivacyPolicy: 'privacy',
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
          component={HomeScreen}
          options={SCREEN_CONFIGS.Home}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={SCREEN_CONFIGS.Settings}
        />
        <Stack.Screen
          name="Contact"
          component={ContactScreen}
          options={SCREEN_CONFIGS.Contact}
        />
        <Stack.Screen
          name="TermsOfService"
          component={TermsOfServiceScreen}
          options={SCREEN_CONFIGS.TermsOfService}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={SCREEN_CONFIGS.PrivacyPolicy}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
