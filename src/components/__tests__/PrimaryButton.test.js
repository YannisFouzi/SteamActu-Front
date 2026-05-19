import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import PrimaryButton from '../PrimaryButton';

describe('components/PrimaryButton', () => {
  it('rend le label', () => {
    const { getByText } = render(<PrimaryButton label="Sign in" />);
    expect(getByText('Sign in')).toBeTruthy();
  });

  it('appelle onPress au tap', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="Tap me" onPress={onPress} />,
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('n\'appelle PAS onPress si disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="X" disabled onPress={onPress} />,
    );
    fireEvent.press(getByText('X'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('n\'appelle PAS onPress si loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <PrimaryButton label="X" loading onPress={onPress} />,
    );
    fireEvent.press(getByText('X'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('affiche loadingLabel si fourni et loading=true', () => {
    const { getByText, queryByText } = render(
      <PrimaryButton label="Normal" loading loadingLabel="Loading..." />,
    );
    expect(getByText('Loading...')).toBeTruthy();
    expect(queryByText('Normal')).toBeNull();
  });

  it('accessibility role="button" et accessibilityLabel défaut = label', () => {
    const { getByRole } = render(<PrimaryButton label="Login" />);
    const btn = getByRole('button');
    expect(btn.props.accessibilityLabel).toBe('Login');
  });

  it('accessibilityLabel custom override', () => {
    const { getByRole } = render(
      <PrimaryButton label="L" accessibilityLabel="Custom" />,
    );
    expect(getByRole('button').props.accessibilityLabel).toBe('Custom');
  });

  it('testID est propagé sur Pressable', () => {
    const { getByTestId } = render(
      <PrimaryButton label="X" testID="my-btn" />,
    );
    expect(getByTestId('my-btn')).toBeTruthy();
  });
});
