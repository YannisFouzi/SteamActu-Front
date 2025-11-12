import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { userService } from '../services/api';
import {
  registerFCMToken,
  unregisterFCMToken,
} from '../services/notificationService';
import { debugError, showAlert } from './hooksLogger';

const FOLLOW_MODES = ['off', 'auto', 'prompt'];

const normalizeFollowMode = (value, legacyBoolean = undefined) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (FOLLOW_MODES.includes(normalized)) {
      return normalized;
    }
  }

  if (typeof legacyBoolean === 'string') {
    try {
      const parsed = JSON.parse(legacyBoolean);
      if (typeof parsed === 'boolean') {
        return parsed ? 'auto' : 'off';
      }
    } catch {
      // ignore parse errors
    }
  }

  if (typeof legacyBoolean === 'boolean') {
    return legacyBoolean ? 'auto' : 'off';
  }

  return 'off';
};

const shouldEnablePrompts = (libraryFollowMode, wishlistFollowMode) =>
  libraryFollowMode === 'prompt' || wishlistFollowMode === 'prompt';

const requiresNotifications = (
  newsNotifications,
  libraryFollowMode,
  wishlistFollowMode,
) =>
  Boolean(newsNotifications) ||
  shouldEnablePrompts(libraryFollowMode, wishlistFollowMode);

/**
 * Hook personnalisé pour la gestion des paramètres utilisateur
 * Centralise toute la logique de chargement et sauvegarde des paramètres
 */
