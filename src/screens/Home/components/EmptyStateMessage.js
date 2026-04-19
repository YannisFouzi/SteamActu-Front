import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../constants';

const EmptyStateMessage = ({
  styles,
  iconName,
  title,
  titleStyle,
  text,
  textStyle,
  subtext,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  secondaryActionLoading,
}) => {
  return (
    <View style={styles.emptyContainer}>
      {iconName ? (
        <Icon
          name={iconName}
          size={64}
          color={COLORS.STEAM_TEXT_GRAY}
          style={styles.emptyIcon}
        />
      ) : null}

      {title ? (
        <Text style={titleStyle || styles.placeholderTitle}>{title}</Text>
      ) : null}

      {text ? (
        <Text style={textStyle || styles.placeholderText}>{text}</Text>
      ) : null}

      {actionText && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={localStyles.primaryTouchable}
          activeOpacity={0.7}>
          <Text style={localStyles.primaryTouchableText}>{actionText}</Text>
        </TouchableOpacity>
      ) : null}

      {secondaryActionText && onSecondaryAction ? (
        <TouchableOpacity
          onPress={onSecondaryAction}
          disabled={secondaryActionLoading}
          style={[
            localStyles.secondaryTouchable,
            secondaryActionLoading && localStyles.secondaryTouchableDisabled,
          ]}
          activeOpacity={0.7}>
          {secondaryActionLoading ? (
            <ActivityIndicator size="small" color={COLORS.STEAM_BLUE} />
          ) : (
            <Text style={localStyles.secondaryTouchableText}>
              {secondaryActionText}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      {subtext ? (
        <Text style={styles.placeholderSubtext}>{subtext}</Text>
      ) : null}
    </View>
  );
};

const localStyles = StyleSheet.create({
  primaryTouchable: {
    backgroundColor: COLORS.STEAM_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  primaryTouchableText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryTouchable: {
    borderWidth: 1,
    borderColor: COLORS.STEAM_BLUE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  secondaryTouchableDisabled: {
    opacity: 0.6,
  },
  secondaryTouchableText: {
    color: COLORS.STEAM_BLUE,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EmptyStateMessage;

