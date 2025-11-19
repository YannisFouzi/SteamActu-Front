import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants';
import ActuTabs from './ActuTabs';
import FollowTabs from './FollowTabs';
import AccountStack from './AccountStack';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Actu: 'newspaper-outline',
  SuivreUnJeu: 'game-controller-outline',
  MonCompte: 'person-circle-outline',
};

const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.STEAM_BLUE,
        tabBarInactiveTintColor: COLORS.STEAM_TEXT_GRAY,
        tabBarStyle: {
          backgroundColor: COLORS.STEAM_NAVY,
          borderTopColor: COLORS.STEAM_BORDER,
        },
        tabBarIcon: ({color, size}) => {
          const iconName = TAB_ICONS[route.name] || 'ellipse-outline';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}>
      <Tab.Screen
        name="Actu"
        component={ActuTabs}
        options={{title: 'Actu'}}
      />
      <Tab.Screen
        name="SuivreUnJeu"
        component={FollowTabs}
        options={{title: 'Suivre un jeu'}}
      />
      <Tab.Screen
        name="MonCompte"
        component={AccountStack}
        options={{title: 'Mon compte'}}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
