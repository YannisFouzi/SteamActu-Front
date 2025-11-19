import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { DEFAULT_SCREEN_OPTIONS, SCREEN_CONFIGS } from '../constants';
import ContactScreen from '../screens/ContactScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';

const Stack = createStackNavigator();

const AccountStack = () => {
  return (
    <Stack.Navigator screenOptions={DEFAULT_SCREEN_OPTIONS}>
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
  );
};

export default AccountStack;
