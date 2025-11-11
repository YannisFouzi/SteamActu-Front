import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import notifee from '@notifee/react-native';
import { userService } from '../services/api';
import {
  registerFCMToken,
  unregisterFCMToken,
} from '../services/notificationService';
import { debugError, showAlert } from './hooksLogger';

/**
 * Hook personnalisé pour la gestion des paramètres utilisateur
 * Centralise toute la logique de chargement et sauvegarde des paramètres
 */
export const useUserSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(false);
  const [autoFollowWishlistEnabled, setAutoFollowWishlistEnabled] = useState(false);
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

  // Charger les paramètres de l'utilisateur depuis AsyncStorage
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
          enabled = false,
          autoFollowNewGames = false,
          autoFollowWishlistGames = false,
        } = serverSettings;

        safeSetState(setNotificationsEnabled, Boolean(enabled));
        safeSetState(setAutoFollowEnabled, Boolean(autoFollowNewGames));
        safeSetState(
          setAutoFollowWishlistEnabled,
          Boolean(autoFollowWishlistGames),
        );

        await AsyncStorage.multiSet([
          ['notificationsEnabled', JSON.stringify(Boolean(enabled))],
          ['autoFollowEnabled', JSON.stringify(Boolean(autoFollowNewGames))],
          [
            'autoFollowWishlistEnabled',
            JSON.stringify(Boolean(autoFollowWishlistGames)),
          ],
        ]);
      } else {
        const savedNotifications = await AsyncStorage.getItem(
          'notificationsEnabled',
        );
        const savedAutoFollow = await AsyncStorage.getItem('autoFollowEnabled');
        const savedAutoFollowWishlist = await AsyncStorage.getItem(
          'autoFollowWishlistEnabled',
        );

        safeSetState(
          setNotificationsEnabled,
          savedNotifications !== null ? JSON.parse(savedNotifications) : false,
        );
        safeSetState(
          setAutoFollowEnabled,
          savedAutoFollow !== null ? JSON.parse(savedAutoFollow) : false,
        );
        safeSetState(
          setAutoFollowWishlistEnabled,
          savedAutoFollowWishlist !== null
            ? JSON.parse(savedAutoFollowWishlist)
            : false,
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
  }, [safeSetState]);

  // Sauvegarder les paramètres
  const saveSettings = useCallback(
    async (newNotificationsEnabled, newAutoFollowEnabled, newAutoFollowWishlistEnabled) => {
      if (!steamId) {
        debugError('Impossible de sauvegarder les paramètres: steamId manquant');
        showAlert('Erreur', 'Utilisateur non connecté.');
        return false;
      }

      try {
        safeSetState(setSaving, true);

        // Sauvegarder localement dans AsyncStorage
        await AsyncStorage.setItem(
          'notificationsEnabled',
          JSON.stringify(newNotificationsEnabled),
        );
        await AsyncStorage.setItem(
          'autoFollowEnabled',
          JSON.stringify(newAutoFollowEnabled),
        );
        await AsyncStorage.setItem(
          'autoFollowWishlistEnabled',
          JSON.stringify(newAutoFollowWishlistEnabled),
        );

        // Synchroniser avec le backend (optionnel, pour la cohérence)
        try {
          await userService.updateNotificationSettings(steamId, {
            enabled: newNotificationsEnabled,
            autoFollowNewGames: newAutoFollowEnabled,
            autoFollowWishlistGames: newAutoFollowWishlistEnabled,
          });
        } catch (apiError) {
          debugError(
            'Erreur lors de la synchronisation avec le backend:',
            apiError,
          );
          // On continue même si la sync échoue, les paramètres sont sauvegardés localement
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

  // Gestionnaire pour les notifications
  const handleToggleNotifications = useCallback(
    async value => {
      if (!steamId) {
        showAlert('Erreur', 'Utilisateur non connecté.');
        return;
      }

      if (value) {
        const result = await registerFCMToken(steamId);

        if (result?.success) {
          setNotificationsEnabled(true);
          await saveSettings(true, autoFollowEnabled, autoFollowWishlistEnabled);
          return;
        }

        setNotificationsEnabled(false);
        await saveSettings(false, autoFollowEnabled, autoFollowWishlistEnabled);

        if (result?.status === 'blocked') {
          showAlert(
            'Notifications bloquées',
            "Android bloque les notifications pour Steam Actu. Activez-les dans les paramètres.",
            [
              {text: 'Annuler', style: 'cancel'},
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
            'Notification non activée',
            "Impossible d'activer les notifications pour le moment. Veuillez réessayer plus tard.",
          );
        }
      } else {
        setNotificationsEnabled(false);
        await unregisterFCMToken(steamId);
        await saveSettings(false, autoFollowEnabled, autoFollowWishlistEnabled);
      }
    },
    [autoFollowEnabled, autoFollowWishlistEnabled, saveSettings, steamId],
  );

  // Gestionnaire pour le suivi automatique (bibliothèque)
  const handleToggleAutoFollow = useCallback(
    async value => {
      setAutoFollowEnabled(value);
      await saveSettings(notificationsEnabled, value, autoFollowWishlistEnabled);
    },
    [notificationsEnabled, autoFollowWishlistEnabled, saveSettings],
  );

  // Gestionnaire pour le suivi automatique (wishlist)
  const handleToggleAutoFollowWishlist = useCallback(
    async value => {
      setAutoFollowWishlistEnabled(value);
      await saveSettings(notificationsEnabled, autoFollowEnabled, value);
    },
    [notificationsEnabled, autoFollowEnabled, saveSettings],
  );

  // Charger les paramètres au démarrage
  useEffect(() => {
    loadUserSettings();
  }, [loadUserSettings]);

  // Réinitialiser les switches lorsque l'utilisateur est déconnecté
  useEffect(() => {
    if (!steamId) {
      setNotificationsEnabled(false);
      setAutoFollowEnabled(false);
      setAutoFollowWishlistEnabled(false);
    }
  }, [steamId]);

  return {
    loading,
    saving,
    steamId,
    notificationsEnabled,
    autoFollowEnabled,
    autoFollowWishlistEnabled,
    handleToggleNotifications,
    handleToggleAutoFollow,
    handleToggleAutoFollowWishlist,
    loadUserSettings,
  };
};
