/**
 * Store ephemere pour la notification initiale au cold-start.
 *
 * On distingue 2 usages :
 * - replay metier (POST /follow, unfollow, sync, etc.)
 * - choix de l'ecran initial de navigation
 *
 * Les deux ne doivent pas se marcher dessus : le replay peut consommer son
 * intent sans priver AppNavigator de l'information necessaire pour atterrir
 * directement sur le bon ecran.
 */

let pendingInitialNotification = null;
let pendingNavigationInitialNotification = null;
let initialNotificationBootstrapResolved = false;
const bootstrapListeners = new Set();

/**
 * Stocke la notification initiale detectee au bootstrap.
 * La premiere source gagne pour eviter les doublons firebase/notifee.
 * @param {{ source: 'firebase' | 'notifee', data: object }} notification
 */
export function setPendingNotification(notification) {
  if (!pendingInitialNotification) {
    pendingInitialNotification = notification;
  }
  if (!pendingNavigationInitialNotification) {
    pendingNavigationInitialNotification = notification;
  }
}

/**
 * Alimente uniquement le store de navigation depuis une action follow_prompt
 * traitee en headless (cold-boot via tap notif data-only). Indispensable car
 * dans ce flux, getInitialNotification() est appele AVANT le tap et retourne
 * null. Sans ca, AppNavigator ne saurait pas qu'il faut atterrir sur l'ecran
 * "Jeux suivis".
 *
 * Ne touche pas pendingInitialNotification (le replay metier passe par
 * pendingFollowConfirmStore, pas par ce store).
 */
export function setPendingNavigationFollowPromptIntent({appId, gameName}) {
  if (pendingNavigationInitialNotification) {
    return;
  }
  pendingNavigationInitialNotification = {
    source: 'follow_prompt_action',
    data: {
      appId: String(appId || ''),
      gameName: String(gameName || ''),
    },
  };
}

/**
 * Consommation metier : lecture unique pour rejouer les side-effects
 * applicatifs une fois le tree React disponible.
 */
export function consumePendingNotification() {
  const notification = pendingInitialNotification;
  pendingInitialNotification = null;
  return notification;
}

/**
 * Consommation navigation : lecture unique dediee au choix de l'ecran
 * d'atterrissage du premier render.
 */
export function consumeNavigationInitialNotification() {
  const notification = pendingNavigationInitialNotification;
  pendingNavigationInitialNotification = null;
  return notification;
}

export function isInitialNotificationBootstrapResolved() {
  return initialNotificationBootstrapResolved;
}

export function markInitialNotificationBootstrapResolved() {
  if (initialNotificationBootstrapResolved) {
    return;
  }

  initialNotificationBootstrapResolved = true;
  bootstrapListeners.forEach(listener => {
    try {
      listener(true);
    } catch (_) {}
  });
}

export function subscribeInitialNotificationBootstrap(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  bootstrapListeners.add(listener);
  return () => {
    bootstrapListeners.delete(listener);
  };
}
