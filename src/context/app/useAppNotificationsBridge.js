import {useEffect} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {navigateToFollowedGamesTab} from '../../services/navigationService';
import {
  registerFCMToken,
  setupNotificationHandlers,
} from '../../services/notificationService';
import {consumeNotificationActionsForSteamId} from '../../services/notifications/actionJournal';
import {consumePendingFollowConfirms} from '../../services/pendingFollowConfirmStore';
import {
  requiresNotifications,
  USER_SETTINGS_STATUS,
} from './userSettingsHelpers';

const NOTIFICATION_REGISTRATION_DELAY_MS = 1500;

export const useAppNotificationsBridge = ({
  steamId,
  settingsStatus,
  newsNotifications,
  libraryFollowMode,
  wishlistFollowMode,
  notifyNotificationSync,
  onNotificationUnfollowCommitted,
  setUser,
  pendingFollowsRef,
}) => {
  useEffect(() => {
    let cleanupNotifications;
    let canceled = false;
    let registrationTimeout = null;

    async function initializeNotifications() {
      try {
        const needsNotifications = requiresNotifications(
          newsNotifications,
          libraryFollowMode,
          wishlistFollowMode,
        );

        if (
          canceled ||
          !steamId ||
          settingsStatus !== USER_SETTINGS_STATUS.READY
        ) {
          return;
        }

        if (needsNotifications) {
          debugLog(
            '[FCM] Preferences notifications actives -> tentative enregistrement token',
          );
          const result = await registerFCMToken(steamId);

          if (!result?.success) {
            debugLog(
              `[FCM] Impossible de re-enregistrer le token (status=${result?.status})`,
            );
          }
        } else {
          debugLog('[FCM] Notifications inactives -> enregistrement ignore');
        }
      } catch (error) {
        debugError(
          '[FCM] Erreur lors de la lecture des preferences FCM:',
          error,
        );
      }
    }

    // Side-effects React pour un follow_prompt confirme :
    // optimistic update, sync, et navigation immediate si le navigator existe
    // deja. Le cold-start, lui, est gere via l'etat initial de navigation.
    const applyFollowConfirm = (appId, gameName = '', options = {}) => {
      const {shouldNavigate = true} = options;

      if (!appId) {
        return;
      }
      const appIdString = String(appId);
      const trimmedName = String(gameName || '').trim();

      if (pendingFollowsRef?.current) {
        pendingFollowsRef.current.add(appIdString);
      }
      setUser(prevUser => {
        if (!prevUser) {
          return prevUser;
        }
        const current = Array.isArray(prevUser.followedGames)
          ? prevUser.followedGames.slice()
          : [];
        if (current.includes(appIdString)) {
          return prevUser;
        }
        return {
          ...prevUser,
          followedGames: [...current, appIdString],
        };
      });

      if (shouldNavigate) {
        navigateToFollowedGamesTab({
          initialSort: 'recent',
          confirmedGameName: trimmedName || undefined,
        });
      }

      notifyNotificationSync('followed', appIdString);
    };

    if (steamId) {
      debugLog('[FCM] Configuration des notifications pour:', steamId);

      consumeNotificationActionsForSteamId(steamId)
        .then(async actions => {
          if (canceled || !Array.isArray(actions) || actions.length === 0) {
            return;
          }

          for (const action of actions) {
            if (action?.kind !== 'unfollow' || !action?.appId) {
              continue;
            }

            try {
              if (typeof onNotificationUnfollowCommitted === 'function') {
                await onNotificationUnfollowCommitted({
                  appId: action.appId,
                  followedGames: action.followedGames,
                  gamesVersion: action.gamesVersion,
                });
              }

              notifyNotificationSync('news', action.appId);
              notifyNotificationSync('wishlist', action.appId);
              notifyNotificationSync('followed', action.appId);
            } catch (syncError) {
              debugError(
                '[FCM] Erreur lors de la consommation des actions de notification:',
                syncError,
              );
            }
          }
        })
        .catch(error => {
          debugError(
            '[FCM] Erreur lecture journal d actions notification:',
            error,
          );
        });

      cleanupNotifications = setupNotificationHandlers(steamId, {
        onNotificationUnfollowCommitted,
        onNewsUnfollow: appId => notifyNotificationSync('news', appId),
        onWishlistUnfollow: appId => notifyNotificationSync('wishlist', appId),
        onFollowedGamesTabUnfollow: appId =>
          notifyNotificationSync('followed', appId),
        onFollowPromptConfirm: applyFollowConfirm,
      });

      // Drain headless au cold-start : on rejoue l'optimistic update + sync,
      // mais pas la navigation. L'ecran cible est deja fourni au navigator
      // via son etat initial.
      const queuedConfirms = consumePendingFollowConfirms();
      if (queuedConfirms.length > 0) {
        debugLog(
          `[FCM] Drain pendingFollowConfirms (count=${queuedConfirms.length})`,
        );
        for (const entry of queuedConfirms) {
          applyFollowConfirm(entry.appId, entry.gameName, {
            shouldNavigate: false,
          });
        }
      }

      registrationTimeout = setTimeout(() => {
        if (!canceled && settingsStatus === USER_SETTINGS_STATUS.READY) {
          initializeNotifications();
        }
      }, NOTIFICATION_REGISTRATION_DELAY_MS);
    }

    return () => {
      canceled = true;
      if (registrationTimeout !== null) {
        clearTimeout(registrationTimeout);
      }
      if (cleanupNotifications) {
        debugLog('[FCM] Nettoyage des handlers de notifications');
        cleanupNotifications();
      }
    };
  }, [
    libraryFollowMode,
    newsNotifications,
    notifyNotificationSync,
    onNotificationUnfollowCommitted,
    pendingFollowsRef,
    setUser,
    settingsStatus,
    steamId,
    wishlistFollowMode,
  ]);
};
