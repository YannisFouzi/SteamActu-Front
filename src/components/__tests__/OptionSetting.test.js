import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import OptionSetting from '../OptionSetting';

const OPTIONS = [
  { value: 'off', title: 'Désactivé', subtitle: 'Aucune action' },
  { value: 'auto', title: 'Automatique' },
  { value: 'prompt', title: 'Confirmation', subtitle: 'Demander à chaque fois' },
];

describe('components/OptionSetting', () => {
  it('rend label + 3 options avec titles', () => {
    const { getByText } = render(
      <OptionSetting label="Mode" options={OPTIONS} value="off" onChange={jest.fn()} />,
    );
    expect(getByText('Mode')).toBeTruthy();
    expect(getByText('Désactivé')).toBeTruthy();
    expect(getByText('Automatique')).toBeTruthy();
    expect(getByText('Confirmation')).toBeTruthy();
  });

  it('rend les subtitles quand fournis', () => {
    const { getByText } = render(
      <OptionSetting options={OPTIONS} value="off" onChange={jest.fn()} />,
    );
    expect(getByText('Aucune action')).toBeTruthy();
    expect(getByText('Demander à chaque fois')).toBeTruthy();
  });

  it('rend la description si fournie', () => {
    const { getByText } = render(
      <OptionSetting
        label="L"
        description="Une description"
        options={OPTIONS}
        value="off"
        onChange={jest.fn()}
      />,
    );
    expect(getByText('Une description')).toBeTruthy();
  });

  it('appelle onChange quand une option différente est tap', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <OptionSetting options={OPTIONS} value="off" onChange={onChange} />,
    );
    fireEvent.press(getByText('Automatique'));
    expect(onChange).toHaveBeenCalledWith('auto');
  });

  it('n\'appelle PAS onChange si l\'option est déjà active', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <OptionSetting options={OPTIONS} value="off" onChange={onChange} />,
    );
    fireEvent.press(getByText('Désactivé'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('n\'appelle PAS onChange si disabled=true', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <OptionSetting
        options={OPTIONS}
        value="off"
        disabled
        onChange={onChange}
      />,
    );
    fireEvent.press(getByText('Automatique'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
