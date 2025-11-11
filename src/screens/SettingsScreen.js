import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LogoutButton from '../components/LogoutButton';
import SettingSection from '../components/SettingSection';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../constants';
import { useAppContext } from '../context/AppContext';
import { useUserSettings } from '../hooks/useUserSettings';
import { userService } from '../services/api';

const LEGAL_LINKS = [
  {
    label: "Conditions d'utilisation",
    icon: 'document-text-outline',
    route: 'TermsOfService',
  },
  {
    label: 'Politique de confidentialité',
    icon: 'shield-checkmark-outline',
    route: 'PrivacyPolicy',
  },
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {handleLogout, steamId} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hook personnalisé pour la gestion des paramètres
  const {
    loading,
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
      debugError('Erreur lors de la déconnexion:', error);
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

              if (!steamId) {
                throw new Error('SteamID introuvable');
              }

              await userService.deleteAccount(steamId);
              await handleLogout();

              navigation.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            } catch (error) {
              debugError('Erreur lors de la suppression du compte:', error);
              Alert.alert(
                'Erreur',
                'Une erreur est survenue lors de la suppression de votre compte. Veuillez réessayer.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [handleLogout, navigation, steamId]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator color={COLORS.STEAM_BLUE} size="large" />
        <Text style={styles.loadingText}>Chargement des paramètres…</Text>
      </View>
    );
  }

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

      <TouchableOpacity
        style={styles.contactShortcut}
        onPress={() => navigation.navigate('Contact')}
        activeOpacity={0.85}>
        <View style={styles.contactShortcutIcon}>
          <Icon name="person-circle-outline" size={24} color={COLORS.WHITE} />
        </View>

        <View style={styles.contactShortcutContent}>
          <Text style={styles.contactShortcutTitle}>Mes infos de contact</Text>
        </View>

        <Icon name="chevron-forward" size={18} color={COLORS.STEAM_TEXT_GRAY} />
      </TouchableOpacity>

      <View style={styles.legalSection}>
        <Text style={[styles.sectionTitle, styles.legalSectionTitle]}>Légal</Text>
        {LEGAL_LINKS.map((link, index) => (
          <TouchableOpacity
            key={link.route}
            style={[
              styles.legalItem,
              index !== LEGAL_LINKS.length - 1 && styles.legalItemDivider,
            ]}
            onPress={() => navigation.navigate(link.route)}
            activeOpacity={0.85}>
            <View style={styles.legalIcon}>
              <Icon name={link.icon} size={18} color={COLORS.STEAM_BLUE} />
            </View>
            <Text style={styles.legalLabel}>{link.label}</Text>
            <Icon
              name="chevron-forward"
              size={18}
              color={COLORS.STEAM_TEXT_GRAY}
            />
          </TouchableOpacity>
        ))}
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.STEAM_TEXT_GRAY,
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
    backgroundColor: COLORS.ERROR,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
  },
  deleteButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteWarning: {
    fontSize: 12,
    color: COLORS.ERROR,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contactShortcut: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactShortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  contactShortcutContent: {
    flex: 1,
  },
  contactShortcutTitle: {
    fontSize: 16,
    color: COLORS.WHITE,
    fontWeight: '700',
  },
  legalSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    overflow: 'hidden',
    paddingTop: 16,
  },
  legalSectionTitle: {
    paddingHorizontal: 16,
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  legalItemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  legalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  legalLabel: {
    flex: 1,
    fontSize: 15,
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default SettingsScreen;
