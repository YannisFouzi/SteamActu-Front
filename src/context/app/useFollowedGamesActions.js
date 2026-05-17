import {useCallback, useEffect, useRef, useState} from 'react';
import {showAlert, debugError, debugLog} from '../../hooks/hooksLogger';
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
  const followRequestsInFlightRef = useRef(new Set());
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

    return followRequestsInFlightRef.current.has(appIdString);
  }, []);

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

      try {
        if (!steamId) {
          debugError('SteamID non trouve');
          return false;
        }

        if (!appIdString) {
          debugError('AppID non trouve');
          return false;
        }

        if (followRequestsInFlightRef.current.has(appIdString)) {
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

        followRequestsInFlightRef.current.add(appIdString);
        setPendingFollowState(appIdString, targetIsFollowed);

        const mutationUpdatedAt = Date.now();

        const enqueued = await queueFollowSync({
          steamId,
          appId: appIdString,
          targetIsFollowed,
          gameRef,
          updatedAt: mutationUpdatedAt,
        });

        if (!enqueued) {
          throw new Error('Failed to enqueue follow sync task');
        }

        const mutation = await applyLocalFollowState({
          steamId,
          appId: appIdString,
          targetIsFollowed,
          gameRef,
          setUser,
          setGames,
          updatedAt: mutationUpdatedAt,
        });

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
      markSkipNextGamesRefresh,
      notifyNotificationSync,
      refreshPendingFollowStates,
      setGames,
      setPendingFollowState,
      setUser,
      steamId,
    ],
  );

  return {
    applyNotificationUnfollowCommit,
    handleFollowGame,
    getResolvedFollowState,
    isGameFollowed,
    isFollowPending,
  };
};
