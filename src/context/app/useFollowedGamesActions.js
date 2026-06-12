import {useCallback, useEffect, useRef, useState} from 'react';
import {showAlert, debugError, debugLog} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {userService} from '../../services/api';
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

// Garde anti double-tap auto-réparante : une entrée in-flight plus vieille que
// ce TTL est considérée morte (opération locale qui a pendu) et n'est plus
// bloquante. Sans ça, un hang AsyncStorage laissait les boutons d'un jeu
// définitivement désactivés jusqu'au restart de l'app (vécu en prod).
const FOLLOW_REQUEST_TTL_MS = 15_000;

// Borne dure sur les opérations locales awaited (queue + écriture des caches) :
// handleFollowGame doit TOUJOURS terminer pour que son finally nettoie la
// garde. Le nom de l'opération est loggué au déclenchement → si un hang se
// reproduit, on saura exactement quelle primitive a pendu.
const LOCAL_OP_TIMEOUT_MS = 10_000;

const withLocalOpTimeout = async (promise, opName) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Local follow op timed out: ${opName}`));
    }, LOCAL_OP_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

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
  // Map appId → timestamp de départ (TTL, voir FOLLOW_REQUEST_TTL_MS)
  const followRequestsInFlightRef = useRef(new Map());
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

  const isFollowPending = useCallback(appId => {
    const appIdString = normalizeFollowAppId(appId);
    if (!appIdString) {
      return false;
    }

    const startedAt = followRequestsInFlightRef.current.get(appIdString);
    if (typeof startedAt !== 'number') {
      return false;
    }

    // Auto-réparation : une entrée au-delà du TTL = opération locale qui a
    // pendu. On la purge pour réactiver les boutons sans restart de l'app.
    if (Date.now() - startedAt > FOLLOW_REQUEST_TTL_MS) {
      followRequestsInFlightRef.current.delete(appIdString);
      debugError(
        '[FOLLOW] Garde in-flight expirée (op locale pendue ?):',
        appIdString,
      );
      return false;
    }

    return true;
  }, []);

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

  // Bascule cloche d'un jeu déjà suivi : optimiste + revert si échec. Appel
  // direct (pas la queue offline) — préférence serveur légère, même pattern
  // que le SPA web ; le pire cas d'un échec réseau est un revert visuel.
  const handleToggleGameNotifications = useCallback(
    async appId => {
      const appIdString = normalizeFollowAppId(appId);
      if (!steamId || !appIdString) {
        return false;
      }

      const nextEnabled = !isGameNotified(appIdString);
      updateUserMutedGames(appIdString, !nextEnabled);

      try {
        await userService.setFollowNotifications(
          steamId,
          appIdString,
          nextEnabled,
        );
        debugLog(
          nextEnabled
            ? '[FOLLOW] Notifications réactivées:'
            : '[FOLLOW] Notifications coupées (suivi silencieux):',
          appIdString,
        );
        return true;
      } catch (error) {
        debugError('Erreur bascule notifications du jeu:', error);
        updateUserMutedGames(appIdString, nextEnabled); // revert
        showAlert(
          translate('common.error'),
          translate('games.followUpdateError'),
        );
        return false;
      }
    },
    [isGameNotified, steamId, updateUserMutedGames],
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

  const handleFollowGame = useCallback(
    async (gameMeta = {}) => {
      const appIdString = normalizeFollowAppId(gameMeta?.appId ?? gameMeta?.appid);
      // Déclaré hors du try : le catch doit pouvoir restaurer l'état muted
      // capturé avant la mutation optimiste.
      let wasMuted = false;
      let mutedTouched = false;

      try {
        if (!steamId) {
          debugError('SteamID non trouve');
          return false;
        }

        if (!appIdString) {
          debugError('AppID non trouve');
          return false;
        }

        if (isFollowPending(appIdString)) {
          debugLog('[FOLLOW] Action ignoree, mutation locale deja en cours:', appIdString);
          return false;
        }

        const isFollowed = getResolvedFollowState(
          appIdString,
          typeof gameMeta.isFollowed === 'boolean'
            ? gameMeta.isFollowed
            : undefined,
        );
        const targetIsFollowed = !isFollowed;
        // notifications:false = suivi silencieux (bouton +). N'a de sens que
        // pour un follow ; ignoré sur un unfollow.
        const wantsNotifications = gameMeta.notifications !== false;
        const game = games.find(g => getGameAppId(g) === appIdString);
        const gameName =
          gameMeta.name ||
          game?.name ||
          translate('common.gameWithId', {appId: appIdString});
        const gameImage =
          gameMeta.imageUrl ||
          gameMeta.logoUrl ||
          game?.header_image ||
          game?.capsule ||
          (game ? getGameIconUrl(appIdString, game.img_icon_url) : '') ||
          '';
        const gameRef = buildFollowGameRef({
          ...(game || {}),
          ...gameMeta,
          appId: appIdString,
          name: gameName,
          imageUrl: gameImage,
        });

        // Capturé AVANT la mutation optimiste pour pouvoir le restaurer en cas
        // d'échec (revert propre des deux états).
        wasMuted =
          Array.isArray(user?.mutedGames) &&
          user.mutedGames.map(String).includes(appIdString);
        mutedTouched = true;

        followRequestsInFlightRef.current.set(appIdString, Date.now());
        setPendingFollowState(appIdString, targetIsFollowed);
        // mutedGames optimiste DANS LE MÊME batch React que le pending follow
        // — sinon la cloche voit "suivi + non muté" pendant les écritures
        // AsyncStorage ci-dessous et flashe vert sur un suivi silencieux.
        updateUserMutedGames(
          appIdString,
          targetIsFollowed && !wantsNotifications,
        );

        const mutationUpdatedAt = Date.now();

        const enqueued = await withLocalOpTimeout(
          queueFollowSync({
            steamId,
            appId: appIdString,
            targetIsFollowed,
            gameRef,
            updatedAt: mutationUpdatedAt,
            notifications: wantsNotifications,
          }),
          'queueFollowSync',
        );

        if (!enqueued) {
          throw new Error('Failed to enqueue follow sync task');
        }

        const mutation = await withLocalOpTimeout(
          applyLocalFollowState({
            steamId,
            appId: appIdString,
            targetIsFollowed,
            gameRef,
            setUser,
            setGames,
            updatedAt: mutationUpdatedAt,
            notifications: wantsNotifications,
          }),
          'applyLocalFollowState',
        );

        if (!mutation) {
          throw new Error('Local follow mutation was not created');
        }

        syncQueuedFollow({
          steamId,
          reason: 'follow-toggle',
        })
          .catch(error => {
            debugError('[FOLLOW] Sync follow differee apres mutation locale:', error);
          })
          .finally(() => {
            refreshPendingFollowStates().catch(error => {
              debugError('[FOLLOW] Pending follow refresh failed:', error);
            });
          });

        if (
          typeof notifyNotificationSync === 'function' &&
          !targetIsFollowed
        ) {
          notifyNotificationSync('wishlist', appIdString);
          notifyNotificationSync('followed', appIdString);
          notifyNotificationSync('news', appIdString);
        }

        debugLog(
          targetIsFollowed
            ? '[FOLLOW] Jeu suivi localement:'
            : '[FOLLOW] Jeu retire localement des suivis:',
          gameName,
        );

        if (typeof markSkipNextGamesRefresh === 'function') {
          markSkipNextGamesRefresh();
        }

        return true;
      } catch (error) {
        debugError('Erreur lors de la modification locale du suivi:', error);
        // Revert de la mutation optimiste mutedGames (posée avant les awaits)
        if (mutedTouched) {
          updateUserMutedGames(appIdString, wasMuted);
        }
        await refreshPendingFollowStates().catch(refreshError => {
          debugError('[FOLLOW] Pending follow refresh failed:', refreshError);
        });
        showAlert(
          translate('common.error'),
          translate('games.followUpdateUnexpectedError'),
        );
        return false;
      } finally {
        if (appIdString) {
          followRequestsInFlightRef.current.delete(appIdString);
        }
      }
    },
    [
      games,
      getResolvedFollowState,
      isFollowPending,
      markSkipNextGamesRefresh,
      notifyNotificationSync,
      refreshPendingFollowStates,
      setGames,
      setPendingFollowState,
      setUser,
      steamId,
      updateUserMutedGames,
      user,
    ],
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
