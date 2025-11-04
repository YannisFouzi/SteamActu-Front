import React from 'react';
import GameCard from '../../../components/common/GameCard';
import {useAppContext} from '../../../context/AppContext';
import {
  getGameAppId,
  isValidGame,
} from '../../../utils/gameHelpers';

const GameItemAlt = ({game}) => {
  const {handleFollowGame, isGameFollowed} = useAppContext();

  // Validation et extraction des données du jeu
  if (!isValidGame(game)) {
    return null;
  }

  const appId = getGameAppId(game);
  const isFollowed = isGameFollowed(appId);

  // Construire l'URL de l'image du jeu (header image Steam)
  const gameImageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

  return (
    <GameCard
      game={game}
      imageUrl={gameImageUrl}
      isFollowed={isFollowed}
      onFollowPress={() => {
        if (appId) {
          handleFollowGame(appId, isFollowed);
        }
      }}
    />
  );
};

export default GameItemAlt;
