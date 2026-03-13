import notifee from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { translate } from '../i18n';
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
  const lastLocalModificationRef = useRef(0);

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
          translate('notifications.blockedTitle'),
          translate('notifications.blockedMessage'),
          [
            { text: translate('common.cancel'), style: 'cancel' },
            {
              text: translate('common.openSettings'),
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
          translate('notifications.disabledTitle'),
          translate('notifications.disabledMessage'),
        );
      }

      return false;
    } catch (error) {
      debugError('[FCM] Erreur lors de l’activation des notifications:', error);
      showAlert(
        translate('common.error'),
        translate('notifications.disabledMessage'),
      );
      return false;
    }
  }, [steamId]);

  const persistSettings = useCallback(
    async (newNews, newLibraryMode, newWishlistMode) => {
      if (!steamId) {
        debugError('Impossible de sauvegarder les paramètres: steamId manquant');
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
        return false;
      }

      try {
        // Marquer qu'une modification locale vient d'avoir lieu
        lastLocalModificationRef.current = Date.now();

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
          translate('common.error'),
          translate('errors.saveSettingsMessage'),
        );
        return false;
      } finally {
        safeSetState(setSaving, false);
      }
    },
    [safeSetState, steamId],
  );

  /**
   * Charger les paramètres utilisateur avec optimisation UX
   *
   * Stratégie en 2 phases :
   * 1. Phase instantanée : Charger depuis AsyncStorage et afficher immédiatement
   * 2. Phase background : Synchroniser avec le serveur et mettre à jour si nécessaire
   *
   * Cette approche élimine le loader bloquant et améliore la perception de performance
   */
  const loadUserSettings = useCallback(async () => {
    try {
      // Récupérer le steamId (nécessaire pour toutes les opérations)
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
        safeSetState(setLoading, false);
        return false;
      }

      safeSetState(setSteamId, savedSteamId);

      // ===== PHASE 1 : CHARGEMENT INSTANTANÉ DEPUIS ASYNCSTORAGE =====
      // Charger toutes les valeurs locales en parallèle (rapide : <10ms)
      const [
        storedNews,
        storedLibraryMode,
        storedWishlistMode,
        legacyLibraryMode,
        legacyWishlistMode,
      ] = await AsyncStorage.multiGet([
        'newsNotifications',
        'libraryFollowMode',
        'wishlistFollowMode',
        'autoFollowEnabled', // Legacy
        'autoFollowWishlistEnabled', // Legacy
      ]);

      // Parser et normaliser les valeurs locales
      const localNews =
        storedNews[1] !== null ? JSON.parse(storedNews[1]) : false;
      const localLibraryMode = normalizeFollowMode(
        storedLibraryMode[1],
        legacyLibraryMode[1],
      );
      const localWishlistMode = normalizeFollowMode(
        storedWishlistMode[1],
        legacyWishlistMode[1],
      );

      // Mettre à jour l'UI immédiatement avec les valeurs locales
      safeSetState(setNewsNotifications, localNews);
      safeSetState(setLibraryFollowMode, localLibraryMode);
      safeSetState(setWishlistFollowMode, localWishlistMode);

      // Débloquer l'UI immédiatement (pas de loader bloquant)
      safeSetState(setLoading, false);

      // ===== PHASE 2 : SYNCHRONISATION EN ARRIÈRE-PLAN =====
      // Appeler l'API en arrière-plan sans bloquer l'UI
      try {
        const response = await userService.getUser(savedSteamId);
        const serverSettings = response?.data?.notificationSettings;

        if (serverSettings) {
          const {
            newsNotifications: serverNews,
            enabled, // legacy
            libraryFollowMode: serverLibraryMode,
            wishlistFollowMode: serverWishlistMode,
            autoFollowNewGames,
            autoFollowWishlistGames,
          } = serverSettings;

          // Normaliser les valeurs serveur
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

          // Vérifier si les valeurs serveur diffèrent des valeurs locales
          const hasChanged =
            resolvedNews !== localNews ||
            resolvedLibraryMode !== localLibraryMode ||
            resolvedWishlistMode !== localWishlistMode;

          // Mettre à jour seulement si :
          // 1. Les valeurs ont changé
          // 2. Aucune modification locale n'a été faite récemment (évite les race conditions)
          const timeSinceLastLocalMod =
            Date.now() - lastLocalModificationRef.current;
          if (hasChanged && timeSinceLastLocalMod > 1000) {
            // Mettre à jour les states avec les valeurs serveur
            safeSetState(setNewsNotifications, resolvedNews);
            safeSetState(setLibraryFollowMode, resolvedLibraryMode);
            safeSetState(setWishlistFollowMode, resolvedWishlistMode);

            // Persister les valeurs serveur dans AsyncStorage
            await AsyncStorage.multiSet([
              ['newsNotifications', JSON.stringify(resolvedNews)],
              ['libraryFollowMode', resolvedLibraryMode],
              ['wishlistFollowMode', resolvedWishlistMode],
            ]);

            // Nettoyer les anciennes cles legacy si elles existent
            await AsyncStorage.multiRemove([
              'notificationsEnabled',
              'autoFollowEnabled',
              'autoFollowWishlistEnabled',
            ]);
          }
        }
      } catch (apiError) {
        // Erreur API silencieuse en arrière-plan
        // L'utilisateur voit déjà ses paramètres locaux, pas besoin de l'alerter
        debugError(
          'Synchronisation en arrière-plan échouée (utilisation des valeurs locales):',
          apiError,
        );
      }

      return true;
    } catch (error) {
      // Erreur critique (AsyncStorage inaccessible, etc.)
      debugError('Erreur lors du chargement des paramètres:', error);
      showAlert(
        translate('common.error'),
        translate('errors.loadSettingsMessage'),
      );
      safeSetState(setLoading, false);
      return false;
    }
  }, [safeSetState]);

  const handleToggleNews = useCallback(
    async value => {
      if (!steamId) {
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
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
      wishlistFollowMode,
    ],
  );

  const handleLibraryModeChange = useCallback(
    async mode => {
      if (!steamId) {
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
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
      wishlistFollowMode,
    ],
  );

  const handleWishlistModeChange = useCallback(
    async mode => {
      if (!steamId) {
        showAlert(
          translate('common.error'),
          translate('errors.notConnectedMessage'),
        );
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
