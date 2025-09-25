import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import LogoutButton from '../components/common/LogoutButton';
import SavingIndicator from '../components/common/SavingIndicator';
import SettingSection from '../components/common/SettingSection';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants/theme';
import {useAppContext} from '../context/AppContext';
import {useUserSettings} from '../hooks/useUserSettings';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {handleLogout} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);

  // Hook personnalisé pour la gestion des paramètres
  const {
    saving,
    notificationsEnabled,
    autoFollowEnabled,
    handleToggleNotifications,
    handleToggleAutoFollow,
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

      <SavingIndicator visible={saving} />

      <View style={styles.section}>
        <LogoutButton onPress={handlePressLogout} loading={loggingOut} />
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
});

export default SettingsScreen;
