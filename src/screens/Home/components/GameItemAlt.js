import React from 'react';
import GameCard from '../../../components/GameCard';
import { getGameAppId, isValidGame, getGameImageUrl, getGameImageFallback } from '../../../utils';

const GameItemAlt = ({game}) => {
  if (!isValidGame(game)) {
    return null;
  }

  const appId = getGameAppId(game);
  const imageUrl = getGameImageUrl(game);
  const fallbackImageUrl = getGameImageFallback(game);

  return (
    <GameCard
      game={game}
      imageUrl={imageUrl}
      fallbackImageUrl={fallbackImageUrl}
      followConfig={{
        appId,
        name: game.name,
        imageUrl,
      }}
    />
  );
};

export default GameItemAlt;
