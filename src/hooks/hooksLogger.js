import {
  showAlert as showFeedbackAlert,
  showDialog as showFeedbackDialog,
  showErrorMessage as showFeedbackErrorMessage,
  showInfoMessage as showFeedbackInfoMessage,
  showSnackbar as showFeedbackSnackbar,
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

export const showAlert = (title, message, buttons, options) =>
  showFeedbackAlert(title, message, buttons, options);

export const showDialog = config => showFeedbackDialog(config);

export const showSnackbar = config => showFeedbackSnackbar(config);

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
