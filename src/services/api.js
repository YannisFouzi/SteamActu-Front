import axios from 'axios';

// Configuration de l'environnement
const CONFIG = {
  // URL de base selon l'environnement
  API_URL: __DEV__
    ? 'http://10.0.2.2:5000/api' // Développement (émulateur Android)
    : 'https://your-production-api.com/api', // Production

  // Paramètres par défaut pour les actualités
  DEFAULT_NEWS_PARAMS: {
    language: 'fr',
    steamOnly: 'true',
  },

  // Limites par défaut
  DEFAULT_LIMITS: {
    newsCount: 5,
    newsMaxLength: 300,
    perGameLimit: 10,
  },
};

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: CONFIG.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout de 10 secondes
});

// Intercepteur pour la gestion globale des erreurs
api.interceptors.response.use(
  response => response,
  error => {
    // Log des erreurs pour le débogage
    if (__DEV__) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Retourner l'erreur pour que les composants puissent la gérer
    return Promise.reject(error);
  },
);

// Service utilisateur
const userService = {
  // Enregistrer un nouvel utilisateur
  register: steamId => {
    return api.post('/users/register', {steamId});
  },

  // Récupérer les informations d'un utilisateur
  getUser: steamId => {
    return api.get(`/users/${steamId}`);
  },

  // Suivre un jeu
  followGame: (steamId, appId, name, logoUrl) => {
    return api.post(`/users/${steamId}/follow`, {appId, name, logoUrl});
  },

  // Ne plus suivre un jeu
  unfollowGame: (steamId, appId) => {
    return api.delete(`/users/${steamId}/follow/${appId}`);
  },

  // Mettre à jour les paramètres de notification
  updateNotificationSettings: (steamId, settings) => {
    return api.put(`/users/${steamId}/notifications`, settings);
  },

  // Mettre à jour les jeux actifs récents
  updateRecentActiveGames: (steamId, games) => {
    return api.put(`/users/${steamId}/active-games`, {games});
  },
};

// Service actualités
const newsService = {
  // Récupérer les actualités d'un jeu spécifique
  getGameNews: (
    appId,
    count = CONFIG.DEFAULT_LIMITS.newsCount,
    maxLength = CONFIG.DEFAULT_LIMITS.newsMaxLength,
  ) => {
    return api.get(`/news/game/${appId}`, {
      params: {
        count,
        maxLength,
        ...CONFIG.DEFAULT_NEWS_PARAMS,
      },
    });
  },

  // Récupérer le fil d'actualités global
  getNewsFeed: (
    steamId,
    {
      followedOnly = false,
      perGameLimit = CONFIG.DEFAULT_LIMITS.perGameLimit,
      language = CONFIG.DEFAULT_NEWS_PARAMS.language,
    } = {},
  ) => {
    const params = {
      followedOnly: followedOnly ? 'true' : 'false',
      perGameLimit,
      language,
    };

    if (steamId) {
      params.steamId = steamId;
    }

    return api.get('/news/feed', {params});
  },
};

// Service Steam (communique directement avec l'API Steam via notre backend)
const steamService = {
  // Récupérer la liste des jeux possédés par un utilisateur
  getUserGames: (steamId, followedOnly = false) => {
    const params = followedOnly ? {followedOnly: 'true'} : {};
    return api.get(`/steam/games/${steamId}`, {params});
  },
};

// Service Steam OpenID pour l'authentification
const steamAuthService = {
  // URLs et constantes de configuration
  STEAM_OPENID_URL: 'https://steamcommunity.com/openid',
  RETURN_URL: `${CONFIG.API_URL.replace('/api', '')}/auth/steam/return`,
  APP_SCHEME_URL: 'steamnotif://auth',

  // Paramètres OpenID constants
  OPENID_PARAMS: {
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  },

  // Générer l'URL d'authentification OpenID de Steam
  getAuthUrl: () => {
    const params = new URLSearchParams({
      ...steamAuthService.OPENID_PARAMS,
      'openid.return_to': steamAuthService.RETURN_URL,
      'openid.realm': steamAuthService.RETURN_URL,
    });

    return `${steamAuthService.STEAM_OPENID_URL}/login?${params.toString()}`;
  },
};

// Export de la configuration pour les tests et le debugging
export const apiConfig = CONFIG;

export {newsService, steamAuthService, steamService, userService};
