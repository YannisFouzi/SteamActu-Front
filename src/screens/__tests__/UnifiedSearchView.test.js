import React from 'react';
import { render } from '@testing-library/react-native';

// GameCard depend de FollowToggle -> AppContext. On le stub : ici on teste la
// logique de sections de UnifiedSearchView, pas le rendu d'une carte.
jest.mock('../../components/GameCard', () => {
  const ReactStub = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ game }) => ReactStub.createElement(Text, null, game?.name || ''),
  };
});

const mockUseAppContext = jest.fn();
jest.mock('../../context/AppContext', () => ({
  useAppContext: () => mockUseAppContext(),
}));

const mockUseStoreSearch = jest.fn();
jest.mock('../../hooks/useStoreSearch', () => ({
  useStoreSearch: () => mockUseStoreSearch(),
}));

// i18n pour les titres de section ("Dans mes jeux", ...).
require('../../i18n');

const UnifiedSearchView = require('../UnifiedSearchView').default;

describe('screens/UnifiedSearchView', () => {
  beforeEach(() => {
    mockUseStoreSearch.mockReturnValue({ results: [], loading: false });
  });

  it('section "Dans mes jeux" : trouve un jeu possede matchant la query', () => {
    mockUseAppContext.mockReturnValue({
      searchQuery: 'battlefield',
      games: [
        // playtime_2weeks: 0 => jamais joue recemment. Avec l'ancien bug
        // (recherche branchee sur filteredGames trie par lastTwoWeeks) ce jeu
        // disparaissait des resultats. Il DOIT etre present.
        { appid: 2807960, name: 'Battlefield 6', playtime_2weeks: 0 },
        { appid: 730, name: 'Counter-Strike 2' },
      ],
    });

    const { getByText, queryByText } = render(
      <UnifiedSearchView filterWishlist={() => []} />,
    );

    expect(getByText('Dans mes jeux')).toBeTruthy();
    expect(getByText('Battlefield 6')).toBeTruthy();
    // Un jeu qui ne matche pas la query n'apparait pas.
    expect(queryByText('Counter-Strike 2')).toBeNull();
  });

  it('reste fonctionnel sans filteredGames ni sortOption dans le contexte', () => {
    // Le mock ne fournit NI filteredGames NI sortOption : si UnifiedSearchView
    // regressait vers ces champs, la section serait vide et le test casserait.
    mockUseAppContext.mockReturnValue({
      searchQuery: 'raiders',
      games: [{ appid: 1808500, name: 'ARC Raiders' }],
    });

    const { getByText } = render(
      <UnifiedSearchView filterWishlist={() => []} />,
    );

    expect(getByText('ARC Raiders')).toBeTruthy();
  });

  it('query vide => section "Dans mes jeux" absente', () => {
    mockUseAppContext.mockReturnValue({
      searchQuery: '',
      games: [{ appid: 2807960, name: 'Battlefield 6' }],
    });

    const { queryByText } = render(
      <UnifiedSearchView filterWishlist={() => []} />,
    );

    expect(queryByText('Dans mes jeux')).toBeNull();
  });
});
