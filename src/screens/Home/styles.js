import { StyleSheet } from 'react-native';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../../constants';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  gestureContainer: {
    flex: 1,
  },
  gestureRoot: {
    flex: 1,
    overflow: 'hidden',
  },
  contentHost: {
    flex: 1,
    position: 'relative',
  },
  contentInner: {
    flex: 1,
  },
  pageContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.STEAM_DARK,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  title: {
    ...TEXT_STYLES.title,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerButtonText: {
    ...TEXT_STYLES.accent,
    fontSize: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_DARK,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 4,
    backgroundColor: COLORS.STEAM_GRAY,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: COLORS.STEAM_BLUE,
  },
  tabButtonText: {
    ...TEXT_STYLES.tabButton,
  },
  tabButtonTextActive: {
    ...TEXT_STYLES.tabButtonActive,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 16,
  },
  searchClearButton: {
    marginLeft: 8,
  },
  gamesList: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    ...TEXT_STYLES.loadingText,
  },
  emptyContainer: {
    ...CONTAINER_STYLES.emptyContainer,
  },
  emptyText: {
    ...TEXT_STYLES.emptyText,
  },
  newsContainer: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  newsFavoritesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  newsFavoritesToggleLabel: {
    color: COLORS.WHITE,
    fontWeight: '600',
    fontSize: 14,
  },
  newsFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.STEAM_DARK,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  newsFilterLabel: {
    ...TEXT_STYLES.newsFilterLabel,
  },
  newsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  newsCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  newsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  newsGameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: COLORS.STEAM_DARK,
  },
  gameLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  newsMetadata: {
    flex: 1,
  },
  newsFavoriteButton: {
    padding: 4,
  },
  newsGameName: {
    ...TEXT_STYLES.newsGameName,
  },
  newsMetaText: {
    ...TEXT_STYLES.newsMetaText,
  },
  newsFollowButton: {
    padding: 6,
  },
  newsTitle: {
    ...TEXT_STYLES.newsTitle,
  },
  newsImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: COLORS.PLACEHOLDER_GRAY,
  },
  newsErrorContainer: {
    ...CONTAINER_STYLES.errorContainer,
  },
  newsErrorText: {
    ...TEXT_STYLES.errorText,
  },
  loadingMoreContainer: {
    ...CONTAINER_STYLES.loadingMore,
  },
  loadingMoreText: {
    ...TEXT_STYLES.loadingMoreText,
  },
  modalOverlay: {
    ...CONTAINER_STYLES.modalOverlay,
  },
  modalContent: {
    ...CONTAINER_STYLES.modalContent,
  },
  modalTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  // Sous-onglets
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_NAVY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  subTabButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: COLORS.STEAM_GRAY,
    paddingVertical: 6,
    alignItems: 'center',
  },
  subTabButtonActive: {
    backgroundColor: COLORS.STEAM_LIGHT_BLUE,
  },
  subTabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.STEAM_TEXT_GRAY,
  },
  subTabButtonTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sortOptionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.STEAM_DARK,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  sortOptionButtonActive: {
    backgroundColor: COLORS.STEAM_BLUE,
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.STEAM_TEXT_GRAY,
  },
  sortOptionTextActive: {
    color: COLORS.WHITE,
  },
  wishlistList: {
    padding: 12,
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  // Placeholder
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
    lineHeight: 20,
  },
  searchTabContainer: {
    flex: 1,
  },
  searchResultsList: {
    padding: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.WHITE,
    marginTop: 12,
  },
  followedGamesList: {
    padding: 12,
  },
});


