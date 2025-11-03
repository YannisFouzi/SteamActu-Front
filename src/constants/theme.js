/**
 * Thème global de l'application Steam
 * Centralise toutes les couleurs et styles réutilisés
 */

// Palette de couleurs Steam officielle
export const COLORS = {
  // Couleurs principales Steam
  STEAM_DARK: '#171A21', // Fond principal Steam
  STEAM_BLUE: '#66C0F4', // Bleu Steam clair (accent)
  STEAM_NAVY: '#1B2838', // Bleu Steam foncé
  STEAM_BORDER: '#2A475E', // Bordures Steam

  // Couleurs secondaires
  STEAM_GRAY: '#2A3F5A', // Gris Steam
  STEAM_LIGHT_BLUE: '#316282', // Bleu clair Steam
  STEAM_TEXT_GRAY: '#8F98A0', // Texte gris
  STEAM_DARK_BLUE: '#0B1A2B', // Bleu très foncé

  // Couleurs système
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  ERROR: '#C0392B', // Rouge pour erreurs/logout

  // Couleurs spécifiques aux news et contenus
  NEWS_TEXT_SECONDARY: '#4B5C6B', // Texte secondaire dans les news
  NEWS_TEXT_PRIMARY: '#212121', // Texte principal dans les news
  NEWS_GAME_TITLE: '#1B2838', // Titre du jeu dans les news
  ERROR_BACKGROUND: '#8B0000', // Fond d'erreur
  PLACEHOLDER_GRAY: '#f0f0f0', // Gris pour placeholders

  // Couleurs avec transparence
  STEAM_BLUE_TRANSPARENT: 'rgba(102, 192, 244, 0.1)',
};

// Styles de texte réutilisables
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
  // Styles spécifiques aux onglets
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
  // Styles spécifiques aux news
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
  // Styles pour les états de chargement
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
  // Styles pour les états vides
  emptyText: {
    fontSize: 16,
    color: COLORS.STEAM_TEXT_GRAY,
    textAlign: 'center',
  },
  // Styles d'erreur
  errorText: {
    color: COLORS.WHITE,
    textAlign: 'center',
  },
};

// Styles de conteneurs réutilisables
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
  // Conteneur de chargement flottant
  loadingMore: {
    backgroundColor: 'rgba(35, 60, 95, 0.8)',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  // Conteneur d'erreur
  errorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.ERROR_BACKGROUND,
  },
  // Conteneur vide
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  // Conteneur modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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

// Configuration du thème React Navigation
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

// Options d'écran par défaut
export const DEFAULT_SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: COLORS.STEAM_NAVY,
  },
  headerTintColor: COLORS.WHITE,
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

// Configurations spécifiques d'écrans
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
  GameDetails: {
    // Configuration dynamique dans le navigateur
    getDynamicOptions: route => ({
      title: route.params?.gameName || 'Détails du jeu',
    }),
  },
};
