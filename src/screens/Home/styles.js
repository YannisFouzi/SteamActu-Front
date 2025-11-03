import {StyleSheet} from 'react-native';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../../constants/theme';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
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
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_GRAY,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_NAVY,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.STEAM_LIGHT_BLUE,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.WHITE,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginLeft: 10,
    justifyContent: 'space-between',
    width: 130,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.STEAM_LIGHT_BLUE,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  actionButtonText: {
    color: COLORS.WHITE,
    fontSize: 14,
  },
  gamesList: {
    paddingTop: 8,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 3,
    marginBottom: 8,
  },
  sortOptionText: {
    color: COLORS.WHITE,
    fontSize: 16,
  },
  selectedSortOption: {
    backgroundColor: COLORS.STEAM_LIGHT_BLUE,
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
  // Wishlist
  wishlistSortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.STEAM_DARK,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
    gap: 8,
  },
  wishlistSortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.STEAM_GRAY,
    alignItems: 'center',
  },
  wishlistSortButtonActive: {
    backgroundColor: COLORS.STEAM_BLUE,
  },
  wishlistSortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.STEAM_TEXT_GRAY,
  },
  wishlistSortButtonTextActive: {
    color: COLORS.WHITE,
  },
  wishlistList: {
    padding: 12,
  },
  // 🎨 Style horizontal final (comme "Mes jeux")
  wishlistCardHorizontal: {
    flexDirection: 'row',
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  wishlistImageHorizontal: {
    width: 120,
    height: 80,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  wishlistInfoHorizontal: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  wishlistNameHorizontal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  wishlistDateHorizontal: {
    fontSize: 12,
    color: '#757575',
  },
  wishlistFollowButton: {
    justifyContent: 'center',
    padding: 12,
  },
  // ❌ Anciens styles (conservés pour migration)
  wishlistCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  wishlistImage: {
    width: 120,
    height: 90,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  wishlistInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  wishlistName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  wishlistRelease: {
    fontSize: 12,
    color: COLORS.STEAM_TEXT_GRAY,
    marginBottom: 4,
  },
  wishlistDate: {
    fontSize: 11,
    color: COLORS.STEAM_TEXT_GRAY,
    fontStyle: 'italic',
  },
  wishlistDateSmall: {
    fontSize: 10,
    color: COLORS.STEAM_TEXT_GRAY,
    fontStyle: 'italic',
  },
  // 🎨 Style 1 : Horizontal (Image à gauche)
  wishlistCardStyle1: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FF6B6B', // Rouge pour identifier
  },
  wishlistImageStyle1: {
    width: 140,
    height: 100,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  wishlistInfoStyle1: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  // 🎨 Style 2 : Vertical (Image en haut)
  wishlistCardStyle2: {
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4ECDC4', // Turquoise pour identifier
  },
  wishlistImageStyle2: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.STEAM_GRAY,
  },
  wishlistInfoStyle2: {
    padding: 12,
  },
  // 🎨 Style 3 : Overlay (Image en fond)
  wishlistCardStyle3: {
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    height: 180,
    borderWidth: 2,
    borderColor: '#FFE66D', // Jaune pour identifier
  },
  wishlistImageStyle3: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: COLORS.STEAM_GRAY,
  },
  wishlistOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
  },
  wishlistNameOverlay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  wishlistDateOverlay: {
    fontSize: 11,
    color: COLORS.STEAM_TEXT_GRAY,
    fontStyle: 'italic',
  },
  // 🎨 Style 4 : Compact (Petite image)
  wishlistCardStyle4: {
    flexDirection: 'row',
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#A8DADC', // Bleu clair pour identifier
    paddingVertical: 8,
  },
  wishlistImageStyle4: {
    width: 80,
    height: 60,
    backgroundColor: COLORS.STEAM_GRAY,
    borderRadius: 4,
    marginLeft: 8,
  },
  wishlistInfoStyle4: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    justifyContent: 'center',
  },
  // Label pour identifier les styles
  styleLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.STEAM_BLUE,
    marginBottom: 4,
    textTransform: 'uppercase',
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.STEAM_DARK,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.WHITE,
    fontSize: 16,
  },
  searchResultsList: {
    padding: 16,
    paddingTop: 0,
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
});
