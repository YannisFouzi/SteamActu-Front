import axios from 'axios';

// Définir l'URL de base de l'API
// Pour tester localement, utilisez l'adresse IP de votre machine sur le réseau local
// Par exemple 192.168.1.X ou 10.0.0.X (et non pas localhost car ce n'est pas accessible depuis l'émulateur)
const API_URL = 'http://192.168.50.42:5000/api';

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

  // Mettre à jour les jeux suivis
  updateGames: (steamId, games) => {
    return api.put(`/users/${steamId}/games`, {games});
  },

  // Mettre à jour les paramètres de notification
  updateNotificationSettings: (steamId, settings) => {
    return api.put(`/users/${steamId}/notifications`, settings);
  },
};

// Service actualités
const newsService = {
  // Récupérer les actualités d'un jeu spécifique
  getGameNews: (appId, count = 5, maxLength = 300) => {
    return api.get(`/news/game/${appId}`, {
      params: {count, maxLength},
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

export {newsService, steamService, userService};
