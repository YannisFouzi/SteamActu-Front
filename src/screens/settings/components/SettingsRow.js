import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, SPACING} from '../../../constants';

const ICON_SIZE = 36;

const SettingsRow = ({icon, label, onPress}) => (
  <Pressable
    style={styles.row}
    onPress={onPress}
    android_ripple={{color: 'rgba(255, 255, 255, 0.06)'}}>
    <View style={styles.iconContainer}>
      <Ionicons name={icon} size={18} color={COLORS.STEAM_BLUE} />
    </View>
    <Text style={styles.label}>{label}</Text>
    <Ionicons name="chevron-forward" size={18} color={COLORS.STEAM_TEXT_GRAY} />
  </Pressable>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default SettingsRow;
