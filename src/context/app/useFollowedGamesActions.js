import {useCallback, useRef, useState} from 'react';
import {showAlert, debugError, debugLog} from '../../hooks/hooksLogger';
import {translate} from '../../i18n';
import {userService} from '../../services/api';
import {getGameAppId, getGameIconUrl} from '../../utils';

export const useFollowedGamesActions = ({
  steamId,
  user,
  setUser,
  games,
  setGames,
  persistGamesCache,
  persistGamesVersion,
  markSkipNextGamesRefresh,
}) => {
  const followRequestsInFlightRef = useRef(new Set());
  const [optimisticFollowStates, setOptimisticFollowStates] = useState({});

  const setOptimisticFollowState = useCallback((appId, isFollowed) => {
    if (!appId) {
      return;
    }

    setOptimisticFollowStates(previousState => ({
      ...previousState,
      [String(appId)]: Boolean(isFollowed),
    }));
  }, []);

  const clearOptimisticFollowState = useCallback(appId => {
    if (!appId) {
      return;
    }

    setOptimisticFollowStates(previousState => {
      const appIdString = String(appId);
      if (!Object.prototype.hasOwnProperty.call(previousState, appIdString)) {
        return previousState;
      }

      const nextState = {...previousState};
      delete nextState[appIdString];
      return nextState;
    });
  }, []);

  const isGameFollowed = useCallback(
    appId => {
      if (!appId) {
        return false;
      }

      const appIdString = String(appId);

      if (
        Object.prototype.hasOwnProperty.call(
          optimisticFollowStates,
          appIdString,
        )
      ) {
        return optimisticFollowStates[appIdString];
      }

      return !!user?.followedGames && user.followedGames.includes(appIdString);
    },
    [optimisticFollowStates, user],
  );

  const getResolvedFollowState = useCallback(
    (appId, fallbackValue) => {
      if (!appId) {
        return typeof fallbackValue === 'boolean' ? fallbackValue : false;
      }

      const appIdString = String(appId);

      if (
        Object.prototype.hasOwnProperty.call(
          optimisticFollowStates,
          appIdString,
        )
      ) {
        return optimisticFollowStates[appIdString];
      }

      if (Array.isArray(user?.followedGames)) {
        return user.followedGames.includes(appIdString);
      }

      return typeof fallbackValue === 'boolean' ? fallbackValue : false;
    },
    [optimisticFollowStates, user],
  );

  const isFollowPending = useCallback(appId => {
    if (!appId) {
      return false;
    }

    return followRequestsInFlightRef.current.has(String(appId));
  }, []);

  const handleFollowGame = useCallback(
    async (gameMeta = {}) => {
      try {
        if (!steamId) {
          debugError('SteamID non trouve');
          return false;
        }

        const rawAppId = gameMeta?.appId ?? gameMeta?.appid;
        if (!rawAppId) {
          debugError('AppID non trouve');
          return false;
        }

        const appIdString = rawAppId.toString();

        if (followRequestsInFlightRef.current.has(appIdString)) {
          debugLog('[FOLLOW] Action ignoree, requete deja en cours:', appIdString);
          return false;
        }

        const isFollowed =
          typeof gameMeta.isFollowed === 'boolean'
            ? gameMeta.isFollowed
            : isGameFollowed(appIdString);

        followRequestsInFlightRef.current.add(appIdString);
        setOptimisticFollowState(appIdString, !isFollowed);

        debugLog('=== Debut handleFollowGame ===');
        debugLog('AppID recu:', appIdString);
        debugLog(
          'Etat isFollowed (fourni):',
          typeof gameMeta.isFollowed === 'boolean'
            ? gameMeta.isFollowed
            : 'non fourni',
        );
        debugLog('Nombre total de jeux:', games.length);

        const game = games.find(g => getGameAppId(g) === appIdString);

        const gameName =
          gameMeta.name ||
          game?.name ||
          translate('common.gameWithId', {appId: appIdString});
        const gameIcon =
          gameMeta.imageUrl ||
          gameMeta.logoUrl ||
          (game ? getGameIconUrl(appIdString, game.img_icon_url) : '') ||
          '';

        debugLog('Jeu cible:', gameName);

        const previousGames = games;
        let localToggleApplied = false;
        let optimisticGames = games;

        if (game) {
          const updatedGames = games.map(g => {
            if (getGameAppId(g) === appIdString) {
              localToggleApplied = true;
              return {...g, isFollowed: !isFollowed};
            }
            return g;
          });

          if (localToggleApplied) {
            setGames(updatedGames);
            optimisticGames = updatedGames;
          }
        }

        try {
          if (!isFollowed) {
            const followResponse = await userService.followGame(
              steamId,
              appIdString,
              gameName,
              gameIcon,
            );
            const updatedUser = followResponse?.data;
            if (updatedUser?.gamesVersion) {
              await persistGamesVersion(updatedUser.gamesVersion, steamId, {
                reason: 'followGame',
              });
            }
            debugLog('Jeu suivi avec succes:', gameName);

            if (updatedUser) {
              setUser(updatedUser);
            } else {
              setUser(prevUser => {
                if (!prevUser) {
                  return prevUser;
                }

                const current = Array.isArray(prevUser.followedGames)
                  ? prevUser.followedGames.slice()
                  : [];

                if (current.includes(appIdString)) {
                  return {...prevUser, followedGames: current};
                }

                return {
                  ...prevUser,
                  followedGames: [...current, appIdString],
                };
              });
            }

            clearOptimisticFollowState(appIdString);
          } else {
            const unfollowResponse = await userService.unfollowGame(
              steamId,
              appIdString,
            );
            const updatedUser = unfollowResponse?.data;
            if (updatedUser?.gamesVersion) {
              await persistGamesVersion(updatedUser.gamesVersion, steamId, {
                reason: 'unfollowGame',
              });
            }
            debugLog('Jeu retire des suivis:', gameName);

            if (updatedUser) {
              setUser(updatedUser);
            } else {
              setUser(prevUser => {
                if (!prevUser) {
                  return prevUser;
                }

                const current = Array.isArray(prevUser.followedGames)
                  ? prevUser.followedGames.slice()
                  : [];

                return {
                  ...prevUser,
                  followedGames: current.filter(id => id !== appIdString),
                };
              });
            }

            clearOptimisticFollowState(appIdString);
          }

          if (typeof markSkipNextGamesRefresh === 'function') {
            markSkipNextGamesRefresh();
          }

          if (localToggleApplied) {
            await persistGamesCache(optimisticGames, steamId);
          }

          debugLog('=== Fin handleFollowGame (succes) ===');
          return true;
        } catch (apiError) {
          debugError('Erreur API lors de la modification du suivi:', apiError);

          if (localToggleApplied) {
            setGames(previousGames);
            await persistGamesCache(previousGames, steamId);
          }

          clearOptimisticFollowState(appIdString);

          showAlert(
            translate('common.error'),
            translate('games.followUpdateError'),
          );
          return false;
        }
      } catch (error) {
        debugError('Erreur lors de la modification du suivi:', error);
        const failedAppId = gameMeta?.appId ?? gameMeta?.appid;
        if (failedAppId) {
          clearOptimisticFollowState(failedAppId);
        }
        showAlert(
          translate('common.error'),
          translate('games.followUpdateUnexpectedError'),
        );
        return false;
      } finally {
        const rawAppId = gameMeta?.appId ?? gameMeta?.appid;
        if (rawAppId) {
          followRequestsInFlightRef.current.delete(rawAppId.toString());
        }
      }
    },
    [
      games,
      clearOptimisticFollowState,
      isGameFollowed,
      markSkipNextGamesRefresh,
      persistGamesCache,
      persistGamesVersion,
      setOptimisticFollowState,
      setGames,
      setUser,
      steamId,
    ],
  );

  return {
    handleFollowGame,
    getResolvedFollowState,
    isGameFollowed,
    isFollowPending,
  };
};
