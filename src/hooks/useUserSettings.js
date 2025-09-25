import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {userService} from '../services/api';

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

  // Charger les paramètres de l'utilisateur depuis AsyncStorage
  const loadUserSettings = useCallback(async () => {
    try {
      // Récupérer le SteamID stocké
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return false;
      }

      setSteamId(savedSteamId);

      // Charger les paramètres depuis AsyncStorage (pas d'appel API)
      const savedNotifications = await AsyncStorage.getItem(
        'notificationsEnabled',
      );
      const savedAutoFollow = await AsyncStorage.getItem('autoFollowEnabled');

      // Utiliser les valeurs sauvegardées ou les valeurs par défaut
      setNotificationsEnabled(
        savedNotifications !== null ? JSON.parse(savedNotifications) : true,
      );
      setAutoFollowEnabled(
        savedAutoFollow !== null ? JSON.parse(savedAutoFollow) : false,
      );

      return true;
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos paramètres. Veuillez réessayer.',
      );
      return false;
    }
  }, []);

  // Sauvegarder les paramètres
  const saveSettings = useCallback(
    async (newNotificationsEnabled, newAutoFollowEnabled) => {
      try {
        setSaving(true);

        // Sauvegarder localement dans AsyncStorage
        await AsyncStorage.setItem(
          'notificationsEnabled',
          JSON.stringify(newNotificationsEnabled),
        );
        await AsyncStorage.setItem(
          'autoFollowEnabled',
          JSON.stringify(newAutoFollowEnabled),
        );

        // Synchroniser avec le backend (optionnel, pour la cohérence)
        try {
          await userService.updateNotificationSettings(steamId, {
            enabled: newNotificationsEnabled,
            autoFollowNewGames: newAutoFollowEnabled,
          });
        } catch (apiError) {
          console.warn(
            'Erreur lors de la synchronisation avec le backend:',
            apiError,
          );
          // On continue même si la sync échoue, les paramètres sont sauvegardés localement
        }

        return true;
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
        Alert.alert(
          'Erreur',
          'Impossible de sauvegarder vos paramètres. Veuillez réessayer.',
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [steamId],
  );

  // Gestionnaire pour les notifications
  const handleToggleNotifications = useCallback(
    async value => {
      setNotificationsEnabled(value);
      await saveSettings(value, autoFollowEnabled);
    },
    [autoFollowEnabled, saveSettings],
  );

  // Gestionnaire pour le suivi automatique
  const handleToggleAutoFollow = useCallback(
    async value => {
      setAutoFollowEnabled(value);
      await saveSettings(notificationsEnabled, value);
    },
    [notificationsEnabled, saveSettings],
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
    handleToggleNotifications,
    handleToggleAutoFollow,
    loadUserSettings,
  };
};
