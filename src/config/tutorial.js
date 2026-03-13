export const TUTORIAL_CONFIG = {
  /**
   * Active / desactive completement le tutoriel.
   */
  ENABLED: true,

  /**
   * Quand true, relance le tutoriel au prochain lancement meme s'il a deja
   * ete complete (pratique pour les tests developpeur).
   */
  FORCE_TUTORIAL: false,

  /**
   * Temps maximum (ms) pendant lequel l'utilisateur peut quitter l'app
   * avant d'afficher la modale "Reprendre / Recommencer / Passer".
   */
  INACTIVITY_THRESHOLD_MS: 2 * 60 * 1000,
};
