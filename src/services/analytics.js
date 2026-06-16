import analytics from '@react-native-firebase/analytics';

/**
 * Analytics d'audience + usage (Firebase Analytics). Réutilise le projet Firebase
 * déjà en place pour les push (steam-2ab43) — aucune config supplémentaire.
 * Le pays / l'audience / les sessions sont collectés automatiquement par Firebase
 * en prod ; ce module ajoute le suivi d'écrans + les events d'usage. Voir
 * ANALYTICS_SETUP.md.
 *
 * Aucune fonction ne doit jamais casser l'app → tout est try/catch + no-op.
 */

// Coupe TOUTE collecte en dev (auto-collecte Firebase incluse : sessions, pays…)
// pour ne pas polluer les stats pendant le développement. À appeler une fois au
// boot (index.js). En prod, active la collecte.
export function initAnalytics() {
  analytics()
    .setAnalyticsCollectionEnabled(!__DEV__)
    .catch(() => {});
}

export async function logScreenView(screenName) {
  if (!screenName) {
    return;
  }
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    /* analytics ne doit jamais casser l'app */
  }
}

export async function logAnalyticsEvent(name, params = {}) {
  if (!name) {
    return;
  }
  try {
    await analytics().logEvent(name, params);
  } catch {
    /* no-op */
  }
}
