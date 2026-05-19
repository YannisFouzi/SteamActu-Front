import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SteamLoginButton from '../SteamLoginButton';

describe('components/SteamLoginButton', () => {
  it('rend le label i18n auth.loginWithSteam', () => {
    const { getByRole } = render(<SteamLoginButton />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<SteamLoginButton onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('disabled n\'appelle pas onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <SteamLoginButton disabled onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading n\'appelle pas onPress', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <SteamLoginButton loading onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('testID propagé', () => {
    const { getByTestId } = render(<SteamLoginButton testID="steam-login" />);
    expect(getByTestId('steam-login')).toBeTruthy();
  });
});
