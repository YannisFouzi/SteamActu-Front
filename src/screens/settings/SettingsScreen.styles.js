import {StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  actionIcon: {
    marginRight: SPACING.md,
  },
  logoutText: {
    color: COLORS.ERROR,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteText: {
    color: COLORS.ERROR,
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  footerText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 12,
  },
});
