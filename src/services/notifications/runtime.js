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
const MAX_PROCESSED_IDS = 100;
const _processedNotificationIds = new Set();

export const processedNotificationIds = {
  has(id) { return _processedNotificationIds.has(id); },
  add(id) {
    if (_processedNotificationIds.size >= MAX_PROCESSED_IDS) {
      const oldest = _processedNotificationIds.values().next().value;
      _processedNotificationIds.delete(oldest);
    }
    _processedNotificationIds.add(id);
  },
  get size() { return _processedNotificationIds.size; },
  clear() { _processedNotificationIds.clear(); },
};
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
