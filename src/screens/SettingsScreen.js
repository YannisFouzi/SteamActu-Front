import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {userService} from '../services/api';

const SettingsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(false);

  // Chargement des données utilisateur au démarrage
  useEffect(() => {
    loadUserSettings();
  }, []);

  // Fonction pour charger les paramètres de l'utilisateur
  const loadUserSettings = async () => {
    try {
      setLoading(true);

      // Récupérer le SteamID stocké
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        Alert.alert('Erreur', 'Utilisateur non connecté');
        return;
      }

      setSteamId(savedSteamId);

      // Récupérer les informations utilisateur
      const response = await userService.getUser(savedSteamId);
      const user = response.data;

      // Définir l'état des notifications
      setNotificationsEnabled(user.notificationSettings?.enabled ?? true);
      setAutoFollowEnabled(
        user.notificationSettings?.autoFollowNewGames ?? false,
      );
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos paramètres. Veuillez réessayer.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour sauvegarder les paramètres
  const saveSettings = async (
    newNotificationsEnabled,
    newAutoFollowEnabled,
  ) => {
    try {
      setSaving(true);

      await userService.updateNotificationSettings(steamId, {
        enabled: newNotificationsEnabled,
        autoFollowNewGames: newAutoFollowEnabled,
      });

      console.log('Paramètres sauvegardés automatiquement');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder vos paramètres. Veuillez réessayer.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Gestionnaire de changement d'état des notifications
  const handleToggleNotifications = async value => {
    setNotificationsEnabled(value);
    await saveSettings(value, autoFollowEnabled);
  };

  // Gestionnaire de changement d'état du suivi automatique
  const handleToggleAutoFollow = async value => {
    setAutoFollowEnabled(value);
    await saveSettings(notificationsEnabled, value);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#66C0F4" />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Activer les notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{false: '#767577', true: '#2A3F5A'}}
            thumbColor={notificationsEnabled ? '#66C0F4' : '#f4f3f4'}
            disabled={saving}
          />
        </View>

        <Text style={styles.settingDescription}>
          Recevez des notifications lorsque de nouvelles actualités sont
          publiées pour les jeux que vous suivez.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suivi automatique</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            Suivre automatiquement les nouveaux jeux
          </Text>
          <Switch
            value={autoFollowEnabled}
            onValueChange={handleToggleAutoFollow}
            trackColor={{false: '#767577', true: '#2A3F5A'}}
            thumbColor={autoFollowEnabled ? '#66C0F4' : '#f4f3f4'}
            disabled={saving}
          />
        </View>

        <Text style={styles.settingDescription}>
          Si activé, les nouveaux jeux que vous achetez seront automatiquement
          ajoutés à votre liste de jeux suivis pour les notifications.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator color="#66C0F4" size="small" />
          <Text style={styles.savingText}>Sauvegarde en cours...</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.aboutText}>
          Steam Notifications v1.0.0{'\n'}
          Cette application vous permet de recevoir des notifications pour les
          actualités des jeux Steam que vous suivez.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171A21',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8F98A0',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F5A',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 14,
    color: '#8F98A0',
    marginTop: 8,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(102, 192, 244, 0.1)',
    margin: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#66C0F4',
  },
  savingText: {
    color: '#66C0F4',
    fontSize: 14,
    marginLeft: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#8F98A0',
    lineHeight: 20,
  },
});

export default SettingsScreen;
