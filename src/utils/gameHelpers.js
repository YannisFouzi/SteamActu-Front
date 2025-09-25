/**
 * Utilitaires pour la gestion des jeux Steam
 * Fonctions réutilisables pour normaliser et extraire les données des jeux
 */

// ========================================
// CONSTANTES ET CONFIGURATION
// ========================================

/**
 * Constantes temporelles pour les calculs de dates
 */
const TIME_CONSTANTS = {
  MINUTE_MS: 1000 * 60,
  HOUR_MS: 1000 * 60 * 60,
  DAY_MS: 1000 * 60 * 60 * 24,
  WEEK_MS: 1000 * 60 * 60 * 24 * 7,
  // Seuil pour différencier les timestamps en secondes vs millisecondes
  TIMESTAMP_THRESHOLD: 1e12,
};

/**
 * Configuration par défaut pour le formatage des dates
 */
const DATE_CONFIG = {
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

// ========================================
// FONCTIONS UTILITAIRES INTERNES
// ========================================

/**
 * Normalise un timestamp (gère les formats secondes et millisecondes)
 * @param {number} timestamp - Timestamp à normaliser
 * @returns {number} Timestamp en millisecondes
 */
const normalizeTimestamp = timestamp => {
  if (!timestamp) return 0;
  return timestamp > TIME_CONSTANTS.TIMESTAMP_THRESHOLD
    ? timestamp
    : timestamp * 1000;
};

/**
 * Vérifie si une valeur existe et n'est pas null/undefined
 * @param {any} value - Valeur à vérifier
 * @returns {boolean} True si la valeur existe
 */
const exists = value => value !== undefined && value !== null;

// ========================================
// FONCTIONS PUBLIQUES
// ========================================

/**
 * Convertit une valeur en nombre, retourne 0 si invalide
 * @param {any} value - Valeur à convertir
 * @returns {number} Nombre converti ou 0
 */
export const toNumber = value => {
  if (value === undefined || value === null) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Extrait le temps de jeu total d'un jeu (gère différents formats d'API)
 * @param {Object} game - Objet jeu
 * @returns {number} Temps de jeu en minutes
 */
export const getPlaytimeForeverValue = game => {
  const nested = game?.playtime?.forever ?? game?.playtime?.total;
  if (exists(nested)) {
    return toNumber(nested);
  }
  return toNumber(game?.playtime_forever);
};

/**
 * Extrait le temps de jeu récent d'un jeu (dernières 2 semaines)
 * @param {Object} game - Objet jeu
 * @returns {number} Temps de jeu récent en minutes
 */
export const getPlaytimeRecentValue = game => {
  const nested = game?.playtime?.recent ?? game?.playtime?.lastTwoWeeks;
  if (exists(nested)) {
    return toNumber(nested);
  }
  return toNumber(game?.playtime_2weeks);
};

/**
 * Extrait la dernière date de jeu d'un jeu
 * @param {Object} game - Objet jeu
 * @returns {number} Timestamp de la dernière session
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
 * Extrait la dernière date de mise à jour d'un jeu
 * @param {Object} game - Objet jeu
 * @returns {number} Timestamp de la dernière mise à jour
 */
export const getLastUpdateValue = game => {
  const raw =
    game?.lastUpdateTimestamp ??
    game?.rtime_last_played ??
    game?.playtime?.lastPlayed ??
    0;
  return toNumber(raw);
};

/**
 * Vérifie si un jeu a été mis à jour récemment (dans les dernières 24 heures)
 * @param {number} timestamp - Timestamp à vérifier
 * @returns {boolean} True si récent
 */
export const isRecentlyUpdated = timestamp => {
  if (!timestamp) return false;

  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const now = Date.now();

  return now - normalizedTimestamp < TIME_CONSTANTS.DAY_MS;
};

/**
 * Normalise l'ID d'une application (gère appid et appId)
 * @param {Object} game - Objet jeu
 * @returns {string} ID normalisé en string
 */
export const getGameAppId = game => {
  return (game?.appid || game?.appId || '').toString();
};

/**
 * Vérifie si un jeu a des données valides pour l'affichage
 * @param {Object} game - Objet jeu
 * @returns {boolean} True si le jeu est valide
 */
export const isValidGame = game => {
  return game && game.name && (game.appid || game.appId);
};

/**
 * Génère l'URL de l'icône d'un jeu Steam
 * @param {string} appId - ID de l'application
 * @param {string} iconHash - Hash de l'icône
 * @returns {string|null} URL de l'icône ou null
 */
export const getGameIconUrl = (appId, iconHash) => {
  if (!appId || !iconHash) return null;
  return `http://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${iconHash}.jpg`;
};

/**
 * Formate une date relative (ex: "Il y a 2 heures", "Il y a 3 jours")
 * Fonction réutilisable pour éviter la duplication dans les composants
 * @param {number} timestamp - Timestamp à formater
 * @param {Object} options - Options de formatage
 * @param {boolean} options.includeMinutes - Inclure les minutes (défaut: false)
 * @param {string} options.fallback - Texte si pas de timestamp (défaut: 'Jamais')
 * @returns {string} Date formatée
 */
export const formatRelativeDate = (timestamp, options = {}) => {
  const {includeMinutes = false, fallback = DATE_CONFIG.DEFAULT_FALLBACK} =
    options;

  if (!timestamp) return fallback;

  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const date = new Date(normalizedTimestamp);
  const now = new Date();
  const diffInMs = now - date;

  // Calculs optimisés avec les constantes
  const diffInMinutes = Math.floor(diffInMs / TIME_CONSTANTS.MINUTE_MS);
  const diffInHours = Math.floor(diffInMs / TIME_CONSTANTS.HOUR_MS);
  const diffInDays = Math.floor(diffInMs / TIME_CONSTANTS.DAY_MS);

  // Gestion des minutes si activée
  if (includeMinutes && diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
  }

  // Gestion des heures
  if (diffInHours < 24) {
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }

  // Gestion des jours
  if (diffInDays < 7) {
    return `Il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
  }

  // Format date classique pour les dates anciennes
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formate une date absolue avec options locales
 * @param {number} timestamp - Timestamp à formater
 * @param {Object} options - Options de formatage Intl.DateTimeFormat
 * @returns {string} Date formatée
 */
export const formatAbsoluteDate = (timestamp, options = {}) => {
  if (!timestamp) return '';

  // Normaliser le timestamp (gère automatiquement secondes vs millisecondes)
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  const date = new Date(normalizedTimestamp);

  const formatOptions = {
    ...DATE_CONFIG.DEFAULT_ABSOLUTE_OPTIONS,
    ...options,
  };

  return date.toLocaleDateString(DATE_CONFIG.LOCALE, formatOptions);
};

// ========================================
// EXPORTS POUR TESTS ET DEBUGGING
// ========================================

/**
 * Export des constantes internes pour les tests et le debugging
 * Permet de tester les fonctions utilitaires internes si nécessaire
 */
export const gameHelpersConfig = {
  TIME_CONSTANTS,
  DATE_CONFIG,
  // Fonctions utilitaires (pour tests)
  normalizeTimestamp,
  exists,
};
