export const TUTORIAL_CONFIG = {
    /**
     * Active / désactive complètement le tutoriel.
     */
    ENABLED: true,
  
    /**
     * Quand true, relance le tutoriel au prochain lancement même s’il a déjà
     * été complété (pratique pour les tests développeur).
     */
    FORCE_TUTORIAL: false,
  
    /**
     * Temps maximum (ms) pendant lequel l’utilisateur peut quitter l’app
     * avant d’afficher la modale “Reprendre / Recommencer / Passer”.
     */
    INACTIVITY_THRESHOLD_MS: 2 * 60 * 1000, // 2 minutes
  };