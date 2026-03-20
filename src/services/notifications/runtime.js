import {getApp} from '@react-native-firebase/app';
import {getMessaging} from '@react-native-firebase/messaging';

let appInstance;
let messagingInstanceValue;

try {
  appInstance = getApp();
  messagingInstanceValue = getMessaging(appInstance);
} catch (error) {
  console.error('[FCM] Erreur initialisation Firebase:', error?.message || error);
}

export const messagingInstance = messagingInstanceValue;
export const processedNotificationIds = new Set();
export const backgroundEventHandlers = new Set();

let androidChannelLanguage = null;
let iosCategoriesLanguage = null;

export const getAndroidChannelLanguage = () => androidChannelLanguage;
export const setAndroidChannelLanguage = language => {
  androidChannelLanguage = language;
};

export const getIosCategoriesLanguage = () => iosCategoriesLanguage;
export const setIosCategoriesLanguage = language => {
  iosCategoriesLanguage = language;
};
