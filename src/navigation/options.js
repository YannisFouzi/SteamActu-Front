import {COLORS} from '../constants';

export const DEFAULT_STACK_SCREEN_OPTIONS = {
  headerStyle: {
    backgroundColor: COLORS.STEAM_NAVY,
  },
  headerTintColor: COLORS.WHITE,
  headerTitleStyle: {
    fontWeight: 'bold',
  },
};

export const ROOT_STACK_SCREEN_OPTIONS = {
  startup: {
    headerShown: false,
  },
  login: {
    headerShown: false,
  },
  home: {
    headerShown: false,
  },
};
