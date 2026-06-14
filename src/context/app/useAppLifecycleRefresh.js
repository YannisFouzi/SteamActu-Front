import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {useCallback, useEffect, useRef} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';

const INITIAL_LIBRARY_LOAD_DELAY_MS = 350;
// Poll périodique de followVersion pendant que l'app est au 1er plan. Couvre le
// cas où un follow est fait sur une AUTRE surface (extension/web/plugin) sans
// qu'aucun focus/foreground ne se déclenche côté mobile (utilisateur immobile sur
// un écran). Un GET /steam/status toutes les 30 s = coût négligeable.
const FOLLOW_POLL_INTERVAL_MS = 30000;

export const useAppLifecycleRefresh = ({
  enabled,
  loadData,
  steamId,
  gamesLength,
  loading,
  refreshing,
  checkForNewGames,
  maybeRefreshGames,
  lastRefreshTime,
  isOlderThanOneDay,
}) => {
  const appStateRef = useRef(AppState.currentState);
  const loadDataRef = useRef(loadData);
  const maybeRefreshGamesRef = useRef(maybeRefreshGames);
  const checkLastVerificationDateRef = useRef(null);
  const initialLoadTimeoutRef = useRef(null);
  const initialLoadFrameRef = useRef(null);

  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  useEffect(() => {
    maybeRefreshGamesRef.current = maybeRefreshGames;
  }, [maybeRefreshGames]);

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
    return () => {
      if (initialLoadFrameRef.current !== null) {
        cancelAnimationFrame(initialLoadFrameRef.current);
        initialLoadFrameRef.current = null;
      }

      if (initialLoadTimeoutRef.current !== null) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, []);

  // Poll périodique léger (foreground only) → propage les follows distants même
  // quand l'utilisateur reste immobile sur un écran. maybeRefreshGames est
  // débouncé + skip-si-loading, et ne recharge la bibliothèque que si gamesVersion
  // a bougé (un follow ne bumpe que followVersion → re-fetch profil seul).
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const intervalId = setInterval(() => {
      if (AppState.currentState !== 'active') {
        return;
      }
      const refresh = maybeRefreshGamesRef.current;
      if (typeof refresh === 'function') {
        refresh('periodicPoll');
      }
    }, FOLLOW_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      if (initialLoadFrameRef.current !== null) {
        cancelAnimationFrame(initialLoadFrameRef.current);
        initialLoadFrameRef.current = null;
      }

      if (initialLoadTimeoutRef.current !== null) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }

      return undefined;
    }

    debugLog('[INIT] Startup sync planifiee apres premier affichage');

    initialLoadFrameRef.current = requestAnimationFrame(() => {
      initialLoadFrameRef.current = null;
      initialLoadTimeoutRef.current = setTimeout(() => {
        initialLoadTimeoutRef.current = null;
        debugLog('[INIT] Startup sync lancee en differe');
        loadDataRef.current(false, 'startupDeferredInit');
      }, INITIAL_LIBRARY_LOAD_DELAY_MS);
    });

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
        // Sonde aussi followVersion au retour au 1er plan → propage un follow
        // fait sur une autre surface (web/plugin/extension) à TOUTES les vues
        // (boutons des « Jeux suivis », du Fil, de la recherche) sans attendre
        // un passage par « Mes jeux ». Débouncé + référence-stable → pas de boucle.
        const refreshFollows = maybeRefreshGamesRef.current;
        if (typeof refreshFollows === 'function') {
          refreshFollows('appForeground');
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      if (initialLoadFrameRef.current !== null) {
        cancelAnimationFrame(initialLoadFrameRef.current);
        initialLoadFrameRef.current = null;
      }

      if (initialLoadTimeoutRef.current !== null) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }

      subscription.remove();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (steamId && gamesLength === 0 && !loading && !refreshing) {
      debugLog('[GAMES] Aucun cache librairie en memoire, chargement demande');
      loadData(false, 'steamIdEffect');
    }
  }, [enabled, gamesLength, loadData, loading, refreshing, steamId]);

  return {
    checkLastVerificationDate,
  };
};
