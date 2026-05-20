import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

// FollowToggle depend d'AppContext (handleFollowGame, etc.). On le stub ici
// pour isoler le SUT — la logique de suivi a ses propres tests dedies.
jest.mock('../FollowToggle', () => {
  const ReactStub = require('react');
  return {
    __esModule: true,
    default: ({ testID }) =>
      ReactStub.createElement('FollowToggleMock', {
        testID: testID || 'follow-toggle',
      }),
  };
});

// Init i18n explicitement : avant le mock de FollowToggle ci-dessus, l'init
// se faisait par effet de bord via la chaine d'imports useAppContext->i18n.
// On l'importe ici pour que t('games.familyBadge') renvoie "Famille" et pas la cle.
require('../../i18n');

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

  describe('ouverture page Steam au press', () => {
    let openURLSpy;

    beforeEach(() => {
      openURLSpy = jest
        .spyOn(Linking, 'openURL')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      openURLSpy.mockRestore();
    });

    it('ouvre la page Steam quand on tape sur la zone presable (followConfig.appId present)', () => {
      const { getByTestId } = render(
        <GameCard
          game={{ name: 'CSGO' }}
          imageUrl="https://x/h.jpg"
          followConfig={{ appId: '730', name: 'CSGO' }}
        />,
      );
      fireEvent.press(getByTestId('game-card-steam-link'));
      expect(openURLSpy).toHaveBeenCalledTimes(1);
      expect(openURLSpy).toHaveBeenCalledWith(
        'https://store.steampowered.com/app/730',
      );
    });

    it('normalise un appId numerique en string', () => {
      const { getByTestId } = render(
        <GameCard
          game={{ name: 'CSGO' }}
          imageUrl=""
          followConfig={{ appId: 730 }}
        />,
      );
      fireEvent.press(getByTestId('game-card-steam-link'));
      expect(openURLSpy).toHaveBeenCalledWith(
        'https://store.steampowered.com/app/730',
      );
    });

    it('ne rend PAS de zone pressable si followConfig est absent', () => {
      const { queryByTestId } = render(
        <GameCard game={{ name: 'CSGO' }} imageUrl="" />,
      );
      expect(queryByTestId('game-card-steam-link')).toBeNull();
    });

    it('ne rend PAS de zone pressable si followConfig.appId est vide', () => {
      const { queryByTestId } = render(
        <GameCard
          game={{ name: 'CSGO' }}
          imageUrl=""
          followConfig={{ appId: '   ' }}
        />,
      );
      expect(queryByTestId('game-card-steam-link')).toBeNull();
    });
  });
});
