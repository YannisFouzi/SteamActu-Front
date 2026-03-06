/**
 * Store ephemere pour la notification initiale (cold start).
 *
 * Quand l'app est lancee par un tap sur une notification, l'intent initial
 * doit etre capture le plus tot possible (dans index.js, avant le render React).
 * Ce module stocke cet intent en memoire pour qu'il soit consomme plus tard
 * par setupNotificationHandlers quand steamId est disponible.
 *
 * Le store se vide apres consommation (lecture unique).
 */

let pendingInitialNotification = null;

/**
 * Stocke la notification initiale detectee au bootstrap.
 * @param {{ source: 'firebase' | 'notifee', data: object }} notification
 */
export function setPendingNotification(notification) {
  if (!pendingInitialNotification) {
    pendingInitialNotification = notification;
  }
}

/**
 * Recupere et vide la notification initiale.
 * Retourne null si aucune notification en attente.
 * @returns {{ source: 'firebase' | 'notifee', data: object } | null}
 */
export function consumePendingNotification() {
  const notification = pendingInitialNotification;
  pendingInitialNotification = null;
  return notification;
}
