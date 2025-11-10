import React from 'react';
import { Text, View } from 'react-native';
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

      {subtext ? (
        <Text style={subtextStyle || styles.placeholderSubtext}>{subtext}</Text>
      ) : null}
    </View>
  );
};

export default EmptyStateMessage;

