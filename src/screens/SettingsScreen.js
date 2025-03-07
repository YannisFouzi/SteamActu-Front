import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
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
      setAutoFollowEnabled(user.autoFollowSettings?.enabled ?? false);
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

  // Fonction pour enregistrer un token de notification
  const registerForPushNotifications = async () => {
    // Note: Ici, vous implémenteriez la logique d'enregistrement des notifications push
    // Avec OneSignal ou un autre service similaire

    // Exemple de code:
    /*
    try {
      // Demander la permission pour les notifications
      const permission = await Permissions.askAsync(Permissions.NOTIFICATIONS);
      
      if (permission.status !== 'granted') {
        Alert.alert(
          'Notifications désactivées',
          'Vous devez autoriser les notifications dans les paramètres de votre appareil.'
        );
        return;
      }
      
      // Obtenir un token pour ce périphérique
      const pushToken = await Notifications.getExpoPushTokenAsync();
      
      // Mettre à jour sur le serveur
      await userService.updateNotificationSettings(steamId, {
        enabled: notificationsEnabled,
        pushToken: pushToken.data
      });
      
      Alert.alert('Succès', 'Vos préférences de notifications ont été mises à jour');
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement des notifications:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'enregistrer les notifications. Veuillez réessayer.'
      );
    }
    */

    // Pour l'instant, on simule une mise à jour sans token
    try {
      setSaving(true);

      await userService.updateNotificationSettings(steamId, {
        enabled: notificationsEnabled,
      });

      Alert.alert(
        'Succès',
        'Vos préférences de notifications ont été mises à jour',
      );
    } catch (error) {
      console.error('Erreur lors de la mise à jour des paramètres:', error);
      Alert.alert(
        'Erreur',
        'Impossible de mettre à jour vos paramètres. Veuillez réessayer.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Gestionnaire de changement d'état des notifications
  const handleToggleNotifications = value => {
    setNotificationsEnabled(value);
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
            onValueChange={setAutoFollowEnabled}
            trackColor={{false: '#767577', true: '#2A3F5A'}}
            thumbColor={autoFollowEnabled ? '#66C0F4' : '#f4f3f4'}
          />
        </View>

        <Text style={styles.settingDescription}>
          Si activé, les nouveaux jeux que vous achetez seront automatiquement
          ajoutés à votre liste de jeux suivis pour les notifications.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={registerForPushNotifications}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.saveButtonText}>Enregistrer les paramètres</Text>
        )}
      </TouchableOpacity>

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
  saveButton: {
    backgroundColor: '#66C0F4',
    padding: 14,
    margin: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutText: {
    fontSize: 14,
    color: '#8F98A0',
    lineHeight: 20,
  },
});

export default SettingsScreen;
