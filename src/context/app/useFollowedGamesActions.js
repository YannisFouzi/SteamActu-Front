import {useCallback, useEffect, useState} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {
  applyLocalFollowState,
  buildFollowGameRef,
  normalizeFollowAppId,
  readPendingFollowMutations,
} from '../../services/followStateLocalStore';
import {
  queueFollowSync,
  reconcilePendingFollowMutations,
  syncQueuedFollow,
} from '../../services/followSync';
import {getGameAppId, getGameIconUrl} from '../../utils';

const buildPendingFollowStates = pendingMutations =>
  Object.values(pendingMutations || {}).reduce((acc, mutation) => {
    if (mutation?.appId) {
      acc[String(mutation.appId)] = Boolean(mutation.targetIsFollowed);
    }
    return acc;
  }, {});

export const useFollowedGamesActions = ({
  steamId,
  user,
  setUser,
  games,
  setGames,
  persistGamesCache,
  persistGamesVersion,
  markSkipNextGamesRefresh,
  notifyNotificationSync,
}) => {
  const [pendingFollowStates, setPendingFollowStates] = useState({});

  const refreshPendingFollowStates = useCallback(async () => {
    if (!steamId) {
      setPendingFollowStates({});
      return {};
    }

    const pendingMutations = await readPendingFollowMutations(steamId);
    setPendingFollowStates(buildPendingFollowStates(pendingMutations));
    return pendingMutations;
  }, [steamId]);

  useEffect(() => {
    let isActive = true;

    const hydrateAndReconcile = async () => {
      if (!steamId) {
        if (isActive) {
          setPendingFollowStates({});
        }
        return;
      }

      try {
        const requeuedCount = await reconcilePendingFollowMutations({steamId});
        if (requeuedCount > 0) {
          debugLog('[FOLLOW] Reconciliation re-enqueued orphan mutations', {
            count: requeuedCount,
          });
          syncQueuedFollow({steamId, reason: 'boot-reconcile'}).catch(error => {
            debugError('[FOLLOW] Reconciliation sync failed:', error);
          });
        }
      } catch (error) {
        debugError('[FOLLOW] Reconciliation failed:', error);
      }

      try {
        const pendingMutations = await readPendingFollowMutations(steamId);
        if (isActive) {
          setPendingFollowStates(buildPendingFollowStates(pendingMutations));
        }
      } catch (error) {
        debugError('[FOLLOW] Pending follow hydration failed:', error);
      }
    };

    hydrateAndReconcile();

    return () => {
      isActive = false;
    };
  }, [steamId]);

  const setPendingFollowState = useCallback((appId, isFollowed) => {
    const normalizedAppId = normalizeFollowAppId(appId);
    if (!normalizedAppId) {
      return;
    }

    setPendingFollowStates(previousState => ({
      ...previousState,
      [normalizedAppId]: Boolean(isFollowed),
    }));
  }, []);

  const clearPendingFollowState = useCallback(appId => {
    const normalizedAppId = normalizeFollowAppId(appId);
    if (!normalizedAppId) {
      return;
    }

    setPendingFollowStates(previousState => {
      if (!Object.prototype.hasOwnProperty.call(previousState, normalizedAppId)) {
        return previousState;
      }

      const nextState = {...previousState};
      delete nextState[normalizedAppId];
      return nextState;
    });
  }, []);

  const isGameFollowed = useCallback(
    appId => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString) {
        return false;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          pendingFollowStates,
          appIdString,
        )
      ) {
        return pendingFollowStates[appIdString];
      }

      return !!user?.followedGames && user.followedGames.includes(appIdString);
    },
    [pendingFollowStates, user],
  );

  const getResolvedFollowState = useCallback(
    (appId, fallbackValue) => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString) {
        return typeof fallbackValue === 'boolean' ? fallbackValue : false;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          pendingFollowStates,
          appIdString,
        )
      ) {
        return pendingFollowStates[appIdString];
      }

      if (Array.isArray(user?.followedGames)) {
        return user.followedGames.includes(appIdString);
      }

      return typeof fallbackValue === 'boolean' ? fallbackValue : false;
    },
    [pendingFollowStates, user],
  );

  // L'UI ne désactive plus les boutons pendant une mutation : l'état optimiste
  // (pendingFollowStates, synchrone) est la source de vérité, et la file +
  // le mutex de queueLocalFollowMutation sérialisent déjà l'I/O. Un re-tap
  // rapide lit l'état optimiste à jour et bascule correctement. Conservé pour
  // compat du contrat (consommé par FollowToggle), renvoie toujours false.
  const isFollowPending = useCallback(() => false, []);

  // Maintien optimiste de user.mutedGames (jeux suivis avec notifications
  // coupées — bouton +). Source serveur : User.toJSON expose mutedGames ;
  // localement on le fait évoluer au même rythme que les actions.
  const updateUserMutedGames = useCallback(
    (appId, muted) => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString) {
        return;
      }
      setUser(prevUser => {
        if (!prevUser) {
          return prevUser;
        }
        const mutedSet = new Set(
          Array.isArray(prevUser.mutedGames)
            ? prevUser.mutedGames.map(String)
            : [],
        );
        if (muted) {
          mutedSet.add(appIdString);
        } else {
          mutedSet.delete(appIdString);
        }
        return {...prevUser, mutedGames: Array.from(mutedSet)};
      });
    },
    [setUser],
  );

  // true = suivi ET notifications actives (cloche pleine). Un jeu non suivi ou
  // en suivi silencieux renvoie false.
  const isGameNotified = useCallback(
    appId => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString || !isGameFollowed(appIdString)) {
        return false;
      }
      return !(
        Array.isArray(user?.mutedGames) &&
        user.mutedGames.map(String).includes(appIdString)
      );
    },
    [isGameFollowed, user],
  );

  // Cœur unique : applique l'état désiré {followed, notifications} d'un jeu.
  // L'état optimiste (pendingFollowStates + mutedGames + listes) est appliqué
  // en MÉMOIRE, SYNCHRONEMENT → l'UI est instantanée. La persistance locale et
  // la synchro réseau partent en ARRIÈRE-PLAN (best-effort) : l'UI n'attend
  // JAMAIS AsyncStorage, donc pas de latence ni de timeout/erreur sous spam.
  const commitFollowMutation = useCallback(
    ({appId, targetIsFollowed, notifications, meta = {}}) => {
      const appIdString = normalizeFollowAppId(appId);
      if (!steamId || !appIdString) {
        return false;
      }
      const wantsNotifications = notifications !== false;

      // ── Optimiste synchrone (un seul batch React) ──
      setPendingFollowState(appIdString, targetIsFollowed);
      updateUserMutedGames(
        appIdString,
        targetIsFollowed && !wantsNotifications,
      );

      // gameRef : `meta` (ex. résultat de recherche, jeu hors liste locale)
      // prime, puis le jeu de la liste locale, puis fallback.
      const game = games.find(g => getGameAppId(g) === appIdString);
      const gameName =
        meta.name ||
        game?.name ||
        translate('common.gameWithId', {appId: appIdString});
      const gameImage =
        meta.imageUrl ||
        meta.logoUrl ||
        game?.header_image ||
        game?.capsule ||
        (game ? getGameIconUrl(appIdString, game.img_icon_url) : '') ||
        '';
      const gameRef = buildFollowGameRef({
        ...(game || {}),
        ...meta,
        appId: appIdString,
        name: gameName,
        imageUrl: gameImage,
      });
      const mutationUpdatedAt = Date.now();

      // ── Listes en mémoire (instantané) + persistance locale en arrière-plan ──
      applyLocalFollowState({
        steamId,
        appId: appIdString,
        targetIsFollowed,
        gameRef,
        setUser,
        setGames,
        updatedAt: mutationUpdatedAt,
        notifications: wantsNotifications,
      });

      // ── Enqueue offline + synchro réseau EN ARRIÈRE-PLAN (best-effort) ──
      // L'UI ne bloque pas dessus ; une écriture/synchro lente n'est PAS une
      // erreur utilisateur. La file gère ses propres retries/échecs permanents.
      queueFollowSync({
        steamId,
        appId: appIdString,
        targetIsFollowed,
        gameRef,
        updatedAt: mutationUpdatedAt,
        notifications: wantsNotifications,
      })
        .then(() => syncQueuedFollow({steamId, reason: 'follow-commit'}))
        .catch(error => {
          debugError('[FOLLOW] Sync arrière-plan échouée:', error);
        })
        .finally(() => {
          refreshPendingFollowStates().catch(error => {
            debugError('[FOLLOW] Pending follow refresh failed:', error);
          });
        });

      if (typeof notifyNotificationSync === 'function' && !targetIsFollowed) {
        notifyNotificationSync('wishlist', appIdString);
        notifyNotificationSync('followed', appIdString);
        notifyNotificationSync('news', appIdString);
      }
      if (typeof markSkipNextGamesRefresh === 'function') {
        markSkipNextGamesRefresh();
      }
      debugLog(
        targetIsFollowed
          ? `[FOLLOW] Commit suivi (${
              wantsNotifications ? 'notifié' : 'silencieux'
            }):`
          : '[FOLLOW] Commit désabonnement:',
        appIdString,
      );
      return true;
    },
    [
      games,
      markSkipNextGamesRefresh,
      notifyNotificationSync,
      refreshPendingFollowStates,
      setGames,
      setPendingFollowState,
      setUser,
      steamId,
      updateUserMutedGames,
    ],
  );

  // Bascule cloche d'un jeu déjà suivi : passe par le MÊME pipeline que le
  // follow (commitFollowMutation), avec `targetIsFollowed:true` (reste suivi)
  // et le niveau voulu. L'overlay protège l'état muté au refresh ; la file
  // converge serveur (POST idempotent → PUT). Plus de PUT direct/amend/404.
  const handleToggleGameNotifications = useCallback(
    async (appId, meta = {}) => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString || !isGameFollowed(appIdString)) {
        return false;
      }
      const nextEnabled = !isGameNotified(appIdString);
      return commitFollowMutation({
        appId: appIdString,
        targetIsFollowed: true,
        notifications: nextEnabled,
        // name/imageUrl préservent la card : sans eux, le gameRef retombe sur
        // un placeholder "Jeu <id>" qui écrasait le vrai nom/image en cache
        // (cas des jeux hors liste locale : wishlist, jeux suivis).
        meta,
      });
    },
    [commitFollowMutation, isGameFollowed, isGameNotified],
  );

  const applyNotificationUnfollowCommit = useCallback(
    async ({appId, followedGames = null, gamesVersion = null} = {}) => {
      const appIdString = normalizeFollowAppId(appId);
      if (!appIdString) {
        return;
      }

      let nextGames = null;

      clearPendingFollowState(appIdString);

      setGames(currentGames => {
        if (!Array.isArray(currentGames) || currentGames.length === 0) {
          return currentGames;
        }

        nextGames = currentGames.map(game => {
          if (getGameAppId(game) !== appIdString) {
            return game;
          }

          return {
            ...game,
            isFollowed: false,
          };
        });

        return nextGames;
      });

      if (Array.isArray(nextGames)) {
        await persistGamesCache(nextGames, steamId);
      }

      if (gamesVersion) {
        await persistGamesVersion(gamesVersion, steamId, {
          reason: 'notificationUnfollow',
        });
      }

      setUser(prevUser => {
        if (!prevUser) {
          return prevUser;
        }

        const nextFollowedGames = Array.isArray(followedGames)
          ? followedGames.map(id => String(id))
          : Array.isArray(prevUser.followedGames)
            ? prevUser.followedGames.filter(id => String(id) !== appIdString)
            : [];

        return {
          ...prevUser,
          followedGames: nextFollowedGames,
          // Plus suivi = plus muté non plus
          mutedGames: Array.isArray(prevUser.mutedGames)
            ? prevUser.mutedGames.filter(id => String(id) !== appIdString)
            : prevUser.mutedGames,
        };
      });

      if (typeof markSkipNextGamesRefresh === 'function') {
        markSkipNextGamesRefresh();
      }
    },
    [
      clearPendingFollowState,
      markSkipNextGamesRefresh,
      persistGamesCache,
      persistGamesVersion,
      setGames,
      setUser,
      steamId,
    ],
  );

  // Suivre/désabonner : calcule l'état cible et délègue au commit unique.
  const handleFollowGame = useCallback(
    async (gameMeta = {}) => {
      const appIdString = normalizeFollowAppId(
        gameMeta?.appId ?? gameMeta?.appid,
      );
      if (!appIdString) {
        debugError('AppID non trouve');
        return false;
      }
      const isFollowed = getResolvedFollowState(
        appIdString,
        typeof gameMeta.isFollowed === 'boolean' ? gameMeta.isFollowed : undefined,
      );
      return commitFollowMutation({
        appId: appIdString,
        targetIsFollowed: !isFollowed,
        // notifications:false = suivi silencieux (bouton +). Ignoré sur unfollow.
        notifications: gameMeta.notifications,
        meta: gameMeta,
      });
    },
    [commitFollowMutation, getResolvedFollowState],
  );

  return {
    applyNotificationUnfollowCommit,
    handleFollowGame,
    handleToggleGameNotifications,
    getResolvedFollowState,
    isGameFollowed,
    isGameNotified,
    isFollowPending,
  };
};
