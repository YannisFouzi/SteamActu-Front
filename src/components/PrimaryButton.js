import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {COLORS, RADIUS, TEXT_STYLES} from '../constants';

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
  leadingIcon = null,
  trailingIcon = null,
  loadingLabel,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const isDisabled = disabled || loading;
  const resolvedLabel = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      android_ripple={
        isDisabled ? undefined : {color: 'rgba(255, 255, 255, 0.12)'}
      }
      hitSlop={8}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor,
          borderColor,
        },
        pressed && !isDisabled ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}>
      <View style={styles.content}>
        {!loading && leadingIcon ? (
          <View style={styles.leadingSlot}>{leadingIcon}</View>
        ) : null}

        {!loading && trailingIcon ? (
          <View style={styles.trailingSlot}>{trailingIcon}</View>
        ) : null}

        <View style={styles.centerContent}>
          {loading ? (
            <ActivityIndicator
              color={spinnerColor}
              size="small"
              style={styles.spinner}
            />
          ) : null}

          <Text style={[styles.buttonText, {color: textColor}, textStyle]}>
            {resolvedLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.58,
  },
  buttonPressed: {
    opacity: 0.94,
    transform: [{scale: 0.995}],
  },
  content: {
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingSlot: {
    position: 'absolute',
    left: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  trailingSlot: {
    position: 'absolute',
    right: 18,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 10,
  },
  buttonText: {
    ...TEXT_STYLES.button,
    fontSize: 16,
    letterSpacing: 0.2,
  },
});

export default PrimaryButton;
