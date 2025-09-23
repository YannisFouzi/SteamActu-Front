import axios from 'axios';
import URLParse from 'url-parse';

// DÃ©finir l'URL de base de l'API
// URL de production pour le backend dÃ©ployÃ© sur Render
const API_URL = 'http://10.0.2.2:5000/api';

// Pour les tests en local, utiliser ces URLs Ã  la place :
// Ã‰mulateurs Android: 'http://10.0.2.2:5000/api'
// Appareils physiques: 'http://VOTRE_IP_LOCALE:5000/api'

// CrÃ©er une instance axios avec la configuration de base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Service utilisateur
const userService = {
  // Enregistrer un nouvel utilisateur
  register: (steamId) => {
    return api.post('/users/register', { steamId });
  },

  // Récupérer les informations d'un utilisateur
  getUser: (steamId) => {
    return api.get(`/users/${steamId}`);
  },

  // Suivre un jeu
  followGame: (steamId, appId, name, logoUrl) => {
    return api.post(`/users/${steamId}/follow`, { appId, name, logoUrl });
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
    return api.put(`/users/${steamId}/active-games`, { games });
  },
};

// Service actualitÃ©s
const newsService = {
  // RÃ©cupÃ©rer les actualitÃ©s d'un jeu spÃ©cifique
  getGameNews: (appId, count = 5, maxLength = 300) => {
    return api.get(`/news/game/${appId}`, {
      params: {
        count,
        maxLength,
        language: 'fr',
        steamOnly: 'true',
      },
    });
  },
  // Recuperer le fil d''actualites global
  getNewsFeed: (steamId, {followedOnly = false, perGameLimit = 10, language = 'fr'} = {}) => {
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
  // RÃ©cupÃ©rer la liste des jeux possÃ©dÃ©s par un utilisateur
  getUserGames: (steamId, followedOnly = false) => {
    // Cette fonction utilisera notre backend comme proxy pour appeler l'API Steam
    const params = followedOnly ? {followedOnly: 'true'} : {};
    const callId = Date.now();

    return api
      .get(`/steam/games/${steamId}`, {params})
      .then(response => {
        return response;
      })
      .catch(error => {
        throw error;
      });
  },
};

// Service Steam OpenID pour l'authentification
const steamAuthService = {
  // URL du service d'authentification Steam OpenID
  STEAM_OPENID_URL: 'https://steamcommunity.com/openid',

  // URL de retour aprÃ¨s authentification - doit Ãªtre une URL HTTP(S) valide
  // En production, vous devriez avoir votre propre domaine avec une page de redirection
  // URL utilisÃ©e pour le retour d'OpenID (sera remplacÃ©e par le backend)
  RETURN_URL: `${API_URL.replace('/api', '')}/auth/steam/return`,

  // Notre URL scheme pour la redirection dans l'app
  APP_SCHEME_URL: 'steamnotif://auth',

  // GÃ©nÃ©rer l'URL d'authentification OpenID de Steam
  getAuthUrl: () => {
    // Construire l'URL de maniÃ¨re standard pour OpenID
    const params = new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': steamAuthService.RETURN_URL,
      'openid.realm': steamAuthService.RETURN_URL,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    });

    return `${steamAuthService.STEAM_OPENID_URL}/login?${params.toString()}`;
  },

  // Extraire le SteamID de la rÃ©ponse OpenID
  extractSteamId: url => {
    // La rÃ©ponse OpenID de Steam inclut le SteamID dans l'identitÃ©
    // Format typique: https://steamcommunity.com/openid/id/76561198xxxxxxxx
    try {
      const parsedUrl = new URLParse(url, true);
      const identity = parsedUrl.query['openid.identity'] || '';
      const matches = identity.match(/\/id\/(\d+)$/);
      return matches ? matches[1] : null;
    } catch (error) {
      console.error("Erreur lors de l'extraction du SteamID:", error);
      return null;
    }
  },
};

export {newsService, steamAuthService, steamService, userService};
