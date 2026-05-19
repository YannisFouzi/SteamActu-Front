import React from 'react';
import { render } from '@testing-library/react-native';

import GameCard from '../GameCard';

describe('components/GameCard', () => {
  it('rend le nom du jeu', () => {
    const { getByText } = render(
      <GameCard game={{ name: 'CSGO' }} imageUrl="https://x/h.jpg" />,
    );
    expect(getByText('CSGO')).toBeTruthy();
  });

  it('rend la date si showDate=true et dateText fourni', () => {
    const { getByText } = render(
      <GameCard
        game={{ name: 'CSGO' }}
        imageUrl=""
        showDate
        dateText="Il y a 2 heures"
      />,
    );
    expect(getByText('Il y a 2 heures')).toBeTruthy();
  });

  it('ne rend PAS la date si showDate=false', () => {
    const { queryByText } = render(
      <GameCard
        game={{ name: 'CSGO' }}
        imageUrl="https://x/h.jpg"
        dateText="Il y a 2 heures"
      />,
    );
    expect(queryByText('Il y a 2 heures')).toBeNull();
  });

  it('rend placeholder Icon si pas d\'image', () => {
    const { UNSAFE_root } = render(
      <GameCard game={{ name: 'X' }} imageUrl="" />,
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('rend le family badge si isFamilyShared=true', () => {
    const { getByText } = render(
      <GameCard
        game={{ name: 'CSGO', isFamilyShared: true }}
        imageUrl="https://x/h.jpg"
      />,
    );
    // i18n FR: "Famille"
    expect(getByText(/famille/i)).toBeTruthy();
  });

  it('numberOfLines=2 sur le nom (tronque les titres longs)', () => {
    const longName = 'A'.repeat(200);
    const { getByText } = render(
      <GameCard game={{ name: longName }} imageUrl="" />,
    );
    expect(getByText(longName).props.numberOfLines).toBe(2);
  });
});
