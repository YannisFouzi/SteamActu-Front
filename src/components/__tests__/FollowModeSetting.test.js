import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import FollowModeSetting from '../FollowModeSetting';

describe('components/FollowModeSetting', () => {
  it('wrapper transparent autour de OptionSetting', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <FollowModeSetting
        label="Mode"
        value="off"
        options={[
          { value: 'off', title: 'Off' },
          { value: 'auto', title: 'Auto' },
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.press(getByText('Auto'));
    expect(onChange).toHaveBeenCalledWith('auto');
  });
});
