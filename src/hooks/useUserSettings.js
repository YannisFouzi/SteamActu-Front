import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {userService} from '../services/api';
import {debugError, showAlert} from './hooksLogger';

/**
 * Hook personnalisé pour la gestion des paramètres utilisateur
 * Centralise toute la logique de chargement et sauvegarde des paramètres
 */
export const useUserSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
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

      const savedNotifications = await AsyncStorage.getItem(
        'notificationsEnabled',
      );
      const savedAutoFollow = await AsyncStorage.getItem('autoFollowEnabled');
      const savedAutoFollowWishlist = await AsyncStorage.getItem(
        'autoFollowWishlistEnabled',
      );

      safeSetState(
        setNotificationsEnabled,
        savedNotifications !== null ? JSON.parse(savedNotifications) : true,
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
      setNotificationsEnabled(value);
      await saveSettings(value, autoFollowEnabled, autoFollowWishlistEnabled);
    },
    [autoFollowEnabled, autoFollowWishlistEnabled, saveSettings],
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
