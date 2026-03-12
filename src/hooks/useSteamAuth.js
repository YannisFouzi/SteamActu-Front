import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {
  getCurrentAppLanguage,
  translate,
  waitForI18nInitialization,
} from '../i18n';
import {steamAuthService, userService} from '../services/api';
import {
  debugError,
  debugLog,
  maskSteamId,
  showAlert,
  showInfoMessage,
} from './hooksLogger';

const FOLLOW_MODES = ['off', 'auto', 'prompt'];
const AUTH_FLOW_STATES = {
  IDLE: 'idle',
  PENDING: 'pending',
  EXPIRED: 'expired',
};
const AUTH_POLL_INTERVAL_MS = 2000;
const AUTH_POLL_MAX_DURATION_MS = 20000;
const AUTH_TOKEN_STORAGE_KEY = 'pendingAuthToken';

const sleep = durationMs =>
  new Promise(resolve => {
    setTimeout(resolve, durationMs);
  });

const normalizeFollowMode = (value, legacyValue) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (FOLLOW_MODES.includes(normalized)) {
      return normalized;
    }
  }

  if (typeof legacyValue === 'string') {
    try {
      const parsed = JSON.parse(legacyValue);
      if (typeof parsed === 'boolean') {
        return parsed ? 'auto' : 'off';
      }
    } catch {
      // ignore parsing errors
    }
  }

  if (typeof legacyValue === 'boolean') {
    return legacyValue ? 'auto' : 'off';
  }

  return 'off';
};

const isSteamAuthRedirect = url =>
  typeof url === 'string' && url.startsWith(steamAuthService.AUTH_REDIRECT_URL);

