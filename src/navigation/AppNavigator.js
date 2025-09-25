import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';

// Importation des Ã©crans
import GameDetailsScreen from '../screens/GameDetailsScreen';
import HomeScreen from '../screens/Home';
import LoginScreen from '../screens/LoginScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Importation du thÃ¨me centralisÃ©
import {
  DEFAULT_SCREEN_OPTIONS,
  NAVIGATION_THEME,
  SCREEN_CONFIGS,
} from '../constants/theme';

// CrÃ©ation du navigateur
const Stack = createStackNavigator();

// Navigateur principal
const AppNavigator = () => {
  return (
    <NavigationContainer theme={NAVIGATION_THEME}>
      <Stack.Navigator
        initialRouteName="Login"
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
