/**
 * File d'attente FIFO pour les follow_prompt confirmés en headless.
 *
 * Quand l'utilisateur tape une notif `follow_prompt` et que l'app n'est PAS
 * en foreground, le handler Notifee `handleBackgroundNotifeeEvent` exécute le
 * POST /follow sans accès au React tree (donc sans `onFollowPromptConfirm`).
 *
 * On enqueue ici l'intent (`{appId, gameName}`) pour que `useAppNotificationsBridge`,
 * une fois monté, draine la queue et déclenche les side-effects (optimistic update,
 * navigation vers "Jeux suivis", toast de confirmation).
 *
 * Couvre les cas :
 *   - background non-killed (process JS vivant, app pas active)
 *   - cold-killed (process JS recréé) — combiné au clear de `initialNotificationStore`
 *     dans `handleBackgroundNotifeeEvent` pour éviter une double exécution.
 */

let queue = [];

export const pushPendingFollowConfirm = (appId, gameName = '') => {
  if (!appId) {
    return;
  }
  queue.push({
    appId: String(appId),
    gameName: String(gameName || ''),
  });
};

export const consumePendingFollowConfirms = () => {
  const drained = queue;
  queue = [];
  return drained;
};
