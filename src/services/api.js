import axios from "axios";
import { APP_CONFIG } from "../config/env";
import { debugError } from "../hooks/hooksLogger";

const DEFAULT_CONFIG = {
  API_URL: APP_CONFIG.API_BASE_URL,
  DEFAULT_NEWS_PARAMS: {
    language: "fr",
    steamOnly: "true",
  },
  DEFAULT_LIMITS: {
    newsCount: 5,
    newsMaxLength: 300,
    perGameLimit: 20,
  },
};

const API_CONFIG = {
  ...DEFAULT_CONFIG,
  API_URL: APP_CONFIG.API_BASE_URL,
};

const api = axios.create({
  baseURL: API_CONFIG.API_URL,
  headers: {
    "Content-Type": "application/json",
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
      ? "Erreur réseau, veuillez vérifier votre connexion."
      : "Une erreur est survenue, veuillez réessayer.");

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
    debugError("API Error", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    });

    return Promise.reject(normalizeError(error));
  },
);

const userService = {
  register: steamId => api.post("/users/register", {steamId}),
  getUser: steamId => api.get(`/users/${steamId}`),
  followGame: (steamId, appId, name, logoUrl) =>
    api.post(`/users/${steamId}/follow`, {appId, name, logoUrl}),
  unfollowGame: (steamId, appId) =>
    api.delete(`/users/${steamId}/follow/${appId}`),
  updateNotificationSettings: (steamId, settings) =>
    api.put(`/users/${steamId}/notifications`, settings),
  updateRecentActiveGames: (steamId, games) =>
    api.put(`/users/${steamId}/active-games`, {games}),
  getFollowedGamesDetails: steamId =>
    api.get(`/users/${steamId}/followed-games-details`),
  deleteAccount: steamId => api.delete(`/users/${steamId}`),
};

const newsService = {
  getGameNews: (
    appId,
    count = API_CONFIG.DEFAULT_LIMITS.newsCount,
    maxLength = API_CONFIG.DEFAULT_LIMITS.newsMaxLength,
  ) =>
    api.get(`/news/game/${appId}`, {
      params: {
        count,
        maxLength,
        ...API_CONFIG.DEFAULT_NEWS_PARAMS,
      },
    }),
  getNewsFeed: (
    steamId,
    {
      followedOnly = false,
      perGameLimit = API_CONFIG.DEFAULT_LIMITS.perGameLimit,
      language = API_CONFIG.DEFAULT_NEWS_PARAMS.language,
    } = {},
  ) => {
    const params = {
      followedOnly: followedOnly ? "true" : "false",
      perGameLimit,
      language,
    };

    if (steamId) {
      params.steamId = steamId;
    }

    return api.get("/news/feed", {params});
  },
};

const steamService = {
  getUserGames: (steamId, followedOnly = false) => {
    const params = followedOnly ? {followedOnly: "true"} : {};
    return api.get(`/steam/games/${steamId}`, {params});
  },
  getUserWishlist: steamId => api.get(`/steam/wishlist/${steamId}`),
  searchGames: (query, limit = 5) =>
    api.get("/steam/search", {params: {q: query, limit}}),
};

const steamAuthService = {
  STEAM_OPENID_URL: "https://steamcommunity.com/openid",
  RETURN_URL: APP_CONFIG.STEAM_RETURN_URL,
  APP_SCHEME_URL: APP_CONFIG.APP_SCHEME,
  OPENID_PARAMS: {
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  },
  getAuthUrl: () => {
    const params = new URLSearchParams({
      ...steamAuthService.OPENID_PARAMS,
      "openid.return_to": steamAuthService.RETURN_URL,
      "openid.realm": steamAuthService.RETURN_URL,
    });

    return `${steamAuthService.STEAM_OPENID_URL}/login?${params.toString()}`;
  },
};

export const apiConfig = {
  ...API_CONFIG,
  ENVIRONMENT: APP_CONFIG.ENVIRONMENT,
};

export { newsService, steamAuthService, steamService, userService };