export const useUserSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [newsNotifications, setNewsNotifications] = useState(false);
  const [libraryFollowMode, setLibraryFollowMode] = useState('off');
  const [wishlistFollowMode, setWishlistFollowMode] = useState('off');
  const isMountedRef = useRef(true);

  const safeSetState = useCallback((setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const ensureNotificationsPermission = useCallback(async () => {
    try {
      const result = await registerFCMToken(steamId);
      if (result?.success) {
        return true;
      }

      if (result?.status === 'blocked') {
        showAlert(
          'Notifications bloquées',
          "Android bloque les notifications pour Steam Actu. Activez-les dans les paramètres.",
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Ouvrir les paramètres',
              onPress: async () => {
                try {
                  if (Platform.OS === 'android') {
                    await notifee.openNotificationSettings();
                  } else {
                    await Linking.openSettings();
                  }
                } catch (settingsError) {
                  debugError(
                    '[FCM] Impossible d’ouvrir les paramètres:',
                    settingsError,
                  );
                }
              },
            },
          ],
        );
      } else {
        showAlert(
          'Notifications désactivées',
          "Impossible d'activer les notifications pour le moment. Veuillez réessayer plus tard.",
        );
      }

      return false;
    } catch (error) {
      debugError('[FCM] Erreur lors de l’activation des notifications:', error);
      showAlert(
        'Erreur',
        "Impossible d'activer les notifications pour le moment. Veuillez réessayer plus tard.",
      );
      return false;
    }
  }, [steamId]);

  const persistSettings = useCallback(
    async (newNews, newLibraryMode, newWishlistMode) => {
      if (!steamId) {
        debugError('Impossible de sauvegarder les paramètres: steamId manquant');
        showAlert('Erreur', 'Utilisateur non connecté.');
        return false;
      }

      try {
        safeSetState(setSaving, true);

        const followPromptNotifications = shouldEnablePrompts(
          newLibraryMode,
          newWishlistMode,
        );

        await AsyncStorage.multiSet([
          ['newsNotifications', JSON.stringify(newNews)],
          ['libraryFollowMode', newLibraryMode],
          ['wishlistFollowMode', newWishlistMode],
        ]);

        await AsyncStorage.multiRemove([
          'notificationsEnabled',
          'autoFollowEnabled',
          'autoFollowWishlistEnabled',
        ]);

        try {
          await userService.updateNotificationSettings(steamId, {
            newsNotifications: newNews,
            followPromptNotifications,
            libraryFollowMode: newLibraryMode,
            wishlistFollowMode: newWishlistMode,
          });
        } catch (apiError) {
          debugError(
            'Erreur lors de la synchronisation avec le backend:',
            apiError,
          );
        }

        return true;
      } catch (error) {
        debugError('Erreur lors de la sauvegarde des paramètres:', error);
        showAlert(
          'Erreur',
          'Impossible de sauvegarder vos paramètres. Veuillez réessayer.',
        );
        return false;
      } finally {
        safeSetState(setSaving, false);
      }
    },
    [safeSetState, steamId],
  );

  // Charger les paramètres de l'utilisateur depuis AsyncStorage / backend
  const loadUserSettings = useCallback(async () => {
    safeSetState(setLoading, true);

    try {
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        showAlert('Erreur', 'Utilisateur non connecté');
        return false;
      }

      safeSetState(setSteamId, savedSteamId);

      let serverSettings = null;
      try {
        const response = await userService.getUser(savedSteamId);
        serverSettings = response?.data?.notificationSettings || null;
      } catch (apiError) {
        debugError(
          'Erreur lors de la récupération des paramètres utilisateur:',
          apiError,
        );
      }

      if (serverSettings) {
        const {
          newsNotifications: serverNews,
          followPromptNotifications,
          enabled, // legacy
          libraryFollowMode: serverLibraryMode,
          wishlistFollowMode: serverWishlistMode,
          autoFollowNewGames,
          autoFollowWishlistGames,
        } = serverSettings;

        const resolvedLibraryMode = normalizeFollowMode(
          serverLibraryMode,
          autoFollowNewGames,
        );
        const resolvedWishlistMode = normalizeFollowMode(
          serverWishlistMode,
          autoFollowWishlistGames,
        );

        const resolvedNews =
          typeof serverNews === 'boolean'
            ? serverNews
            : typeof enabled === 'boolean'
            ? enabled
            : false;

        // Si legacy followPrompt true mais modes différents, on l’ignore
        const shouldEnable =
          followPromptNotifications ||
          shouldEnablePrompts(resolvedLibraryMode, resolvedWishlistMode);

        safeSetState(setNewsNotifications, resolvedNews);
        safeSetState(setLibraryFollowMode, resolvedLibraryMode);
        safeSetState(setWishlistFollowMode, resolvedWishlistMode);

        await AsyncStorage.multiSet([
          ['newsNotifications', JSON.stringify(resolvedNews)],
          ['libraryFollowMode', resolvedLibraryMode],
          ['wishlistFollowMode', resolvedWishlistMode],
        ]);

        if (!shouldEnable) {
          await unregisterFCMToken(savedSteamId);
        }
      } else {
        const storedNews = await AsyncStorage.getItem('newsNotifications');
        const storedLibraryMode = await AsyncStorage.getItem('libraryFollowMode');
        const legacyLibraryMode = await AsyncStorage.getItem('autoFollowEnabled');
        const storedWishlistMode = await AsyncStorage.getItem('wishlistFollowMode');
        const legacyWishlistMode = await AsyncStorage.getItem(
          'autoFollowWishlistEnabled',
        );

        safeSetState(
          setNewsNotifications,
          storedNews !== null ? JSON.parse(storedNews) : false,
        );
        safeSetState(
          setLibraryFollowMode,
          normalizeFollowMode(storedLibraryMode, legacyLibraryMode),
        );
        safeSetState(
          setWishlistFollowMode,
          normalizeFollowMode(storedWishlistMode, legacyWishlistMode),
        );
      }

      return true;
    } catch (error) {
      debugError('Erreur lors du chargement des paramètres:', error);
      showAlert(
        'Erreur',
        'Impossible de charger vos paramètres. Veuillez réessayer.',
      );
      return false;
    } finally {
      safeSetState(setLoading, false);
    }
  }, [safeSetState, unregisterFCMToken]);

  const handleToggleNews = useCallback(
    async value => {
      if (!steamId) {
        showAlert('Erreur', 'Utilisateur non connecté.');
        return;
      }

      const previousRequires = requiresNotifications(
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
      );
      const nextRequires = requiresNotifications(
        value,
        libraryFollowMode,
        wishlistFollowMode,
      );

      if (value && !previousRequires) {
        const granted = await ensureNotificationsPermission();
        if (!granted) {
          return;
        }
      }

      if (!value && previousRequires && !nextRequires) {
        await unregisterFCMToken(steamId);
      }

      setNewsNotifications(value);
      await persistSettings(value, libraryFollowMode, wishlistFollowMode);
    },
    [
      ensureNotificationsPermission,
      libraryFollowMode,
      newsNotifications,
      persistSettings,
      steamId,
      unregisterFCMToken,
      wishlistFollowMode,
    ],
  );

  const handleLibraryModeChange = useCallback(
    async mode => {
      if (!steamId) {
        showAlert('Erreur', 'Utilisateur non connecté.');
        return;
      }

      const safeMode = FOLLOW_MODES.includes(mode) ? mode : 'off';
      if (safeMode === libraryFollowMode) {
        return;
      }

      const previousRequires = requiresNotifications(
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
      );
      const nextRequires = requiresNotifications(
        newsNotifications,
        safeMode,
        wishlistFollowMode,
      );

      if (!previousRequires && nextRequires) {
        const granted = await ensureNotificationsPermission();
        if (!granted) {
          return;
        }
      }

      if (previousRequires && !nextRequires) {
        await unregisterFCMToken(steamId);
      }

      setLibraryFollowMode(safeMode);
      await persistSettings(newsNotifications, safeMode, wishlistFollowMode);
    },
    [
      ensureNotificationsPermission,
      libraryFollowMode,
      newsNotifications,
      persistSettings,
      steamId,
      unregisterFCMToken,
      wishlistFollowMode,
    ],
  );

  const handleWishlistModeChange = useCallback(
    async mode => {
      if (!steamId) {
        showAlert('Erreur', 'Utilisateur non connecté.');
        return;
      }

      const safeMode = FOLLOW_MODES.includes(mode) ? mode : 'off';
      if (safeMode === wishlistFollowMode) {
        return;
      }

      const previousRequires = requiresNotifications(
        newsNotifications,
        libraryFollowMode,
        wishlistFollowMode,
      );
      const nextRequires = requiresNotifications(
        newsNotifications,
        libraryFollowMode,
        safeMode,
      );

      if (!previousRequires && nextRequires) {
        const granted = await ensureNotificationsPermission();
        if (!granted) {
          return;
        }
      }

      if (previousRequires && !nextRequires) {
        await unregisterFCMToken(steamId);
      }

      setWishlistFollowMode(safeMode);
      await persistSettings(newsNotifications, libraryFollowMode, safeMode);
    },
    [
      ensureNotificationsPermission,
      libraryFollowMode,
      newsNotifications,
      persistSettings,
      steamId,
      unregisterFCMToken,
      wishlistFollowMode,
    ],
  );

  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  useEffect(() => {
    if (!steamId) {
      setNewsNotifications(false);
      setLibraryFollowMode('off');
      setWishlistFollowMode('off');
    }
  }, [steamId]);

  return {
    loading,
    saving,
    steamId,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
    loadUserSettings,
  };
};
