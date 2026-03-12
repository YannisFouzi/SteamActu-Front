import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../constants';
import AccountStack from './AccountStack';
import ActuTabs from './ActuTabs';
import FollowTabs from './FollowTabs';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Actu: 'newspaper-outline',
  SuivreUnJeu: 'game-controller-outline',
  MonCompte: 'person-circle-outline',
};

const MainTabNavigator = () => {
  const {t} = useTranslation();

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
        options={{title: t('nav.news')}}
      />
      <Tab.Screen
        name="SuivreUnJeu"
        component={FollowTabs}
        options={{title: t('nav.followGame')}}
      />
      <Tab.Screen
        name="MonCompte"
        component={AccountStack}
        options={{title: t('nav.account')}}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
