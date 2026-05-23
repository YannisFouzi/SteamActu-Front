import React, {Children} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {COLORS, RADIUS, SPACING} from '../../../constants';

const SettingsGroup = ({title, description, children, onLayout}) => {
  const childArray = Children.toArray(children);
  const hasHeader = title || description;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <View style={styles.card}>
        {hasHeader ? (
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
        ) : null}

        {childArray.map((child, index) => (
          <View key={index}>
            {index > 0 || hasHeader ? <View style={styles.divider} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xl - 4,
  },
  card: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.STEAM_BORDER,
    marginHorizontal: SPACING.lg,
  },
});

export default SettingsGroup;
