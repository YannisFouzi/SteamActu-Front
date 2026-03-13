import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {useCallback, useEffect, useRef} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';

export const useAppLifecycleRefresh = ({
  loadData,
  steamId,
  gamesLength,
  loading,
  refreshing,
  checkForNewGames,
  lastRefreshTime,
  isOlderThanOneDay,
}) => {
  const appStateRef = useRef(AppState.currentState);
  const loadDataRef = useRef(loadData);
  const checkLastVerificationDateRef = useRef(null);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  const checkLastVerificationDate = useCallback(async () => {
    try {
      const savedSteamId = await AsyncStorage.getItem('steamId');
      if (!savedSteamId) {
        debugLog(
          '[CHECK] Skip verification (pas de steamId dans AsyncStorage)',
        );
        return;
      }

      if (isOlderThanOneDay()) {
        debugLog("[CHECK] Plus d'un jour ecoule -> verification complete");
        loadDataRef.current(true, 'checkLastVerificationDate');
      } else if (Date.now() - lastRefreshTime > 300000) {
        debugLog('[CHECK] Verification des nouveaux jeux (5 min ecoulees)');
        checkForNewGames();
      } else {
        debugLog('[CHECK] Verification recente, skip');
      }
    } catch (error) {
      debugError(
        '[CHECK] Erreur lors de la verification de la date:',
        error,
      );
    }
  }, [checkForNewGames, isOlderThanOneDay, lastRefreshTime]);

  useEffect(() => {
    checkLastVerificationDateRef.current = checkLastVerificationDate;
  }, [checkLastVerificationDate]);

  useEffect(() => {
    debugLog('[INIT] useEffect initial (mount) declenche');
    loadDataRef.current(false, 'init');

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        debugLog('[APPSTATE] App revenue au premier plan');
        const checkVerification = checkLastVerificationDateRef.current;
        if (typeof checkVerification === 'function') {
          checkVerification();
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    debugLog('[useEffect[steamId]] Declenche');
    debugLog('[useEffect[steamId]] steamId:', steamId || '(vide)');
    debugLog('[useEffect[steamId]] games.length:', gamesLength);
    debugLog('[useEffect[steamId]] loading:', loading);
    debugLog('[useEffect[steamId]] refreshing:', refreshing);

    if (steamId && gamesLength === 0 && !loading && !refreshing) {
      debugLog('[useEffect[steamId]] Condition remplie -> appel loadData()');
      loadData(false, 'steamIdEffect');
    } else if (loading || refreshing) {
      debugLog('[useEffect[steamId]] Skip (chargement en cours)');
    } else if (steamId && gamesLength > 0) {
      debugLog('[useEffect[steamId]] Skip (jeux deja charges)');
    } else {
      debugLog('[useEffect[steamId]] Skip (pas de steamId)');
    }
  }, [gamesLength, loadData, loading, refreshing, steamId]);

  return {
    checkLastVerificationDate,
  };
};
