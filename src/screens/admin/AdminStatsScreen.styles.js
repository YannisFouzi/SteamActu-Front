import {StyleSheet} from 'react-native';
import {COLORS, RADIUS, SPACING} from '../../constants';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  hero: {
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    lineHeight: 18,
    marginTop: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    minHeight: 92,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  statLabel: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 12,
    lineHeight: 16,
  },
  statValue: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  wideCard: {
    width: '100%',
  },
  table: {
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    overflow: 'hidden',
    backgroundColor: COLORS.STEAM_NAVY,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.STEAM_BORDER,
  },
  tableRowFirst: {
    borderTopWidth: 0,
  },
  tableLabel: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '700',
    paddingRight: SPACING.sm,
  },
  tableValue: {
    width: 72,
    color: COLORS.WHITE,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'right',
  },
  mutedValue: {
    color: COLORS.STEAM_TEXT_GRAY,
  },
  readyValue: {
    color: COLORS.SUCCESS,
  },
  pendingValue: {
    color: COLORS.FAVORITE_GOLD,
  },
  cronCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  cronHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cronName: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '800',
    paddingRight: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
  },
  badgeText: {
    color: COLORS.STEAM_BLUE,
    fontSize: 11,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  detailLabel: {
    width: 92,
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 12,
  },
  detailValue: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 12,
  },
  errorBox: {
    padding: SPACING.lg,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(192, 57, 43, 0.16)',
    borderWidth: 1,
    borderColor: COLORS.ERROR,
  },
  errorTitle: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  errorText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.STEAM_BLUE,
  },
  retryText: {
    color: COLORS.STEAM_DARK_BLUE,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: SPACING.xs,
  },
  emptyText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    lineHeight: 18,
  },
});
