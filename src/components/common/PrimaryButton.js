import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import {COLORS, TEXT_STYLES} from '../../constants';

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

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <Text style={[styles.buttonText, {color: textColor}, textStyle]}>
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
  buttonText: {
    ...TEXT_STYLES.button,
  },
});

export default PrimaryButton;
