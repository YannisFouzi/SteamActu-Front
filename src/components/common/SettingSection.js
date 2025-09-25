import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {COLORS, TEXT_STYLES} from '../../constants/theme';

/**
 * Composant réutilisable pour une section de paramètres avec Switch
 * Centralise l'interface des paramètres avec cohérence visuelle
 */
const SettingSection = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{false: COLORS.STEAM_TEXT_GRAY, true: COLORS.STEAM_GRAY}}
          thumbColor={value ? COLORS.STEAM_BLUE : '#f4f3f4'}
          disabled={disabled}
        />
      </View>

      {description && (
        <Text style={styles.settingDescription}>{description}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_GRAY,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    ...TEXT_STYLES.subtitle,
    color: COLORS.WHITE,
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 8,
    lineHeight: 20,
  },
});

export default SettingSection;
