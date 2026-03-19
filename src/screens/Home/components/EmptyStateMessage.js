import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../../../constants';

const EmptyStateMessage = ({
  styles,
  emoji,
  iconName,
  iconSize = 64,
  iconColor = COLORS.STEAM_TEXT_GRAY,
  title,
  titleStyle,
  text,
  textStyle,
  subtext,
  subtextStyle,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  secondaryActionLoading,
  align = 'top',
  testID,
}) => {
  const containerStyle =
    align === 'center' ? styles.centerContainer : styles.emptyContainer;

  return (
    <View style={containerStyle} testID={testID}>
      {emoji ? (
        <Text style={styles.placeholderEmoji}>{emoji}</Text>
      ) : iconName ? (
        <Icon
          name={iconName}
          size={iconSize}
          color={iconColor}
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
          style={{
            backgroundColor: COLORS.STEAM_BLUE,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 16,
          }}
          activeOpacity={0.7}>
          <Text style={{color: COLORS.WHITE, fontSize: 15, fontWeight: '600', textAlign: 'center'}}>
            {actionText}
          </Text>
        </TouchableOpacity>
      ) : null}

      {secondaryActionText && onSecondaryAction ? (
        <TouchableOpacity
          onPress={onSecondaryAction}
          disabled={secondaryActionLoading}
          style={{
            borderWidth: 1,
            borderColor: COLORS.STEAM_BLUE,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 12,
            opacity: secondaryActionLoading ? 0.6 : 1,
          }}
          activeOpacity={0.7}>
          {secondaryActionLoading ? (
            <ActivityIndicator size="small" color={COLORS.STEAM_BLUE} />
          ) : (
            <Text style={{color: COLORS.STEAM_BLUE, fontSize: 15, fontWeight: '600', textAlign: 'center'}}>
              {secondaryActionText}
            </Text>
          )}
        </TouchableOpacity>
      ) : null}

      {subtext ? (
        <Text style={subtextStyle || styles.placeholderSubtext}>{subtext}</Text>
      ) : null}
    </View>
  );
};

export default EmptyStateMessage;

