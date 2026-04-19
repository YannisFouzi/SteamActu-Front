import axios from 'axios';
import {APP_CONFIG} from '../config/env';
import {debugError} from '../hooks/hooksLogger';
import {getCurrentAppLanguage, translate} from '../i18n';

const API_CONFIG = {
  API_URL: APP_CONFIG.API_BASE_URL,
  DEFAULT_LIMITS: {
    perGameLimit: 20,
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

api.interceptors.response.use(
  response => response,
  error => {
    debugError('API Error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

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

const steamService = {
  getUserGames: (steamId, config = {}) =>
    api.get(`/steam/games/${steamId}`, config),
  getUserWishlist: (steamId, config = {}) =>
    api.get(`/steam/wishlist/${steamId}`, config),
  getProfile: steamId => api.get(`/steam/profile/${steamId}`),
  searchGames: (query, limit = 5) =>
    api.get('/steam/search', {params: {q: query, limit}}),
  fetchStatus: (steamId, config = {}) =>
    api.get(`/steam/status/${steamId}`, config),
  checkVisibility: steamId =>
    api.post(`/steam/check-visibility/${steamId}`),
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

export {newsService, steamAuthService, steamService, userService};
