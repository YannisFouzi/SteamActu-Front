import axios from 'axios';
import {APP_CONFIG} from '../config/env';
import {debugError} from '../hooks/hooksLogger';
import {getCurrentAppLanguage, translate} from '../i18n';
import {clearMobileSession, getMobileSession} from './mobileSessionStore';

const API_CONFIG = {
  API_URL: APP_CONFIG.API_BASE_URL,
  DEFAULT_LIMITS: {
    perGameLimit: 5,
  },
};

const api = axios.create({
  baseURL: API_CONFIG.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

const normalizeError = error => {
  const status = error?.response?.status ?? 0;
  const data = error?.response?.data;
  const message =
    data?.message ||
    error?.message ||
    (status === 0
      ? translate('errors.networkFallbackMessage')
      : translate('errors.genericRetryMessage'));

  return {
    status,
    message,
    data,
    original: error,
  };
};

// Injecte automatiquement Authorization: Bearer <token> sur toutes les
// requetes de l'API principale si une session mobile valide est presente.
// Les endpoints publics (e.g. /users/register avant login) marcheront sans
// session, le backend repondra 401 et le response interceptor nettoiera.
api.interceptors.request.use(async config => {
  try {
    const session = await getMobileSession();
    if (session?.token) {
      config.headers = config.headers || {};
      // N'ecrase pas un header Authorization explicitement defini par l'appelant
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${session.token}`;
      }
    }
  } catch (err) {
    debugError('API request interceptor: getMobileSession failed', err);
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    debugError('API Error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    // 401 = session expiree ou invalide -> on nettoie le stockage local.
    // Le bootstrap au prochain demarrage / le hook d'auth detectera l'absence
    // de session et redirigera vers le login. On evite de coupler api.js a
    // la couche navigation pour rester testable.
    if (error.response?.status === 401) {
      try {
        await clearMobileSession();
      } catch (clearErr) {
        debugError('API 401: clearMobileSession failed', clearErr);
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

const userService = {
  register: (steamId, language) =>
    api.post('/users/register', {steamId, language}),
  getUser: steamId => api.get(`/users/${steamId}`),
  followGame: (steamId, appId, name, logoUrl) =>
    api.post(`/users/${steamId}/follow`, {appId, name, logoUrl}),
  unfollowGame: (steamId, appId) =>
    api.delete(`/users/${steamId}/follow/${appId}`),
  updateNotificationSettings: (steamId, settings) =>
    api.put(`/users/${steamId}/notifications`, settings),
  updateRecentActiveGames: (steamId, games) =>
    api.put(`/users/${steamId}/active-games`, {games}),
  updateLanguage: (steamId, language) =>
    api.put(`/users/${steamId}/language`, {language}),
  getFollowedGamesDetails: steamId =>
    api.get(`/users/${steamId}/followed-games-details`),
  deleteAccount: steamId => api.delete(`/users/${steamId}`),
  addNewsFavorite: (steamId, payload) =>
    api.post(`/users/${steamId}/news-favorites`, payload),
  removeNewsFavorite: (steamId, appId, newsId) =>
    api.delete(`/users/${steamId}/news-favorites/${appId}/${newsId}`),
  registerFCMToken: (steamId, token, platform) =>
    api.post(`/users/${steamId}/fcm-token`, {token, platform}),
  unregisterFCMToken: (steamId, token) =>
    api.delete(`/users/${steamId}/fcm-token`, {data: {token}}),
  markNewsFeedSeen: (steamId, seenAt) =>
    api.put(`/users/${steamId}/news/seen`, {seenAt}),
};

const newsService = {
  getNewsFeed: (
    steamId,
    {
      perGameLimit = API_CONFIG.DEFAULT_LIMITS.perGameLimit,
      language = getCurrentAppLanguage(),
      favoritesOnly = false,
    } = {},
  ) => {
    const params = {
      perGameLimit,
      language,
    };

    if (steamId) {
      params.steamId = steamId;
    }
    if (favoritesOnly) {
      params.favoritesOnly = true;
    }

    return api.get('/news/feed', {params});
  },
};

const supportFeedbackService = {
  submit: payload => api.post('/feedback', payload, {timeout: 15000}),
};

const steamService = {
  getUserGames: (steamId, config = {}) =>
    api.get(`/steam/games/${steamId}`, config),
  getUserWishlist: (steamId, config = {}) =>
    api.get(`/steam/wishlist/${steamId}`, config),
  getProfile: steamId => api.get(`/steam/profile/${steamId}`),
  searchGames: (query, limit = 5, config = {}) =>
    api.get('/steam/search', {params: {q: query, limit}, ...config}),
  fetchStatus: (steamId, config = {}) =>
    api.get(`/steam/status/${steamId}`, config),
  checkVisibility: steamId =>
    api.post(`/steam/check-visibility/${steamId}`),
  checkWishlistVisibility: steamId =>
    api.post(`/steam/check-wishlist-visibility/${steamId}`),
};

const adminService = {
  getAccess: async () => {
    const session = await getMobileSession();

    if (!session?.token) {
      const error = new Error(translate('errors.sessionExpiredMessage'));
      error.status = 401;
      throw error;
    }

    return api.get('/admin/access', {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      timeout: 10000,
    });
  },
  getStats: async () => {
    const session = await getMobileSession();

    if (!session?.token) {
      const error = new Error(translate('errors.sessionExpiredMessage'));
      error.status = 401;
      throw error;
    }

    return api.get('/admin/stats', {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      timeout: 15000,
    });
  },
  refreshAccount: async () => {
    const session = await getMobileSession();

    if (!session?.token) {
      const error = new Error(translate('errors.sessionExpiredMessage'));
      error.status = 401;
      throw error;
    }

    // Manual library + Steam Family + wishlist re-sync (same as the cron). The
    // sync makes several live Steam calls, so allow a generous timeout.
    return api.post('/admin/refresh-account', null, {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      timeout: 60000,
    });
  },
};

const authApi = axios.create({
  baseURL: APP_CONFIG.STEAM_AUTH_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

authApi.interceptors.response.use(
  response => response,
  error => {
    debugError('Auth API Error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(normalizeError(error));
  },
);

const steamAuthService = {
  AUTH_REDIRECT_URL: `${APP_CONFIG.APP_SCHEME}auth`,

  startAuth: async () => {
    const response = await authApi.post('/auth/steam/start');
    return response.data;
  },

  checkAuthStatus: async authToken => {
    const response = await authApi.get(`/auth/steam/status/${authToken}`);
    return response.data;
  },
};

export {
  adminService,
  newsService,
  steamAuthService,
  steamService,
  supportFeedbackService,
  userService,
};
