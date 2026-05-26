import * as Sentry from '@sentry/react-native';
import {
  showAlert as showFeedbackAlert,
  showDialog as showFeedbackDialog,
  showErrorMessage as showFeedbackErrorMessage,
  showInfoMessage as showFeedbackInfoMessage,
  showSuccessMessage as showFeedbackSuccessMessage,
} from '../feedback/feedbackService';

const DEBUG_MODE =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production');

export const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

export const debugError = (...args) => {
  if (DEBUG_MODE) {
    console.error(...args);
  }
};

/**
 * Remonte une erreur a Sentry ET log en console (dev). A utiliser sur les
 * chemins CRITIQUES dont un echec impacte l'utilisateur (login, FCM register,
 * suppression de compte, settings persist, etc.).
 *
 * Pour les erreurs attendues / non-critiques (cache miss, retries, fail-open
 * versionCheck, splash hide, etc.), conserver `debugError` qui reste silencieux
 * en prod — eviter de saturer le quota Sentry avec du bruit.
 *
 * @param {Error|unknown} error - Erreur a remonter
 * @param {object}   [context]          - Contexte additionnel
 * @param {string}   [context.scope]    - Tag court (ex: 'login.flow', 'fcm.register')
 * @param {object}   [context.extra]    - Champs additionnels visibles dans Sentry
 * @param {string}   [context.level]    - 'fatal'|'error'(default)|'warning'|'info'
 */
export const reportError = (error, {scope, extra, level = 'error'} = {}) => {
  if (DEBUG_MODE) {
    console.error(scope ? `[${scope}]` : '[ERROR]', error, extra || '');
  }
  try {
    Sentry.captureException(error, {
      tags: scope ? {scope} : undefined,
      extra,
      level,
    });
  } catch (_sentryErr) {
    // Ne jamais laisser un echec Sentry remonter en cascade (on ne veut pas
    // qu'un probleme d'observabilite casse le code applicatif qui l'appelait).
  }
};

/**
 * Lie tous les events Sentry suivants a un utilisateur (ou retire le binding
 * si steamId est null). A appeler apres login reussi et sur logout.
 *
 * @param {string|null} steamId
 */
export const setSentryUser = steamId => {
  try {
    if (steamId) {
      Sentry.setUser({id: String(steamId)});
    } else {
      Sentry.setUser(null);
    }
  } catch (_sentryErr) {
    // Voir reportError : ne pas casser le flow applicatif sur un echec Sentry.
  }
};

export const showAlert = (title, message, buttons, options) =>
  showFeedbackAlert(title, message, buttons, options);

export const showDialog = config => showFeedbackDialog(config);

export const showInfoMessage = (title, message, config) =>
  showFeedbackInfoMessage(title, message, config);

export const showSuccessMessage = (title, message, config) =>
  showFeedbackSuccessMessage(title, message, config);

export const showErrorMessage = (title, message, config) =>
  showFeedbackErrorMessage(title, message, config);

export const maskSteamId = steamId => {
  if (!steamId) {
    return '(vide)';
  }

  const stringified = String(steamId);

  if (stringified.length <= 6) {
    return stringified;
  }

  return `${stringified.slice(0, 3)}***${stringified.slice(-2)}`;
};

export {DEBUG_MODE};
