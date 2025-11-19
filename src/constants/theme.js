/**
 * Thème global de l'application Steam Notifications.
 * Centralise les couleurs, styles et configurations de navigation.
 */
export const COLORS = {
  // Couleurs principales Steam
  STEAM_DARK: '#171A21',
  STEAM_NAVY: '#1B2838',
  STEAM_BLUE: '#66C0F4',
  STEAM_BORDER: '#2A475E',

  // Couleurs secondaires
  STEAM_GRAY: '#2A3F5A',
  STEAM_LIGHT_BLUE: '#316282',
  STEAM_TEXT_GRAY: '#8F98A0',
  STEAM_DARK_BLUE: '#0B1A2B',

  // Palette fonctionnelle
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  ERROR: '#C0392B',
  WARNING: '#FF6B6B',
  DANGER: '#D32F2F',
  SUCCESS: '#4CAF50',
  FAVORITE_GOLD: '#FFC107',
  PLACEHOLDER_GRAY: '#F0F0F0',
  ERROR_BACKGROUND: '#8B0000',

  // Couleurs spécifiques aux contenus
  NEWS_TEXT_PRIMARY: '#212121',
  NEWS_TEXT_SECONDARY: '#4B5C6B',
  NEWS_GAME_TITLE: '#1B2838',

  // Couleurs avec transparence
  STEAM_BLUE_TRANSPARENT: 'rgba(102, 192, 244, 0.1)',
  OVERLAY_DARK: 'rgba(0, 0, 0, 0.5)',
};

export const TEXT_STYLES = {
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  button: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  accent: {
    color: COLORS.STEAM_BLUE,
    fontWeight: '500',
  },
  tabButton: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.STEAM_TEXT_GRAY,
  },
  tabButtonActive: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.STEAM_DARK_BLUE,
  },
  newsGameName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.NEWS_GAME_TITLE,
  },
  newsMetaText: {
    fontSize: 12,
    color: COLORS.NEWS_TEXT_SECONDARY,
  },
  newsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.NEWS_TEXT_PRIMARY,
  },
  newsFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 12,
  },
  loadingMoreText: {
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.WHITE,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.WHITE,
    textAlign: 'center',
  },
};

export const CONTAINER_STYLES = {
  screen: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
  },
  header: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  loadingMore: {
    backgroundColor: 'rgba(35, 60, 95, 0.8)',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.ERROR_BACKGROUND,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.OVERLAY_DARK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.STEAM_GRAY,
    borderRadius: 3,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
};

export const NAVIGATION_THEME = {
  colors: {
    background: COLORS.STEAM_DARK,
    border: COLORS.STEAM_BORDER,
    notification: COLORS.STEAM_BLUE,
    primary: COLORS.STEAM_BLUE,
    card: COLORS.STEAM_NAVY,
    text: COLORS.WHITE,
  },
  fonts: {
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
  },
};

export const DEFAULT_SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: COLORS.STEAM_NAVY,
  },
  headerTintColor: COLORS.WHITE,
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

export const SCREEN_CONFIGS = {
  Login: {
    headerShown: false,
  },
  Home: {
    headerBackVisible: false,
    headerShown: false,
  },
  Settings: {
    title: 'Paramètres',
  },
  Contact: {
    title: 'Contact',
  },
  TermsOfService: {
    title: "Conditions d'utilisation",
  },
  PrivacyPolicy: {
    title: 'Politique de confidentialité',
  },
  GameDetails: {
    getDynamicOptions: ({route}) => ({
      title: route?.params?.game?.name || 'Détails du jeu',
    }),
  },
};
