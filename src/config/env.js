const getEnvVar = (key, fallback) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

const inferEnvironment = () => {
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__ ? 'development' : 'production';
  }
  return getEnvVar('APP_ENV', 'production');
};

const ENVIRONMENT = getEnvVar('APP_ENV', inferEnvironment());
const isDevelopment = ENVIRONMENT === 'development';

// Switch automatique entre local et prod
// LOCAL (dev) : Backend sur ton PC (Android Emulator utilise 10.0.2.2 pour localhost)
// PROD (APK) : Backend sur Railway (à configurer après déploiement)
const API_BASE_URL = getEnvVar(
  'API_BASE_URL',
  isDevelopment
    ? 'http://192.168.0.36:5000/api' // Android Emulator → localhost:5000
    : 'https://steamactu-back-production.up.railway.app/api', // Production Railway
);

const STEAM_MEDIA_CDN = getEnvVar(
  'STEAM_MEDIA_CDN',
  'https://media.steampowered.com',
);

const sanitizeBaseUrl = url => {
  if (!url) {
    return '';
  }
  return url.replace(/\/+$/, '');
};

const deriveAuthBaseUrl = baseUrl => {
  if (!baseUrl) {
    return '';
  }

  const sanitized = sanitizeBaseUrl(baseUrl);
  if (sanitized.endsWith('/api')) {
    return sanitized.slice(0, -4);
  }
  return sanitized;
};

const APP_SCHEME = getEnvVar('APP_SCHEME', 'steamnotif://');

export const APP_CONFIG = {
  ENVIRONMENT,
  API_BASE_URL,
  STEAM_AUTH_BASE_URL: getEnvVar(
    'STEAM_AUTH_BASE_URL',
    deriveAuthBaseUrl(API_BASE_URL),
  ),
  APP_SCHEME,
  STEAM_MEDIA_CDN,
};

export const getEnvValue = (key, fallback) => getEnvVar(key, fallback);
