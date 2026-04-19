import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import ContactScreen from '../screens/ContactScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import {DEFAULT_STACK_SCREEN_OPTIONS} from './options';

const Stack = createStackNavigator();

const AccountStack = () => {
  const {t} = useTranslation();

  return (
    <Stack.Navigator screenOptions={DEFAULT_STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{title: t('nav.account')}}
      />
      <Stack.Screen
        name="Contact"
        component={ContactScreen}
        options={{title: t('nav.contact')}}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{title: t('nav.termsOfService')}}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{title: t('nav.privacyPolicy')}}
      />
    </Stack.Navigator>
  );
};

export default AccountStack;
