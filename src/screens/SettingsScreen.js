import {useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import FollowModeSetting from '../components/FollowModeSetting';
import LogoutButton from '../components/LogoutButton';
import OptionSetting from '../components/OptionSetting';
import SettingSection from '../components/SettingSection';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useAppLanguage} from '../hooks/useAppLanguage';
import {debugError, showAlert, showDialog} from '../hooks/hooksLogger';
import {useUserSettings} from '../hooks/useUserSettings';
import {userService} from '../services/api';
import {useTutorial} from '../tutorial/useTutorial';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {handleLogout, steamId} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    saving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
  } = useUserSettings();
  const {
    restartTutorial,
    completeTutorial,
    state: tutorialState,
  } = useTutorial();
  const {appLanguage, savingLanguage, handleLanguageChange} =
    useAppLanguage(steamId);
  const isTutorialActive = tutorialState.status === 'running';

  const legalLinks = useMemo(
    () => [
      {
        label: t('nav.termsOfService'),
        icon: 'document-text-outline',
        route: 'TermsOfService',
      },
      {
        label: t('nav.privacyPolicy'),
        icon: 'shield-checkmark-outline',
        route: 'PrivacyPolicy',
      },
    ],
    [t],
  );

  const libraryOptions = useMemo(
    () => [
      {
        value: 'off',
        title: t('followModes.offTitle'),
        subtitle: t('followModes.offSubtitleLibrary'),
      },
      {
        value: 'auto',
        title: t('followModes.autoTitle'),
        subtitle: t('followModes.autoSubtitleLibrary'),
      },
      {
        value: 'prompt',
        title: t('followModes.promptTitle'),
        subtitle: t('followModes.promptSubtitleLibrary'),
      },
    ],
    [t],
  );

  const wishlistOptions = useMemo(
    () => [
      {
        value: 'off',
        title: t('followModes.offTitle'),
        subtitle: t('followModes.offSubtitleWishlist'),
      },
      {
        value: 'auto',
        title: t('followModes.autoTitle'),
        subtitle: t('followModes.autoSubtitleWishlist'),
      },
      {
        value: 'prompt',
        title: t('followModes.promptTitle'),
        subtitle: t('followModes.promptSubtitleWishlist'),
      },
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      {
        value: 'fr',
        title: t('common.french'),
      },
      {
        value: 'en',
        title: t('common.english'),
      },
    ],
    [t],
  );

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
      debugError('Erreur lors de la deconnexion:', error);
    } finally {
      setLoggingOut(false);
    }
  }, [handleLogout, loggingOut, navigation]);

  const handleDeleteAccount = useCallback(() => {
    showDialog({
      title: t('settings.deleteAccountConfirmTitle'),
      message: t('settings.deleteAccountConfirmMessage'),
      tone: 'destructive',
      icon: 'trash-can-outline',
      options: {cancelable: true},
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
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
              showAlert(t('common.error'), t('settings.deleteAccountError'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  }, [handleLogout, navigation, showDialog, steamId, t]);

  const followModeDisabled = saving || loggingOut;
  const languageDisabled = savingLanguage || loggingOut || deleting;

  return (
    <ScrollView style={styles.container}>
      <OptionSetting
        label={t('settings.languageLabel')}
        description={t('settings.languageDescription')}
        value={appLanguage}
        options={languageOptions}
        onChange={handleLanguageChange}
        disabled={languageDisabled}
      />

      <SettingSection
        label={t('settings.newsNotificationsLabel')}
        description={t('settings.newsNotificationsDescription')}
        value={newsNotifications}
        onValueChange={handleToggleNews}
        disabled={saving || loggingOut}
        tutorialTargetId="settings-notifications"
      />

      <FollowModeSetting
        label={t('settings.libraryLabel')}
        description={t('settings.libraryDescription')}
        value={libraryFollowMode}
        options={libraryOptions}
        onChange={handleLibraryModeChange}
        disabled={followModeDisabled}
        tutorialTargetId="settings-library"
      />

      <FollowModeSetting
        label={t('settings.wishlistLabel')}
        description={t('settings.wishlistDescription')}
        value={wishlistFollowMode}
        options={wishlistOptions}
        onChange={handleWishlistModeChange}
        disabled={followModeDisabled}
        tutorialTargetId="settings-wishlist"
      />

      <View style={styles.tutorialSummaryCard}>
        <Text style={styles.summaryText}>{t('settings.tutorialSummary')}</Text>
        {isTutorialActive ? (
          <TouchableOpacity
            style={styles.summaryButton}
            onPress={completeTutorial}>
            <Text style={styles.summaryButtonText}>
              {t('settings.tutorialFinish')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.restartButton}
            onPress={restartTutorial}>
            <Text style={styles.restartButtonText}>
              {t('settings.reviewTutorial')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <LogoutButton onPress={handlePressLogout} loading={loggingOut} />
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          disabled={deleting || loggingOut || saving}>
          <Text style={styles.deleteButtonText}>
            {deleting ? t('settings.deleting') : t('settings.deleteAccount')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.deleteWarning}>{t('settings.deleteWarning')}</Text>
      </View>

      <TouchableOpacity
        style={styles.contactShortcut}
        onPress={() => navigation.navigate('Contact')}
        activeOpacity={0.85}>
        <View style={styles.contactShortcutIcon}>
          <Icon name="person-circle-outline" size={24} color={COLORS.WHITE} />
        </View>

        <View style={styles.contactShortcutContent}>
          <Text style={styles.contactShortcutTitle}>
            {t('settings.contactShortcut')}
          </Text>
        </View>

        <Icon name="chevron-forward" size={18} color={COLORS.STEAM_TEXT_GRAY} />
      </TouchableOpacity>

      <View style={styles.legalSection}>
        <Text style={[styles.sectionTitle, styles.legalSectionTitle]}>
          {t('common.legal')}
        </Text>
        {legalLinks.map((link, index) => (
          <TouchableOpacity
            key={link.route}
            style={[
              styles.legalItem,
              index !== legalLinks.length - 1 && styles.legalItemDivider,
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
        <Text style={styles.sectionTitle}>{t('common.about')}</Text>
        <Text style={styles.aboutText}>{t('settings.aboutVersion')}</Text>
        <Text style={styles.aboutText}>{t('settings.aboutBody')}</Text>
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
  tutorialSummaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 24,
    padding: 20,
    borderRadius: 18,
    backgroundColor: COLORS.STEAM_NAVY,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  summaryText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.STEAM_BLUE,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  summaryButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  restartButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  restartButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default SettingsScreen;
