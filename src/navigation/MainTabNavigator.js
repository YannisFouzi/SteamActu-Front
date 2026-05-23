import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../constants';
import TutorialTarget from '../tutorial/TutorialTarget';
import AccountStack from './AccountStack';
import ActuTabs from './ActuTabs';
import FollowTabs from './FollowTabs';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Actu: 'newspaper-outline',
  SuivreUnJeu: 'game-controller-outline',
  MonCompte: 'person-circle-outline',
};

const TabBarButton = props => (
  <Pressable
    {...props}
    android_ripple={{color: 'rgba(102, 192, 244, 0.12)', borderless: false}}
  />
);

const createScreenOptions = ({route}) => ({
  headerShown: false,
  lazy: true,
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
  // Encadrable par le tutoriel (cible `tab-<RouteName>`).
  tabBarButton: props => (
    <TutorialTarget id={`tab-${route.name}`} style={styles.tabButton}>
      <TabBarButton {...props} />
    </TutorialTarget>
  ),
});

const MainTabNavigator = ({startupIntent = undefined}) => {
  const {t} = useTranslation();
  const initialRouteName =
    startupIntent?.tabName === 'Actu' ? 'Actu' : undefined;

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={createScreenOptions}>
      <Tab.Screen name="Actu" options={{title: t('nav.news')}}>
        {() => <ActuTabs startupIntent={startupIntent} />}
      </Tab.Screen>
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

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
  },
});

export default MainTabNavigator;
