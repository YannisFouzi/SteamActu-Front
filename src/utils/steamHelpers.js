import { APP_CONFIG } from '../config/env';
import { isDefined, toNumber } from './numberHelpers';

const STEAM_ICON_BASE_URL = `${APP_CONFIG.STEAM_MEDIA_CDN}/steamcommunity/public/images/apps`;
const STEAM_CDN_BASE_URL = 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps';

/**
 * Retourne la meilleure URL d'image disponible pour un jeu Steam.
 * Accepte n'importe quel format de données jeu (library, wishlist, search, followed).
 * @param {Object} game
 * @returns {string|null}
 */
export const getGameImageUrl = game => {
  if (!game) {
    return null;
  }
  const appId = game.appid ?? game.appId;
  const cdnFallback = appId
    ? `${STEAM_CDN_BASE_URL}/${appId}/header.jpg`
    : null;
  return game.header_image || game.capsule || game.imageUrl || cdnFallback;
};

/**
 * Retourne une URL d'image alternative (capsule petite) pour un jeu Steam.
 * Utilisé comme fallback quand l'image principale échoue.
 * @param {Object} game
 * @returns {string|null}
 */
export const getGameImageFallback = game => {
  if (!game) {
    return null;
  }
  const appId = game.appid ?? game.appId;
  if (!appId) {
    return null;
  }
  return `${STEAM_CDN_BASE_URL}/${appId}/capsule_sm_120.jpg`;
};

/**
 * Retourne le temps de jeu total (minutes) à partir de différents formats d’API.
 * @param {Object} game
 * @returns {number}
 */
export const getPlaytimeForeverValue = game => {
  const nested = game?.playtime?.forever ?? game?.playtime?.total;
  if (isDefined(nested)) {
    return toNumber(nested);
  }
  return toNumber(game?.playtime_forever);
};

/**
 * Retourne le temps de jeu récent (minutes).
 * @param {Object} game
 * @returns {number}
 */
export const getPlaytimeRecentValue = game => {
  const nested = game?.playtime?.recent ?? game?.playtime?.lastTwoWeeks;
  if (isDefined(nested)) {
    return toNumber(nested);
  }
  return toNumber(game?.playtime_2weeks);
};

/**
 * Récupère le timestamp de dernière session.
 * @param {Object} game
 * @returns {number}
 */
export const getLastPlayedValue = game => {
  const raw =
    game?.rtime_last_played ??
    game?.lastPlayTime ??
    game?.playtime?.lastPlayed ??
    game?.lastUpdateTimestamp ??
    0;
  return toNumber(raw);
};

/**
 * Normalise un identifiant d’application en string.
 * @param {Object} game
 * @returns {string}
 */
export const getGameAppId = game => {
  const id = game?.appid ?? game?.appId;
  return isDefined(id) ? id.toString() : '';
};

/**
 * Indique si l’objet jeu contient les informations minimales.
 * @param {Object} game
 * @returns {boolean}
 */
export const isValidGame = game => {
  return Boolean(game && game.name && (game.appid || game.appId));
};

/**
 * Génère une URL HTTPS pour l’icône d’un jeu Steam.
 * @param {string|number} appId
 * @param {string} iconHash
 * @returns {string|null}
 */
export const getGameIconUrl = (appId, iconHash) => {
  if (!appId || !iconHash) {
    return null;
  }
  return `${STEAM_ICON_BASE_URL}/${appId}/${iconHash}.jpg`;
};
