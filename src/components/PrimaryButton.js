import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import { COLORS, TEXT_STYLES } from '../constants';

const PrimaryButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  backgroundColor = COLORS.STEAM_BLUE,
  borderColor = 'transparent',
  textColor = COLORS.WHITE,
  spinnerColor = COLORS.WHITE,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;
  const buttonColorsStyle = React.useMemo(
    () => ({
      backgroundColor,
      borderColor,
    }),
    [backgroundColor, borderColor],
  );
  const textColorsStyle = React.useMemo(
    () => ({
      color: textColor,
    }),
    [textColor],
  );

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonColorsStyle,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[styles.buttonText, textColorsStyle, textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...TEXT_STYLES.button,
  },
});

export default PrimaryButton;
