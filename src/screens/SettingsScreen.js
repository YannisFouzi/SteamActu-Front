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
  const [syncingGames, setSyncingGames] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoFollowEnabled, setAutoFollowEnabled] = useState(false);
  const [ownedGamesCount, setOwnedGamesCount] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [forcingImport, setForcingImport] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);

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

      // Stocker le nombre de jeux possédés
      setOwnedGamesCount(user.user?.ownedGamesCount || 0);
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

  // Fonction pour resynchroniser la bibliothèque de jeux
  const handleSyncGames = async () => {
    try {
      setSyncingGames(true);

      // Appeler l'API pour resynchroniser les jeux
      const response = await userService.syncGames(steamId);

      // Mettre à jour le compteur de jeux
      setOwnedGamesCount(response.data.gamesCount || 0);

      Alert.alert(
        'Synchronisation terminée',
        `${response.data.newGamesCount} nouveaux jeux ont été trouvés.`,
      );

      // Recharger les paramètres utilisateur pour obtenir les données mises à jour
      await loadUserSettings();
    } catch (error) {
      console.error('Erreur lors de la synchronisation des jeux:', error);
      Alert.alert(
        'Erreur',
        'Impossible de synchroniser votre bibliothèque de jeux. Veuillez réessayer.',
      );
    } finally {
      setSyncingGames(false);
    }
  };

  // Fonction pour enregistrer un token de notification
  const registerForPushNotifications = async () => {
    // Note: Ici, vous implémenteriez la logique d'enregistrement des notifications push
    // Avec OneSignal ou un autre service similaire

    // Pour l'instant, on simule une mise à jour sans token
    try {
      setSaving(true);

      await userService.updateNotificationSettings(steamId, {
        enabled: notificationsEnabled,
        autoFollowNewGames: autoFollowEnabled,
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

  // Fonction pour diagnostiquer la bibliothèque
  const handleRunDiagnostic = async () => {
    try {
      setRunningDiagnostic(true);

      const results = await userService.runLibraryDiagnostic(steamId);
      console.log('Résultats du diagnostic:', results.data);
      setDiagnosticResults(results.data.diagnosticResults);

      Alert.alert(
        'Diagnostic terminé',
        'Les résultats du diagnostic ont été récupérés avec succès.',
      );
    } catch (error) {
      console.error('Erreur lors de la réalisation du diagnostic:', error);
      Alert.alert(
        'Erreur',
        'Impossible de réaliser le diagnostic. Veuillez réessayer plus tard.',
      );
    } finally {
      setRunningDiagnostic(false);
    }
  };

  // Fonction pour forcer l'importation complète de la bibliothèque
  const handleForceImport = async () => {
    try {
      setForcingImport(true);

      const response = await userService.forceLibraryImport(steamId);
      console.log("Résultat de l'importation forcée:", response.data);

      // Mettre à jour le nombre de jeux
      if (response.data.stats) {
        setOwnedGamesCount(response.data.stats.afterImport);
      }

      Alert.alert(
        'Importation forcée terminée',
        `L'importation complète de la bibliothèque a été effectuée avec succès. ${response.data.stats.newGamesAdded} nouveaux jeux ajoutés.`,
      );
    } catch (error) {
      console.error("Erreur lors de l'importation forcée:", error);
      Alert.alert(
        'Erreur',
        "Impossible de forcer l'importation. Veuillez réessayer plus tard.",
      );
    } finally {
      setForcingImport(false);
    }
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bibliothèque de jeux</Text>

        <Text style={styles.settingDescription}>
          {ownedGamesCount} jeux détectés dans votre bibliothèque Steam.
        </Text>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncGames}
          disabled={syncingGames}>
          {syncingGames ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.syncButtonText}>
              Synchroniser la bibliothèque
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.settingDescription}>
          Utilisez cette option si vous avez récemment acheté des jeux et qu'ils
          n'apparaissent pas dans l'application. La synchronisation peut prendre
          quelques instants.
        </Text>

        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => setShowAdvanced(!showAdvanced)}>
          <Text style={styles.advancedButtonText}>
            {showAdvanced
              ? 'Masquer les options avancées'
              : 'Afficher les options avancées'}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            <Text style={styles.advancedDescription}>
              Options de diagnostic pour les problèmes de bibliothèque. Utilisez
              avec précaution.
            </Text>

            <TouchableOpacity
              style={styles.diagnosticButton}
              onPress={handleRunDiagnostic}
              disabled={runningDiagnostic}>
              {runningDiagnostic ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.diagnosticButtonText}>
                  Diagnostiquer la bibliothèque
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.importButton}
              onPress={handleForceImport}
              disabled={forcingImport}>
              {forcingImport ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.importButtonText}>
                  Forcer l'importation complète
                </Text>
              )}
            </TouchableOpacity>

            {diagnosticResults && (
              <View style={styles.diagnosticResults}>
                <Text style={styles.resultTitle}>Résultats du diagnostic:</Text>
                <Text style={styles.resultText}>
                  En base de données: {diagnosticResults.databaseGamesCount}{' '}
                  jeux
                </Text>
                <Text style={styles.resultText}>
                  Via API Steam: {diagnosticResults.apiGamesCount} jeux
                </Text>
                {typeof diagnosticResults.webProfileGamesCount === 'number' && (
                  <Text style={styles.resultText}>
                    Profil web Steam: {diagnosticResults.webProfileGamesCount}{' '}
                    jeux
                  </Text>
                )}

                {diagnosticResults.discrepancyDetected && (
                  <Text style={styles.warningText}>
                    Différence détectée entre l'API Steam et la base de données.
                    Essayez de forcer l'importation complète.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
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
  syncButton: {
    backgroundColor: '#2A3F5A',
    padding: 14,
    marginVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advancedButton: {
    backgroundColor: '#2A3F5A',
    padding: 14,
    marginVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  advancedButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  advancedSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3F5A',
  },
  advancedDescription: {
    fontSize: 14,
    color: '#8F98A0',
    marginBottom: 16,
  },
  diagnosticButton: {
    backgroundColor: '#2A3F5A',
    padding: 14,
    marginVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  diagnosticButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importButton: {
    backgroundColor: '#2A3F5A',
    padding: 14,
    marginVertical: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  diagnosticResults: {
    padding: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#8F98A0',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 8,
  },
});

export default SettingsScreen;
