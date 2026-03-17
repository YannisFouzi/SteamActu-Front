import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FollowModeSetting from '../components/FollowModeSetting';
import LoadingContainer from '../components/LoadingContainer';
import OptionSetting from '../components/OptionSetting';
import SettingSection from '../components/SettingSection';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useAppLanguage} from '../hooks/useAppLanguage';
import {debugError, showAlert, showDialog} from '../hooks/hooksLogger';
import {useUserSettings} from '../hooks/useUserSettings';
import {userService} from '../services/api';
import {useTutorial} from '../tutorial/useTutorial';
import ProfileHeader from './settings/components/ProfileHeader';
import SettingsGroup from './settings/components/SettingsGroup';
import SettingsRow from './settings/components/SettingsRow';
import styles from './settings/SettingsScreen.styles';

const NAV_LINKS = [
  {label: 'settings.contactShortcut', icon: 'person-circle-outline', route: 'Contact'},
  {label: 'nav.termsOfService', icon: 'document-text-outline', route: 'TermsOfService'},
  {label: 'nav.privacyPolicy', icon: 'shield-checkmark-outline', route: 'PrivacyPolicy'},
];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {handleLogout, steamId} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    loading: settingsLoading,
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

  const followOptions = useMemo(
    () => [
      {value: 'off', title: t('followModes.offTitle')},
      {value: 'auto', title: t('followModes.autoTitle')},
      {value: 'prompt', title: t('followModes.promptTitle')},
    ],
    [t],
  );

  const languageOptions = useMemo(
    () => [
      {value: 'fr', title: t('common.french')},
      {value: 'en', title: t('common.english')},
    ],
    [t],
  );

  const handlePressLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }
    showDialog({
      title: t('auth.logoutConfirmTitle'),
      message: t('auth.logoutConfirmMessage'),
      options: {cancelable: true},
      buttons: [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoggingOut(true);
              await handleLogout();
            } catch (error) {
              debugError('[SETTINGS] Sign-out action failed:', error);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ],
    });
  }, [handleLogout, loggingOut, t]);

  const handleDeleteAccount = useCallback(() => {
    showDialog({
      title: t('settings.deleteAccountConfirmTitle'),
      message: t('settings.deleteAccountConfirmMessage'),
      tone: 'destructive',
      icon: 'trash-can-outline',
      options: {cancelable: true},
      buttons: [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              if (!steamId) {
                throw new Error(t('errors.missingSteamId'));
              }
              await userService.deleteAccount(steamId);
              await handleLogout();
            } catch (error) {
              debugError('[SETTINGS] Account deletion failed:', error);
              showAlert(t('common.error'), t('settings.deleteAccountError'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    });
  }, [handleLogout, steamId, t]);

  const followModeDisabled = saving || loggingOut;
  const languageDisabled = savingLanguage || loggingOut || deleting;

  if (settingsLoading) {
    return (
      <View style={styles.container}>
        <LoadingContainer />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <ProfileHeader />

      <SettingsGroup>
        <SettingSection
          label={t('settings.newsNotificationsLabel')}
          value={newsNotifications}
          onValueChange={handleToggleNews}
          disabled={saving || loggingOut}
          tutorialTargetId="settings-notifications"
        />
      </SettingsGroup>

      <SettingsGroup
        title={t('common.autoFollow')}
        description={t('settings.autoFollowDescription')}>
        <FollowModeSetting
          label={t('settings.libraryLabel')}
          value={libraryFollowMode}
          options={followOptions}
          onChange={handleLibraryModeChange}
          disabled={followModeDisabled}
          tutorialTargetId="settings-library"
        />
        <FollowModeSetting
          label={t('settings.wishlistLabel')}
          value={wishlistFollowMode}
          options={followOptions}
          onChange={handleWishlistModeChange}
          disabled={followModeDisabled}
          tutorialTargetId="settings-wishlist"
        />
      </SettingsGroup>

      <SettingsGroup>
        {NAV_LINKS.map(link => (
          <SettingsRow
            key={link.route}
            icon={link.icon}
            label={t(link.label)}
            onPress={() => navigation.navigate(link.route)}
          />
        ))}
        <SettingsRow
          icon="school-outline"
          label={
            isTutorialActive
              ? t('settings.tutorialFinish')
              : t('settings.reviewTutorial')
          }
          onPress={isTutorialActive ? completeTutorial : restartTutorial}
        />
      </SettingsGroup>

      <SettingsGroup>
        <OptionSetting
          label={t('settings.languageLabel')}
          description={t('settings.languageDescription')}
          value={appLanguage}
          options={languageOptions}
          onChange={handleLanguageChange}
          disabled={languageDisabled}
        />
      </SettingsGroup>

      <SettingsGroup>
        <Pressable
          style={styles.actionRow}
          onPress={handlePressLogout}
          disabled={loggingOut}
          android_ripple={{color: 'rgba(192, 57, 43, 0.08)'}}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.ERROR} style={styles.actionIcon} />
          <Text style={styles.logoutText}>
            {loggingOut ? t('auth.loggingIn') : t('auth.logout')}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionRow}
          onPress={handleDeleteAccount}
          disabled={deleting || loggingOut || saving}
          android_ripple={{color: 'rgba(192, 57, 43, 0.06)'}}>
          <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} style={styles.actionIcon} />
          <Text style={styles.deleteText}>
            {deleting ? t('settings.deleting') : t('settings.deleteAccount')}
          </Text>
        </Pressable>
      </SettingsGroup>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('settings.aboutVersion')}</Text>
      </View>
    </ScrollView>
  );
};

export default SettingsScreen;
