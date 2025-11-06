import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useCallback, useState} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LogoutButton from '../components/common/LogoutButton';
import SavingIndicator from '../components/common/SavingIndicator';
import SettingSection from '../components/common/SettingSection';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants/theme';
import {useAppContext} from '../context/AppContext';
import {useUserSettings} from '../hooks/useUserSettings';
import {userService} from '../services/api';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {handleLogout, steamId} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hook personnalisé pour la gestion des paramètres
  const {
    saving,
    notificationsEnabled,
    autoFollowEnabled,
    autoFollowWishlistEnabled,
    handleToggleNotifications,
    handleToggleAutoFollow,
    handleToggleAutoFollowWishlist,
  } = useUserSettings();

  // Gestionnaire pour la déconnexion
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
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setLoggingOut(false);
    }
  }, [handleLogout, loggingOut, navigation]);

  // Gestionnaire pour la suppression du compte
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Supprimer mon compte',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible. Toutes vos données seront définitivement supprimées.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);

              // Supprimer le compte côté serveur
              await userService.deleteAccount(steamId);

              // Vider les données locales
              await AsyncStorage.removeItem('steamId');

              // Fermer la modale avec setDeleting
              setDeleting(false);

              // Alert de confirmation puis navigation
              Alert.alert(
                'Compte supprimé',
                'Votre compte a été supprimé avec succès.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation vers LoginScreen
                      navigation.reset({
                        index: 0,
                        routes: [{name: 'Login'}],
                      });
                    },
                  },
                ],
                {cancelable: false}, // Empêcher de fermer sans cliquer sur OK
              );
            } catch (error) {
              console.error('Erreur lors de la suppression du compte:', error);
              setDeleting(false);
              Alert.alert(
                'Erreur',
                'Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer.',
              );
            }
          },
        },
      ],
    );
  }, [steamId, navigation]);

  return (
    <ScrollView style={styles.container}>
      <SettingSection
        label="Activer les notifications"
        description="Recevez des notifications lorsque de nouvelles actualités sont publiées pour les jeux que vous suivez."
        value={notificationsEnabled}
        onValueChange={handleToggleNotifications}
        disabled={saving || loggingOut}
      />

      <SettingSection
        label="Suivre automatiquement les nouveaux jeux"
        description="Les nouveaux jeux que vous achetez seront automatiquement ajoutés à votre liste de jeux suivis pour les notifications."
        value={autoFollowEnabled}
        onValueChange={handleToggleAutoFollow}
        disabled={saving || loggingOut}
      />

      <SettingSection
        label="Suivre automatiquement les jeux de la wishlist"
        description="Les nouveaux jeux que vous ajoutez à votre wishlist Steam seront automatiquement ajoutés à votre liste de jeux suivis."
        value={autoFollowWishlistEnabled}
        onValueChange={handleToggleAutoFollowWishlist}
        disabled={saving || loggingOut}
      />

      <SavingIndicator visible={saving} />

      <View style={styles.section}>
        <LogoutButton onPress={handlePressLogout} loading={loggingOut} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting || loggingOut || saving}>
          <Text style={styles.deleteButtonText}>
            {deleting ? 'Suppression...' : 'Supprimer mon compte'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.deleteWarning}>
          ⚠️ Cette action est irréversible
        </Text>
      </View>

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>À propos</Text>
        <Text style={styles.aboutText}>Steam Notifications v1.0.0</Text>
        <Text style={styles.aboutText}>
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
    backgroundColor: COLORS.STEAM_DARK,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_GRAY,
  },
  aboutSection: {
    ...CONTAINER_STYLES.emptyContainer,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.STEAM_GRAY,
  },
  sectionTitle: {
    ...TEXT_STYLES.title,
    fontSize: 18,
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    lineHeight: 20,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarning: {
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SettingsScreen;
