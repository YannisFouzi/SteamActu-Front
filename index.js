/**
 * @format
 */

import { AppRegistry } from 'react-native';
import 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {displayRemoteNotification} from './src/services/notificationService';
import { name as appName } from './app.json';

// ⚠️ IMPORTANT: Background Message Handler DOIT être défini ICI, au top-level
// Avant AppRegistry.registerComponent
// C'est obligatoire pour que les notifications en background fonctionnent sur Android/iOS
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message reçu en background:', remoteMessage);
  await displayRemoteNotification(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
