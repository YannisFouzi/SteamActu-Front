import i18n, {getCurrentLocale, normalizeLanguage} from '../i18n';
import { isDefined } from './numberHelpers';

export const TIME_CONSTANTS = {
  MINUTE_MS: 1000 * 60,
  HOUR_MS: 1000 * 60 * 60,
  DAY_MS: 1000 * 60 * 60 * 24,
  WEEK_MS: 1000 * 60 * 60 * 24 * 7,
  TIMESTAMP_THRESHOLD: 1e12,
};

export const DATE_CONFIG = {
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
  const {
    includeMinutes = false,
    fallback,
    language,
  } = options;
  const translationOptions = language
    ? {lng: normalizeLanguage(language)}
    : undefined;
  const resolvedFallback =
    typeof fallback === 'string'
      ? fallback
      : i18n.t('dates.fallbackNever', translationOptions);

  if (!timestamp) {
    return resolvedFallback;
  }

  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const date = new Date(normalizedTimestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  const diffInMinutes = Math.floor(diffInMs / TIME_CONSTANTS.MINUTE_MS);
  const diffInHours = Math.floor(diffInMs / TIME_CONSTANTS.HOUR_MS);
  const diffInDays = Math.floor(diffInMs / TIME_CONSTANTS.DAY_MS);
  const locale = getCurrentLocale(language);

  if (diffInMinutes <= 0) {
    return i18n.t('dates.fallbackNow', translationOptions);
  }

  try {
    const formatter = new Intl.RelativeTimeFormat(locale, {numeric: 'auto'});

    if (includeMinutes && diffInMinutes < 60) {
      return formatter.format(-diffInMinutes, 'minute');
    }

    if (diffInHours < 24) {
      return formatter.format(-diffInHours, 'hour');
    }

    if (diffInDays < 7) {
      return formatter.format(-diffInDays, 'day');
    }
  } catch (error) {
    // Fallback vers un format absolu si RelativeTimeFormat indisponible.
  }

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
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
  const {language, ...formatOverrides} = options;

  const formatOptions = {
    ...DATE_CONFIG.DEFAULT_ABSOLUTE_OPTIONS,
    ...formatOverrides,
  };

  return new Intl.DateTimeFormat(
    getCurrentLocale(language),
    formatOptions,
  ).format(date);
};
