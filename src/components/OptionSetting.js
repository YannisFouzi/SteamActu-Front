import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {COLORS, TEXT_STYLES} from '../constants';
import TutorialTarget from '../tutorial/TutorialTarget';

const OptionSetting = ({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
  tutorialTargetId,
}) => {
  const optionsContent = (
    <View style={styles.optionsContainer}>
      {options.map(option => {
        const isActive = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionRow,
              isActive && styles.optionRowActive,
              disabled && styles.optionRowDisabled,
            ]}
            onPress={() => {
              if (!disabled && option.value !== value && typeof onChange === 'function') {
                onChange(option.value);
              }
            }}
            activeOpacity={disabled ? 1 : 0.9}>
            <View
              style={[
                styles.radioOuter,
                isActive && styles.radioOuterActive,
                disabled && styles.radioOuterDisabled,
              ]}>
              {isActive ? <View style={styles.radioInner} /> : null}
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              {option.subtitle ? (
                <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const sectionBody = (
    <>
      <Text style={styles.settingLabel}>{label}</Text>
      {description ? (
        <Text style={styles.settingDescription}>{description}</Text>
      ) : null}
      {optionsContent}
    </>
  );

  return (
    <View style={styles.section}>
      {tutorialTargetId ? (
        <TutorialTarget id={tutorialTargetId}>{sectionBody}</TutorialTarget>
      ) : (
        sectionBody
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  settingLabel: {
    ...TEXT_STYLES.subtitle,
    color: COLORS.WHITE,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 8,
    lineHeight: 20,
  },
  optionsContainer: {
    marginTop: 16,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    marginBottom: 12,
  },
  optionRowActive: {
    borderColor: COLORS.STEAM_BLUE,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.STEAM_TEXT_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  radioOuterActive: {
    borderColor: COLORS.STEAM_BLUE,
  },
  radioOuterDisabled: {
    borderColor: COLORS.STEAM_GRAY,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.STEAM_BLUE,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 4,
    lineHeight: 18,
  },
});

export default OptionSetting;
