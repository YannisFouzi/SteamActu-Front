import axios from 'axios';
import URLParse from 'url-parse';

// Définir l'URL de base de l'API
// URL de production pour le backend déployé sur Render
const API_URL = 'https://steamactunotif.onrender.com/api';

// Pour les tests en local, utiliser ces URLs à la place :
// Émulateurs Android: 'http://10.0.2.2:5000/api'
// Appareils physiques: 'http://VOTRE_IP_LOCALE:5000/api'

// Créer une instance axios avec la configuration de base
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  // Forcer la synchronisation complète des jeux
  syncGames: steamId => {
    return api.post(`/users/${steamId}/sync-games`);
  },

  // Diagnostiquer et résoudre les problèmes de bibliothèque
  runLibraryDiagnostic: steamId => {
    return api.get(`/steam/diagnostic/library/${steamId}`);
  },

  // Forcer l'importation complète de la bibliothèque
  forceLibraryImport: (steamId, method = 'api') => {
    return api.post(`/users/${steamId}/force-library-import`, {method});
  },
};

// Service actualités
const newsService = {
  // Récupérer les actualités d'un jeu spécifique
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

  // Récupérer les actualités pour plusieurs jeux
  getBatchNews: (appIds, count = 3, maxLength = 300) => {
    return api.post('/news/batch', {appIds, count, maxLength});
  },
};

// Service Steam (communique directement avec l'API Steam via notre backend)
const steamService = {
  // Récupérer la liste des jeux possédés par un utilisateur
  getUserGames: steamId => {
    // Cette fonction utilisera notre backend comme proxy pour appeler l'API Steam
    return api.get(`/steam/games/${steamId}`);
  },
};

// Service Steam OpenID pour l'authentification
const steamAuthService = {
  // URL du service d'authentification Steam OpenID
  STEAM_OPENID_URL: 'https://steamcommunity.com/openid',

  // URL de retour après authentification - doit être une URL HTTP(S) valide
  // En production, vous devriez avoir votre propre domaine avec une page de redirection
  // URL utilisée pour le retour d'OpenID (sera remplacée par le backend)
  RETURN_URL: `${API_URL.replace('/api', '')}/auth/steam/return`,

  // Notre URL scheme pour la redirection dans l'app
  APP_SCHEME_URL: 'steamnotif://auth',

  // Générer l'URL d'authentification OpenID de Steam
  getAuthUrl: () => {
    // Construire l'URL de manière standard pour OpenID
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

  // Extraire le SteamID de la réponse OpenID
  extractSteamId: url => {
    // La réponse OpenID de Steam inclut le SteamID dans l'identité
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

  // Valider la réponse OpenID (à faire côté serveur, mais nous faisons une vérification minimale ici)
  validateAndLogin: async url => {
    try {
      const steamId = steamAuthService.extractSteamId(url);

      if (!steamId) {
        throw new Error('SteamID non trouvé dans la réponse OpenID');
      }

      // Enregistrer l'utilisateur dans notre système
      try {
        await userService.register(steamId);
      } catch (error) {
        // Si l'utilisateur existe déjà, ce n'est pas grave
        if (
          !(
            error.response &&
            error.response.status === 400 &&
            error.response.data.message === 'Cet utilisateur existe déjà'
          )
        ) {
          throw error;
        }
      }

      return steamId;
    } catch (error) {
      console.error('Erreur lors de la validation OpenID:', error);
      throw error;
    }
  },
};

// Service Steam pour récupérer les informations de profil
const steamProfileService = {
  // Clé API Steam
  API_KEY: '47DFE36FF72512F967DFF5AFF92E7D3B',

  // URL pour se connecter via l'interface Steam officielle
  getLoginUrl: () => {
    // Cette URL redirige vers la page de connexion officielle Steam
    return 'https://steamcommunity.com/login/home/?goto=';
  },

  // Récupérer les informations de profil d'un utilisateur
  getPlayerSummary: async steamId => {
    try {
      // Utiliser notre backend comme proxy pour ne pas exposer la clé API
      const response = await api.get(`/steam/profile/${steamId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil Steam:', error);
      throw error;
    }
  },

  // Convertir un nom d'utilisateur Steam en SteamID
  resolveVanityURL: async vanityURL => {
    try {
      // Utiliser notre backend comme proxy
      const response = await api.get(`/steam/resolve-vanity/${vanityURL}`);
      return response.data;
    } catch (error) {
      console.error(
        "Erreur lors de la résolution du nom d'utilisateur Steam:",
        error,
      );
      throw error;
    }
  },
};

export {
  newsService,
  steamAuthService,
  steamProfileService,
  steamService,
  userService,
};
