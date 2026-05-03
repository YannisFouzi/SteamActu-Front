/**
 * Singleton du navigationRef, expose pour les rares cas ou un module non-React
 * a besoin d'une reference.
 *
 * Strategie follow_prompt :
 * - cold-start : AppNavigator injecte l'ecran cible via `initialState`
 * - app deja montee : on navigue immediatement avec ce service
 */

import {debugError, debugLog} from '../hooks/hooksLogger';

let navigationRef = null;

export const registerNavigationRef = ref => {
  navigationRef = ref;
};

export const unregisterNavigationRef = ref => {
  if (navigationRef === ref) {
    navigationRef = null;
  }
};

export const getNavigationRef = () => navigationRef;

const canNavigateTo = routeName => {
  if (!navigationRef?.isReady?.()) {
    return false;
  }

  try {
    const rootState = navigationRef.getRootState?.();
    return Array.isArray(rootState?.routeNames)
      ? rootState.routeNames.includes(routeName)
      : false;
  } catch (error) {
    debugError('[NAV] Erreur lecture root state:', error);
    return false;
  }
};

export const navigateToFollowedGamesTab = (options = {}) => {
  if (!canNavigateTo('Home')) {
    debugLog('[NAV] Home indisponible, navigation follow_prompt ignoree');
    return false;
  }

  try {
    navigationRef.navigate('Home', {
      screen: 'Actu',
      params: {
        screen: 'JeuxSuivis',
        params: options,
      },
    });
    return true;
  } catch (error) {
    debugError('[NAV] Erreur navigateToFollowedGamesTab:', error);
    return false;
  }
};
