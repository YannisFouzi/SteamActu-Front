import React from 'react';
import GameCard from '../../../components/common/GameCard';
import {
  getGameAppId,
  isValidGame,
} from '../../../utils/gameHelpers';

const GameItemAlt = ({game}) => {
  // Validation et extraction des données du jeu
  if (!isValidGame(game)) {
    return null;
  }

  const appId = getGameAppId(game);
  // Construire l'URL de l'image du jeu (header image Steam)
  const gameImageUrl = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

  return (
    <GameCard
      game={game}
      imageUrl={gameImageUrl}
      followConfig={{
        appId,
        name: game.name,
        imageUrl: gameImageUrl,
      }}
    />
  );
};

export default GameItemAlt;
