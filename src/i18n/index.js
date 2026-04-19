import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'de', 'es', 'ru', 'zh'];

/** Endonymes pour le sélecteur de langue (identiques quelle que soit la locale i18n). */
export const LANGUAGE_NATIVE_LABELS = {
  fr: 'Français',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  ru: 'Русский',
  zh: '简体中文',
};

/** Langue si locale non reconnue (ex. italien → anglais). */
const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_TO_LOCALE = {
  fr: 'fr-FR',
  en: 'en-US',
  de: 'de-DE',
  es: 'es-ES',
  ru: 'ru-RU',
  zh: 'zh-CN',
};

const resources = {
  en: {translation: en},
  fr: {translation: fr},
  de: {translation: de},
  es: {translation: es},
  ru: {translation: ru},
  zh: {translation: zh},
};

export const normalizeLanguage = language => {
  if (typeof language !== 'string') {
    return DEFAULT_LANGUAGE;
  }

  const normalized = language.toLowerCase().trim();

  if (normalized.startsWith('zh')) {
    return 'zh';
  }

  if (normalized.startsWith('ru')) {
    return 'ru';
  }

  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    return normalized;
  }

  const matched = SUPPORTED_LANGUAGES.find(code =>
    normalized.startsWith(code),
  );

  return matched || DEFAULT_LANGUAGE;
};

const detectDeviceLanguage = () => {
  const bestLanguage = RNLocalize.findBestLanguageTag([
    'en',
    'fr',
    'de',
    'es',
    'ru',
    'zh',
    'zh-CN',
    'zh-Hans',
  ]);
  const raw = bestLanguage?.languageTag || bestLanguage?.languageCode || '';
  const tag = raw.toLowerCase();
  if (tag.startsWith('zh')) {
    return 'zh';
  }
  if (tag.startsWith('ru')) {
    return 'ru';
  }
  if (tag.startsWith('fr')) {
    return 'fr';
  }
  if (tag.startsWith('en')) {
    return 'en';
  }
  if (tag.startsWith('de')) {
    return 'de';
  }
  if (tag.startsWith('es')) {
    return 'es';
  }
  return DEFAULT_LANGUAGE;
};

export const getCurrentAppLanguage = () =>
  normalizeLanguage(i18n.resolvedLanguage || i18n.language);

const getLocaleForLanguage = language =>
  LANGUAGE_TO_LOCALE[normalizeLanguage(language)] || LANGUAGE_TO_LOCALE.en;

export const getCurrentLocale = language =>
  getLocaleForLanguage(language || getCurrentAppLanguage());

const loadStoredLanguagePreference = async () => {
  const stored = await AsyncStorage.getItem(APP_LANGUAGE_STORAGE_KEY);
  return stored ? normalizeLanguage(stored) : null;
};

const persistAppLanguage = async language => {
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
