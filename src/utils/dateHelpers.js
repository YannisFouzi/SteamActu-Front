import { isDefined } from './numberHelpers';

export const TIME_CONSTANTS = {
  MINUTE_MS: 1000 * 60,
  HOUR_MS: 1000 * 60 * 60,
  DAY_MS: 1000 * 60 * 60 * 24,
  WEEK_MS: 1000 * 60 * 60 * 24 * 7,
  TIMESTAMP_THRESHOLD: 1e12,
};

export const DATE_CONFIG = {
  DEFAULT_FALLBACK: 'Jamais',
  LOCALE: 'fr-FR',
  DEFAULT_ABSOLUTE_OPTIONS: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
};

/**
 * Normalise un timestamp (gère automatiquement secondes vs millisecondes).
 * @param {number} timestamp
 * @returns {number}
 */
export const normalizeTimestamp = timestamp => {
  if (!isDefined(timestamp)) {
    return 0;
  }
  return timestamp > TIME_CONSTANTS.TIMESTAMP_THRESHOLD
    ? timestamp
    : timestamp * 1000;
};

/**
 * Formate une date relative (ex. “Il y a 2 heures”).
 * @param {number} timestamp
 * @param {{ includeMinutes?: boolean, fallback?: string }} options
 * @returns {string}
 */
export const formatRelativeDate = (timestamp, options = {}) => {
  const {includeMinutes = false, fallback = DATE_CONFIG.DEFAULT_FALLBACK} =
    options;

  if (!timestamp) {
    return fallback;
  }

  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const date = new Date(normalizedTimestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  const diffInMinutes = Math.floor(diffInMs / TIME_CONSTANTS.MINUTE_MS);
  const diffInHours = Math.floor(diffInMs / TIME_CONSTANTS.HOUR_MS);
  const diffInDays = Math.floor(diffInMs / TIME_CONSTANTS.DAY_MS);

  if (includeMinutes && diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }

  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }

  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formate une date absolue (JJ mois année HH:MM).
 * @param {number} timestamp
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {string}
 */
export const formatAbsoluteDate = (timestamp, options = {}) => {
  if (!timestamp) {
    return '';
  }

  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const date = new Date(normalizedTimestamp);

  const formatOptions = {
    ...DATE_CONFIG.DEFAULT_ABSOLUTE_OPTIONS,
    ...options,
  };

  return date.toLocaleDateString(DATE_CONFIG.LOCALE, formatOptions);
};
