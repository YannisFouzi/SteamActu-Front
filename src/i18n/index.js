import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
export const SUPPORTED_LANGUAGES = ['fr', 'en'];

const DEFAULT_LANGUAGE = 'fr';
const LANGUAGE_TO_LOCALE = {
  fr: 'fr-FR',
  en: 'en-US',
};

const resources = {
  en: {translation: en},
  fr: {translation: fr},
};

export const normalizeLanguage = language => {
  if (typeof language !== 'string') {
    return DEFAULT_LANGUAGE;
  }

  const normalized = language.toLowerCase().trim();

  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  const matched = SUPPORTED_LANGUAGES.find(code =>
    normalized.startsWith(code),
  );

  return matched || DEFAULT_LANGUAGE;
};

export const detectDeviceLanguage = () => {
  const bestLanguage = RNLocalize.findBestLanguageTag(SUPPORTED_LANGUAGES);
  return normalizeLanguage(bestLanguage?.languageTag || bestLanguage?.languageCode);
};

export const getCurrentAppLanguage = () =>
  normalizeLanguage(i18n.resolvedLanguage || i18n.language);

export const getLocaleForLanguage = language =>
  LANGUAGE_TO_LOCALE[normalizeLanguage(language)] || LANGUAGE_TO_LOCALE.fr;

export const getCurrentLocale = language =>
  getLocaleForLanguage(language || getCurrentAppLanguage());

export const hasStoredLanguagePreference = async () => {
  const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  return typeof stored === 'string' && stored.trim().length > 0;
};

export const loadStoredLanguagePreference = async () => {
  const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : null;
};

export const persistAppLanguage = async language => {
  await AsyncStorage.setItem(
    APP_LANGUAGE_STORAGE_KEY,
    normalizeLanguage(language),
  );
};

export const changeAppLanguage = async language => {
  const nextLanguage = normalizeLanguage(language);
  await persistAppLanguage(nextLanguage);
  await i18n.changeLanguage(nextLanguage);
  return nextLanguage;
};

export const translate = (key, options) => i18n.t(key, options);

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  resources,
  react: {
    useSuspense: false,
  },
});

const languageInitializationPromise = loadStoredLanguagePreference()
  .then(storedLanguage => {
    if (storedLanguage && storedLanguage !== getCurrentAppLanguage()) {
      return i18n.changeLanguage(storedLanguage);
    }
    return getCurrentAppLanguage();
  })
  .catch(() => getCurrentAppLanguage());

export const waitForI18nInitialization = () => languageInitializationPromise;

export default i18n;
