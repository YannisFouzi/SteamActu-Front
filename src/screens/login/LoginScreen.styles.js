import {StyleSheet} from 'react-native';
import {COLORS, SPACING} from '../../constants';

export default StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  ctaSection: {
    marginBottom: SPACING.lg,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg + 4,
    gap: SPACING.xs + 2,
  },
  securityText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 12,
    lineHeight: 16,
  },
  statusSpacing: {
    marginTop: SPACING.lg,
  },
});
