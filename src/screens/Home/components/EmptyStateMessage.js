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

const normalizeInstruction = instruction => {
  if (typeof instruction === 'string') {
    return {
      text: instruction,
      completed: false,
    };
  }

  return {
    text: instruction?.text || '',
    completed: Boolean(instruction?.completed),
  };
};

const EmptyStateMessage = ({
  styles,
  iconName,
  title,
  titleStyle,
  text,
  textStyle,
  instructions,
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

      {Array.isArray(instructions) && instructions.length > 0 ? (
        <View style={localStyles.instructions}>
          {instructions.map((instruction, index) => {
            const normalized = normalizeInstruction(instruction);

            if (!normalized.text) {
              return null;
            }

            return (
              <View
                key={`${index}-${normalized.text}`}
                style={localStyles.instructionRow}>
                <View
                  style={[
                    localStyles.instructionIndex,
                    normalized.completed &&
                      localStyles.instructionIndexCompleted,
                  ]}>
                  {normalized.completed ? (
                    <Icon
                      name="checkmark-outline"
                      size={15}
                      color={COLORS.WHITE}
                    />
                  ) : (
                    <Text style={localStyles.instructionIndexText}>
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    localStyles.instructionText,
                    normalized.completed &&
                      localStyles.instructionTextCompleted,
                  ]}>
                  {normalized.text}
                </Text>
              </View>
            );
          })}
        </View>
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
  instructions: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  instructionIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.STEAM_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  instructionIndexCompleted: {
    backgroundColor: COLORS.SUCCESS,
  },
  instructionIndexText: {
    color: COLORS.STEAM_DARK,
    fontSize: 13,
    fontWeight: '800',
  },
  instructionText: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 15,
    lineHeight: 21,
  },
  instructionTextCompleted: {
    color: COLORS.STEAM_TEXT_GRAY,
    textDecorationLine: 'line-through',
  },
});

export default EmptyStateMessage;

