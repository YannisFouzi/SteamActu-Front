import {deleteToken, getToken} from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {userService} from '../api';
import {ensureNotificationPermission} from './presentation';
import {messagingInstance} from './runtime';

export async function registerFCMToken(steamId) {
  try {
    if (!steamId) {
      debugError('[FCM] Steam ID manquant, enregistrement ignore');
      return {success: false, status: 'missing-steamid'};
    }

    const permission = await ensureNotificationPermission();
    if (!permission.granted) {
      debugLog(`[FCM] Permission non accordee (status=${permission.status})`);
      return {success: false, status: permission.status};
    }

    const token = await getToken(messagingInstance);
    const platform = Platform.OS;

    debugLog('[FCM] Token obtenu:', `${token.substring(0, 20)}...`);
    await userService.registerFCMToken(steamId, token, platform);
    debugLog('[FCM] Token enregistre avec succes');

    return {success: true, status: 'authorized'};
  } catch (error) {
    debugError('[FCM] Erreur enregistrement token:', error);
    return {success: false, status: 'error'};
  }
}

export async function unregisterFCMToken(steamId) {
  try {
    if (!steamId) {
      debugError('[FCM] Steam ID manquant, suppression token ignoree');
      return false;
    }

    const token = await getToken(messagingInstance);

    if (token) {
      await userService.unregisterFCMToken(steamId, token);
    }

    await deleteToken(messagingInstance);
    debugLog('[FCM] Token supprime du backend');
    return true;
  } catch (error) {
    debugError('[FCM] Erreur suppression token:', error);
    return false;
  }
}
