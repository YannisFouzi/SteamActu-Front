import AsyncStorage from '@react-native-async-storage/async-storage';
import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useState} from 'react';
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
import {useAppContext} from '../context/AppContext';
import {userService} from '../services/api';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {handleLogout} = useAppContext();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(false);

  // Chargement des donnees utilisateur au demarrage
  useEffect(() => {
    loadUserSettings();
  }, []);

  // Fonction pour charger les parametres de l'utilisateur
  const loadUserSettings = async () => {
    try {
      setLoading(true);

      // Recuperer le SteamID stocke
      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        Alert.alert('Erreur', 'Utilisateur non connecte');
        return;
      }

      setSteamId(savedSteamId);

      // Recuperer les informations utilisateur
      const response = await userService.getUser(savedSteamId);
      const user = response.data;

      // Definir l'etat des notifications
      setNotificationsEnabled(user.notificationSettings?.enabled ?? true);
      setAutoFollowEnabled(
        user.notificationSettings?.autoFollowNewGames ?? false,
      );
    } catch (error) {
      console.error('Erreur lors du chargement des parametres:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos parametres. Veuillez reessayer.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour sauvegarder les parametres
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

      console.log('Parametres sauvegardes automatiquement');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde automatique:', error);
      Alert.alert(
        'Erreur',
        'Impossible de sauvegarder vos parametres. Veuillez reessayer.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Gestionnaire de changement d'etat des notifications
  const handleToggleNotifications = async value => {
    setNotificationsEnabled(value);
    await saveSettings(value, autoFollowEnabled);
  };

  // Gestionnaire de changement d'etat du suivi automatique
  const handleToggleAutoFollow = async value => {
    setAutoFollowEnabled(value);
    await saveSettings(notificationsEnabled, value);
  };

  const handlePressLogout = useCallback(async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      await handleLogout();
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error) {
      console.error('Erreur lors de la deconnexion:', error);
    } finally {
      setLoggingOut(false);
    }
  }, [handleLogout, loggingOut, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#66C0F4" />
        <Text style={styles.loadingText}>Chargement des parametres...</Text>
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
            disabled={saving || loggingOut}
          />
        </View>

        <Text style={styles.settingDescription}>
          Recevez des notifications lorsque de nouvelles actualites sont publiees
          pour les jeux que vous suivez.
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
            disabled={saving || loggingOut}
          />
        </View>

        <Text style={styles.settingDescription}>
          Si active, les nouveaux jeux que vous achetez seront automatiquement
          ajoutes a votre liste de jeux suivis pour les notifications.
        </Text>
      </View>

      {saving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator color="#66C0F4" size="small" />
          <Text style={styles.savingText}>Sauvegarde en cours...</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <TouchableOpacity
          style={[
            styles.logoutButton,
            loggingOut && styles.logoutButtonDisabled,
          ]}
          onPress={handlePressLogout}
          disabled={loggingOut}>
          {loggingOut ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.logoutButtonText}>Se deconnecter</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>A propos</Text>
        <Text style={styles.aboutText}>Steam Notifications v1.0.0</Text>
        <Text style={styles.aboutText}>
          Cette application vous permet de recevoir des notifications pour les actualites des jeux Steam que vous suivez.
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
  logoutButton: {
    marginTop: 8,
    backgroundColor: '#C0392B',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.7,
  },
  logoutButtonText: {
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
