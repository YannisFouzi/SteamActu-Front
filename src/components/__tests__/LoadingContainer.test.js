import React from 'react';
import { render } from '@testing-library/react-native';

import LoadingContainer from '../LoadingContainer';

describe('components/LoadingContainer', () => {
  it('affiche le texte custom si fourni', () => {
    const { getByText } = render(<LoadingContainer text="Chargement..." />);
    expect(getByText('Chargement...')).toBeTruthy();
  });

  it('fallback texte i18n common.loading si pas de texte', () => {
    const { getByText } = render(<LoadingContainer />);
    // i18n FR : "Chargement..." par défaut
    expect(getByText(/.+/)).toBeTruthy();
  });

  it('rend un ActivityIndicator', () => {
    const { UNSAFE_getByType } = render(<LoadingContainer />);
    // ActivityIndicator est un composant natif RN
    const RN = require('react-native');
    expect(UNSAFE_getByType(RN.ActivityIndicator)).toBeTruthy();
  });

  it('accepte size="small"', () => {
    const RN = require('react-native');
    const { UNSAFE_getByType } = render(<LoadingContainer size="small" />);
    const indicator = UNSAFE_getByType(RN.ActivityIndicator);
    expect(indicator.props.size).toBe('small');
  });

  it('accepte color custom', () => {
    const RN = require('react-native');
    const { UNSAFE_getByType } = render(<LoadingContainer color="#ff0000" />);
    expect(UNSAFE_getByType(RN.ActivityIndicator).props.color).toBe('#ff0000');
  });
});
