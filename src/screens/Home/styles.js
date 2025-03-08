import {StyleSheet} from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1B2838',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171A21',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 12,
  },
  headerButtonText: {
    color: '#66C0F4',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: '#2A3F5A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#316282',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sortButton: {
    marginLeft: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#316282',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  gamesList: {
    paddingTop: 8,
  },
  gameItem: {
    flexDirection: 'row',
    backgroundColor: '#2A3F5A',
    marginHorizontal: 10,
    marginBottom: 8,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gameImage: {
    width: 120,
    height: 45,
  },
  gameInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  gameTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  gamePlaytime: {
    color: '#8F98A0',
    fontSize: 12,
    marginTop: 2,
  },
  gameRecentPlaytime: {
    color: '#67C1F5',
    fontSize: 12,
  },
  followButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#67C1F5',
    paddingHorizontal: 12,
    minWidth: 70,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  followedButton: {
    backgroundColor: '#5CCC7B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8F98A0',
    marginTop: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2A3F5A',
    borderRadius: 3,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectedSortOption: {
    backgroundColor: '#316282',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8F98A0',
    textAlign: 'center',
  },
  recentlyUpdatedGameItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#66C0F4',
  },
  updateBadge: {
    backgroundColor: '#66C0F4',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'center',
  },
  updateBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingMoreContainer: {
    backgroundColor: 'rgba(35, 60, 95, 0.8)',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  loadingMoreText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 12,
  },
});
