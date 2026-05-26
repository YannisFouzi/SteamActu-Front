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
// LOCAL (dev) : backend sur ton PC, joignable depuis le telephone sur le meme Wi-Fi
// PROD (APK) : backend sur Railway
const API_BASE_URL = getEnvVar(
  'API_BASE_URL',
  isDevelopment
    ? 'http://localhost:5000/api'
    : 'https://gamenews.up.railway.app/api',
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

// IMPORTANT : doit etre bumpee SIMULTANEMENT avec versionName dans
// android/app/build.gradle (et CFBundleShortVersionString sur iOS). C'est cette
// valeur que le backend GET /api/version compare a `minSupportedVersion` pour
// decider de bloquer l'app via UpdateRequiredScreen. Mismatch = check inutile.
const APP_VERSION = '1.1';

const SENTRY_DSN = getEnvVar(
  'SENTRY_DSN_MOBILE',
  'https://61fe39fa1a13a5d3ec716f83597731c7@o4511158959931392.ingest.de.sentry.io/4511265897185360',
);

export const APP_CONFIG = {
  ENVIRONMENT,
  API_BASE_URL,
  STEAM_AUTH_BASE_URL: getEnvVar(
    'STEAM_AUTH_BASE_URL',
    deriveAuthBaseUrl(API_BASE_URL),
  ),
  APP_SCHEME,
  APP_VERSION,
  STEAM_MEDIA_CDN,
  SENTRY_DSN,
};
