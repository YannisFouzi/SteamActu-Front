import {DarkTheme as NavigationDarkTheme} from '@react-navigation/native';
import {MD3DarkTheme, adaptNavigationTheme} from 'react-native-paper';

/**
 * Theme global de l'application GameNotif.
 * Centralise les couleurs, les espacements et les styles visuels partages.
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

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
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

const {DarkTheme: AdaptedNavigationTheme} = adaptNavigationTheme({
  reactNavigationDark: NavigationDarkTheme,
});

export const PAPER_THEME = {
  ...MD3DarkTheme,
  dark: true,
  roundness: RADIUS.lg,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.STEAM_BLUE,
    onPrimary: COLORS.STEAM_DARK_BLUE,
    primaryContainer: COLORS.STEAM_LIGHT_BLUE,
    onPrimaryContainer: COLORS.WHITE,
    secondary: COLORS.STEAM_TEXT_GRAY,
    onSecondary: COLORS.WHITE,
    secondaryContainer: COLORS.STEAM_GRAY,
    onSecondaryContainer: COLORS.WHITE,
    tertiary: COLORS.FAVORITE_GOLD,
    onTertiary: COLORS.BLACK,
    tertiaryContainer: '#5A4600',
    onTertiaryContainer: COLORS.WHITE,
    error: COLORS.DANGER,
    onError: COLORS.WHITE,
    errorContainer: '#5C1A1A',
    onErrorContainer: COLORS.WHITE,
    background: COLORS.STEAM_DARK,
    onBackground: COLORS.WHITE,
    surface: COLORS.STEAM_NAVY,
    onSurface: COLORS.WHITE,
    surfaceDisabled: '#233448',
    onSurfaceDisabled: 'rgba(255, 255, 255, 0.45)',
    surfaceVariant: COLORS.STEAM_GRAY,
    onSurfaceVariant: COLORS.STEAM_TEXT_GRAY,
    outline: COLORS.STEAM_BORDER,
    outlineVariant: COLORS.STEAM_BORDER,
    shadow: COLORS.BLACK,
    scrim: 'rgba(0, 0, 0, 0.72)',
    inverseSurface: COLORS.WHITE,
    inverseOnSurface: COLORS.STEAM_DARK,
    inversePrimary: COLORS.STEAM_BLUE,
    backdrop: 'rgba(0, 0, 0, 0.72)',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: 'transparent',
      level1: '#203244',
      level2: '#23384C',
      level3: '#28405A',
      level4: '#2C4864',
      level5: '#30506E',
    },
  },
};

export const NAVIGATION_THEME = {
  ...AdaptedNavigationTheme,
  dark: true,
  colors: {
    ...AdaptedNavigationTheme.colors,
    background: COLORS.STEAM_DARK,
    border: COLORS.STEAM_BORDER,
    notification: COLORS.FAVORITE_GOLD,
    primary: COLORS.STEAM_BLUE,
    card: COLORS.STEAM_NAVY,
    text: COLORS.WHITE,
  },
  fonts: {
    ...AdaptedNavigationTheme.fonts,
    bold: {
      ...AdaptedNavigationTheme.fonts.bold,
      fontFamily: 'System',
      fontWeight: 'bold',
    },
    regular: {
      ...AdaptedNavigationTheme.fonts.regular,
      fontFamily: 'System',
      fontWeight: 'normal',
    },
  },
};
