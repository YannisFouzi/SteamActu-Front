import {userService} from '../services/api';

/**
 * Hook personnalisé pour la synchronisation des jeux actifs récents
 * Extrait la logique complexe de synchronisation du contexte principal
 */
export const useGameSync = () => {
  // Constante pour la fenêtre de temps "récent" (7 jours)
  const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  /**
   * Synchronise les jeux actifs récents avec le backend
   * @param {Array} gamesList - Liste des jeux
   * @param {string} currentSteamId - ID Steam de l'utilisateur
   */
  const syncRecentActiveGames = async (gamesList, currentSteamId) => {
    try {
      if (!currentSteamId) {
        return;
      }

      const now = Date.now();
      const dedupeMap = new Map();

      // Traitement et déduplication des jeux récents
      (gamesList || []).forEach(rawGame => {
        if (!rawGame) {
          return;
        }

        // Normaliser l'appId (gère appid et appId)
        const appId = rawGame.appid?.toString() || rawGame.appId?.toString();
        if (!appId) {
          return;
        }

        // Extraire et normaliser le timestamp
        const rawTimestamp = Number(rawGame.lastUpdateTimestamp || 0);
        if (!rawTimestamp) {
          return;
        }

        // Normaliser le timestamp (gérer les formats seconds/milliseconds)
        const normalizedTimestamp =
          rawTimestamp > 1e12 ? rawTimestamp : rawTimestamp * 1000;

        // Filtrer les jeux trop anciens
        if (now - normalizedTimestamp > RECENT_WINDOW_MS) {
          return;
        }

        // Déduplication - garder le plus récent
        const existing = dedupeMap.get(appId);
        if (!existing || normalizedTimestamp > existing.timestamp) {
          dedupeMap.set(appId, {
            appId,
            name: rawGame.name || `Jeu ${appId}`,
            timestamp: normalizedTimestamp,
          });
        }
      });

      // Préparer le payload pour l'API
      const payload = Array.from(dedupeMap.values())
        .sort((a, b) => b.timestamp - a.timestamp) // Plus récent en premier
        .slice(0, 200) // Limiter à 200 jeux max
        .map(entry => ({
          appId: entry.appId,
          name: entry.name,
          lastNewsDate: new Date(entry.timestamp).toISOString(),
        }));

      // Envoyer au backend
      await userService.updateRecentActiveGames(currentSteamId, payload);

      console.log(
        `✅ Synchronisation réussie: ${payload.length} jeux actifs récents`,
      );
    } catch (error) {
      console.error(
        '❌ Erreur lors de la mise à jour des jeux actifs récents:',
        error,
      );
    }
  };

  /**
   * Vérifie si un jeu est dans la fenêtre "récent"
   * @param {number} timestamp - Timestamp à vérifier
   * @returns {boolean} True si le jeu est récent
   */
  const isInRecentWindow = timestamp => {
    if (!timestamp) return false;
    const now = Date.now();
    const normalizedTimestamp = timestamp > 1e12 ? timestamp : timestamp * 1000;
    return now - normalizedTimestamp <= RECENT_WINDOW_MS;
  };

  return {
    syncRecentActiveGames,
    isInRecentWindow,
    RECENT_WINDOW_MS,
  };
};
