import {useCallback, useRef} from 'react';
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

  const isGameFollowed = useCallback(
    appId => !!user?.followedGames && user.followedGames.includes(appId),
    [user],
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

        followRequestsInFlightRef.current.add(appIdString);

        debugLog('=== Debut handleFollowGame ===');
        debugLog('AppID recu:', appIdString);
        debugLog(
          'Etat isFollowed (fourni):',
          typeof gameMeta.isFollowed === 'boolean'
            ? gameMeta.isFollowed
            : 'non fourni',
        );
        debugLog('Nombre total de jeux:', games.length);

        const isFollowed =
          typeof gameMeta.isFollowed === 'boolean'
            ? gameMeta.isFollowed
            : isGameFollowed(appIdString);

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

          showAlert(
            translate('common.error'),
            translate('games.followUpdateError'),
          );
          return false;
        }
      } catch (error) {
        debugError('Erreur lors de la modification du suivi:', error);
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
      isGameFollowed,
      markSkipNextGamesRefresh,
      persistGamesCache,
      persistGamesVersion,
      setGames,
      setUser,
      steamId,
    ],
  );

  return {
    handleFollowGame,
    isGameFollowed,
    isFollowPending,
  };
};
