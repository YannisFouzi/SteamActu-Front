import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SettingSection from '../SettingSection';

describe('components/SettingSection', () => {
  it('rend label + Switch contrôlé', () => {
    const { getByText } = render(
      <SettingSection
        label="Notifications"
        value={false}
        onValueChange={jest.fn()}
      />,
    );
    expect(getByText('Notifications')).toBeTruthy();
  });

  it('appelle onValueChange quand on toggle le Switch', () => {
    const onChange = jest.fn();
    const RN = require('react-native');
    const { UNSAFE_getByType } = render(
      <SettingSection label="X" value={false} onValueChange={onChange} />,
    );
    const sw = UNSAFE_getByType(RN.Switch);
    fireEvent(sw, 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('rend la description si fournie', () => {
    const { getByText } = render(
      <SettingSection
        label="X"
        description="Active les pushs"
        value={false}
        onValueChange={jest.fn()}
      />,
    );
    expect(getByText('Active les pushs')).toBeTruthy();
  });

  it('passe disabled au Switch', () => {
    const RN = require('react-native');
    const { UNSAFE_getByType } = render(
      <SettingSection
        label="X"
        value={false}
        disabled
        onValueChange={jest.fn()}
      />,
    );
    expect(UNSAFE_getByType(RN.Switch).props.disabled).toBe(true);
  });
});
