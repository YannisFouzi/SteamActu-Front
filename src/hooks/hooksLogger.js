import {Alert} from 'react-native';

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
  Alert.alert(title, message, buttons, options);

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
