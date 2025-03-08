import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import React from 'react';

// Importation des écrans (à créer)
import GameDetailsScreen from '../screens/GameDetailsScreen';
import HomeScreen from '../screens/Home';
import LoginScreen from '../screens/LoginScreen';
import NewsDetailScreen from '../screens/NewsDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Création des navigateurs
const Stack = createStackNavigator();

// Configuration du thème de navigation
const navigatorTheme = {
  colors: {
    primary: '#1B2838', // Couleur Steam bleu foncé
    background: '#171A21', // Couleur de fond Steam
    card: '#1B2838',
    text: '#FFFFFF',
    border: '#2A475E',
    notification: '#66C0F4', // Bleu Steam clair
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
  },
};

// Navigateur principal
const AppNavigator = () => {
  return (
    <NavigationContainer theme={navigatorTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1B2838',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Connexion Steam',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Mes Jeux',
            headerBackVisible: false,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="GameDetails"
          component={GameDetailsScreen}
          options={({route}) => ({
            title: route.params?.gameName || 'Détails du jeu',
          })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Paramètres',
          }}
        />
        <Stack.Screen
          name="NewsDetail"
          component={NewsDetailScreen}
          options={({route}) => ({
            title: route.params?.title || 'Actualité',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
