import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, RADIUS, SPACING} from '../../../constants';

const STATUS_VARIANTS = {
  pending: {
    icon: 'time-outline',
    tintColor: COLORS.STEAM_BLUE,
    backgroundColor: 'rgba(102, 192, 244, 0.12)',
    borderColor: 'rgba(102, 192, 244, 0.22)',
  },
  expired: {
    icon: 'refresh-circle-outline',
    tintColor: '#F5B567',
    backgroundColor: 'rgba(245, 181, 103, 0.12)',
    borderColor: 'rgba(245, 181, 103, 0.22)',
  },
};

const LoginStatusCard = ({variant = 'pending', title, message}) => {
  const currentVariant = STATUS_VARIANTS[variant] || STATUS_VARIANTS.pending;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: currentVariant.backgroundColor,
          borderColor: currentVariant.borderColor,
        },
      ]}>
      <View
        style={[
          styles.iconWrap,
          {backgroundColor: currentVariant.borderColor},
        ]}>
        <Ionicons
          name={currentVariant.icon}
          size={18}
          color={currentVariant.tintColor}
        />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    lineHeight: 19,
  },
});

export default LoginStatusCard;
