import axios from 'axios';

// Définir l'URL de base de l'API
// Pour les émulateurs Android, utilisez 10.0.2.2 qui pointe vers localhost de la machine hôte
// Pour les appareils physiques, utilisez l'adresse IP de votre machine sur le réseau local
const API_URL = 'http://10.0.2.2:5000/api';

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
    return api.get(`/steam/news/${appId}`, {
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

  // Récupérer la liste complète des jeux (API + base de données)
  getAllUserGames: steamId => {
    return api.get(`/steam/all-games/${steamId}`);
  },
};

export {newsService, steamService, userService};