const extractSteamIdFromUrl = url => {
  if (typeof url !== 'string' || url.length === 0) {
    return '';
  }

  const match = url.match(/[?&]steamId=([^&#]+)/i);
  if (!match?.[1]) {
    return '';
  }

  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return String(match[1]).trim();
  }
};

const maskAuthUrl = url => {
  if (typeof url !== 'string' || url.length === 0) {
    return '';
  }

  return url
    .replace(
      /(steamId=)([^&#]+)/i,
      (_, prefix, steamId) => `${prefix}${maskSteamId(steamId)}`,
    )
    .replace(
      /(authToken=)([^&#]+)/i,
      (_, prefix, token) => `${prefix}${maskToken(token)}`,
    );
};

const maskToken = token => {
  if (typeof token !== 'string' || token.length <= 8) {
    return '***';
  }
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
};

const logAuthTrace = (message, payload = null) => {
  if (payload === null || payload === undefined) {
    debugLog(`[STEAM AUTH] ${message}`);
    return;
  }

  try {
    debugLog(`[STEAM AUTH] ${message}`, JSON.stringify(payload));
  } catch {
    debugLog(`[STEAM AUTH] ${message}`, String(payload));
  }
};

export const useSteamAuth = navigation => {
  const {loadData} = useAppContext();
  const [loading, setLoading] = useState(false);
  const [authFlowState, setAuthFlowState] = useState(AUTH_FLOW_STATES.IDLE);
  const processedUrls = useRef(new Set());
  const loadDataTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const appStateRef = useRef(AppState.currentState);
  const processingAuthRef = useRef(false);
  const authAttemptActiveRef = useRef(false);
  const authWentBackgroundRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        const previousAppState = appStateRef.current;

        if (
          authAttemptActiveRef.current &&
          previousAppState === 'active' &&
          nextAppState !== 'active'
        ) {
          authWentBackgroundRef.current = true;
          logAuthTrace('App moved to background during Steam auth');
        }

        appStateRef.current = nextAppState;
      },
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  // --- Ordre de declaration important : handleSteamIdReceived → pollAuthStatus → checkExistingUser → handleUrl → handleSteamLogin ---

  const handleSteamIdReceived = useCallback(
    async steamId => {
      try {
        authAttemptActiveRef.current = false;
        authWentBackgroundRef.current = false;
        await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

        debugLog('[LOGIN] Starting Steam authentication callback handling...');
        debugLog('[LOGIN] steamId:', maskSteamId(steamId));

        if (isMountedRef.current) {
          setLoading(true);
          setAuthFlowState(AUTH_FLOW_STATES.IDLE);
        }

        let response;
        try {
          debugLog('[LOGIN] POST /users/register');
          await waitForI18nInitialization();
          response = await userService.register(
            steamId,
            getCurrentAppLanguage(),
          );
          debugLog('[LOGIN] User created or recovered successfully');
        } catch (registerError) {
          const message = registerError.response?.data?.message || '';

          if (
            registerError.response?.status === 400 &&
            String(message).toLowerCase().includes('utilisateur existe')
          ) {
            debugLog('[LOGIN] User already exists, switching to GET /users');
            try {
              response = await userService.getUser(steamId);
              debugLog('[LOGIN] Existing user recovered successfully');
            } catch {
              throw new Error('Unable to recover existing user information');
            }
          } else {
            throw registerError;
          }
        }

        if (!response?.data) {
          throw new Error('Invalid server response');
        }

        const notificationSettings = response?.data?.notificationSettings;
        if (notificationSettings) {
          const {
            newsNotifications,
            enabled,
            libraryFollowMode,
            wishlistFollowMode,
            autoFollowNewGames,
            autoFollowWishlistGames,
          } = notificationSettings;

          const resolvedNews =
            typeof newsNotifications === 'boolean'
              ? newsNotifications
              : typeof enabled === 'boolean'
              ? enabled
              : false;

          await AsyncStorage.multiSet([
            ['newsNotifications', JSON.stringify(resolvedNews)],
            [
              'libraryFollowMode',
              normalizeFollowMode(libraryFollowMode, autoFollowNewGames),
            ],
            [
              'wishlistFollowMode',
              normalizeFollowMode(wishlistFollowMode, autoFollowWishlistGames),
            ],
          ]);

          await AsyncStorage.multiRemove([
            'notificationsEnabled',
            'autoFollowEnabled',
            'autoFollowWishlistEnabled',
          ]);
        } else {
          await AsyncStorage.multiRemove([
            'newsNotifications',
            'libraryFollowMode',
            'wishlistFollowMode',
            'notificationsEnabled',
            'autoFollowEnabled',
            'autoFollowWishlistEnabled',
          ]);
        }

        debugLog('[LOGIN] Saving steamId to AsyncStorage');
        await AsyncStorage.setItem('steamId', steamId);

        debugLog('[LOGIN] Navigating to Home');
        if (isMountedRef.current) {
          navigation.replace('Home');
        }

        loadDataTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }
          loadData(false, 'steamAuthDelayed');
          debugLog('[LOGIN] Auth flow and delayed reload finished');
        }, 100);
      } catch (error) {
        debugError('[LOGIN] Authentication error:', error);
        showAlert(
          translate('common.error'),
          translate('auth.connectivityErrorMessage'),
        );
      } finally {
        authAttemptActiveRef.current = false;
        authWentBackgroundRef.current = false;
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loadData, navigation],
  );

  const pollAuthStatus = useCallback(
    async authToken => {
      const deadline = Date.now() + AUTH_POLL_MAX_DURATION_MS;
      let expired = false;

      if (isMountedRef.current) {
        setAuthFlowState(AUTH_FLOW_STATES.PENDING);
      }

      logAuthTrace('Polling auth status', {
        token: maskToken(authToken),
        maxDurationMs: AUTH_POLL_MAX_DURATION_MS,
      });

      while (isMountedRef.current && Date.now() < deadline) {
        try {
          const result = await steamAuthService.checkAuthStatus(authToken);

          if (result.status === 'succeeded' && result.steamId) {
            logAuthTrace('Auth poll: succeeded');
            await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
            await handleSteamIdReceived(result.steamId);
            return true;
          }

          if (result.status === 'expired') {
            logAuthTrace('Auth poll: expired');
            await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
            expired = true;
            break;
          }
        } catch (error) {
          logAuthTrace('Auth poll: network error', {
            message: error?.message,
          });
        }

        await sleep(AUTH_POLL_INTERVAL_MS);
      }

      if (isMountedRef.current) {
        setAuthFlowState(
          expired ? AUTH_FLOW_STATES.EXPIRED : AUTH_FLOW_STATES.PENDING,
        );
        logAuthTrace(expired ? 'Auth poll: attempt expired' : 'Auth poll: timed out, still pending');
      }

      return false;
    },
    [handleSteamIdReceived],
  );

  const checkExistingUser = useCallback(async () => {
    try {
      debugLog('[STEAM AUTH] Checking for existing user session...');

      const savedSteamId = await AsyncStorage.getItem('steamId');
      if (savedSteamId) {
        debugLog(
          '[STEAM AUTH] Existing session found:',
          maskSteamId(savedSteamId),
        );
        if (isMountedRef.current) {
          navigation.replace('Home');
        }
        return true;
      }

      // Reprendre une tentative d'auth en cours si elle existe
      const pendingToken = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      if (pendingToken) {
        logAuthTrace('Found pending auth token on launch, polling status');
        const resumed = await pollAuthStatus(pendingToken);
        if (resumed) {
          return true;
        }
      }

      return false;
    } catch (error) {
      debugError('[STEAM AUTH] Failed to check existing session:', error);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, pollAuthStatus]);

  const handleUrl = useCallback(
    async ({url}) => {
      logAuthTrace('URL received by auth listener', {
        url: maskAuthUrl(url),
      });

      if (!url || processedUrls.current.has(url) || processingAuthRef.current) {
        return false;
      }

      if (isSteamAuthRedirect(url)) {
        processedUrls.current.add(url);
        processingAuthRef.current = true;

        try {
          const steamId = extractSteamIdFromUrl(url);
          logAuthTrace('SteamID extracted from callback', {
            steamId: maskSteamId(steamId),
            hasSteamId: Boolean(steamId),
          });

          if (steamId) {
            await handleSteamIdReceived(steamId);
          } else {
            showAlert(
              translate('auth.steamIdMissingTitle'),
              translate('auth.steamIdMissingMessage'),
            );
          }
        } catch (error) {
          debugError('Failed to process Steam auth URL:', error);
        } finally {
          processingAuthRef.current = false;
        }

        return true;
      }

      return false;
    },
    [handleSteamIdReceived],
  );

  const openSteamBrowser = useCallback(
    async authUrl => {
      const result = await InAppBrowser.openAuth(
        authUrl,
        steamAuthService.AUTH_REDIRECT_URL,
        {
          showTitle: true,
          toolbarColor: COLORS.STEAM_DARK,
          secondaryToolbarColor: COLORS.STEAM_BLUE,
          navigationBarColor: COLORS.STEAM_DARK,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
          forceCloseOnRedirection: true,
          ephemeralWebSession: false,
        },
      );

      logAuthTrace('openAuth result', {
        type: result?.type || 'unknown',
        url: maskAuthUrl(result?.url || ''),
      });

      return result;
    },
    [handleUrl],
  );

  const handleSteamLogin = useCallback(async () => {
    try {
      authAttemptActiveRef.current = true;
      authWentBackgroundRef.current = false;

      if (isMountedRef.current) {
        setLoading(true);
        setAuthFlowState(AUTH_FLOW_STATES.IDLE);
      }

      logAuthTrace('Requesting auth start from backend');
      const {authToken, authUrl} = await steamAuthService.startAuth();

      // Persister le token pour reprise si l'app est tuee
      await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);

      logAuthTrace('Auth attempt started', {
        token: maskToken(authToken),
        hasAuthUrl: Boolean(authUrl),
      });

      if (!(await InAppBrowser.isAvailable())) {
        logAuthTrace('InAppBrowser unavailable, using external browser');
        await Linking.openURL(authUrl);
        return;
      }

      const result = await openSteamBrowser(authUrl);

      if (result?.type === 'success' && result.url) {
        await handleUrl({url: result.url});
        return;
      }

      if (result?.type === 'cancel' && authWentBackgroundRef.current) {
        // L'user revient de Steam Guard — le Custom Tab a ete suspendu
        // par Android/iOS, donc la redirection Steam n'a pas abouti.
        // On rouvre immediatement le navigateur : Steam Guard ayant
        // deja valide la session, Steam redirige instantanement.
        logAuthTrace('Cancel after background, reopening browser');
        authWentBackgroundRef.current = false;

        if (isMountedRef.current) {
          setAuthFlowState(AUTH_FLOW_STATES.PENDING);
        }

        const retryResult = await openSteamBrowser(authUrl);

        if (retryResult?.type === 'success' && retryResult.url) {
          await handleUrl({url: retryResult.url});
          return;
        }

        // 2eme cancel ou echec — fallback sur le polling
        logAuthTrace('Retry did not complete, falling back to poll');
        await pollAuthStatus(authToken);
        return;
      }

      if (result?.type === 'cancel') {
        debugLog('[STEAM AUTH] Login cancelled by user');
        await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        showInfoMessage(
          translate('auth.loginCancelledTitle'),
          translate('auth.loginCancelledMessage'),
        );
      }
    } catch (error) {
      debugError('Failed to launch Steam authentication:', error);
      showAlert(
        translate('common.error'),
        translate('auth.launchErrorMessage'),
      );
    } finally {
      authAttemptActiveRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [handleUrl, openSteamBrowser, pollAuthStatus]);

  useEffect(() => {
    const urlListener = Linking.addEventListener('url', event => {
      logAuthTrace("Linking 'url' event received", {
        url: maskAuthUrl(event?.url),
      });
      void handleUrl(event);
    });

    Linking.getInitialURL().then(url => {
      if (url) {
        void handleUrl({url});
      }
    });

    return () => {
      urlListener.remove();
    };
  }, [handleUrl]);

  useEffect(() => {
    checkExistingUser();
  }, [checkExistingUser]);

  return {
    loading,
    authFlowState,
    handleSteamLogin,
    checkExistingUser,
  };
};
