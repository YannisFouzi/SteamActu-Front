import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import {LANGUAGE_NATIVE_LABELS, SUPPORTED_LANGUAGES} from '../i18n';
import {useAppLanguage} from '../hooks/useAppLanguage';
import {
  debugError,
  reportError,
  showAlert,
  showDialog,
} from '../hooks/hooksLogger';
import {useAdminAccess} from '../hooks/useAdminAccess';
import {useUserSettings} from '../hooks/useUserSettings';
import {userService} from '../services/api';
import {TUTORIAL_STEPS} from '../tutorial/steps';
import {useTutorial} from '../tutorial/useTutorial';
import ProfileHeader from './settings/components/ProfileHeader';
import SettingsFeedbackForm from './settings/components/SettingsFeedbackForm';
import SettingsGroup from './settings/components/SettingsGroup';
import SettingsRow from './settings/components/SettingsRow';
import styles from './settings/SettingsScreen.styles';

const SUPPORT_LINKS = [
  {labelKey: 'common.contact', icon: 'mail-outline', route: 'Contact'},
  {labelKey: 'nav.termsOfService', icon: 'document-text-outline', route: 'TermsOfService'},
  {labelKey: 'nav.privacyPolicy', icon: 'shield-checkmark-outline', route: 'PrivacyPolicy'},
];

const EmptyHeaderButton = () => null;

const AdminHeaderButton = () => {
  const navigation = useNavigation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Admin"
      hitSlop={8}
      style={styles.adminHeaderButton}
      onPress={() => navigation.navigate('AdminStats')}>
      <Ionicons
        name="shield-checkmark-outline"
        size={16}
        color={COLORS.STEAM_DARK_BLUE}
      />
      <Text style={styles.adminHeaderButtonText}>Admin</Text>
    </Pressable>
  );
};

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const {handleLogout, steamId} = useAppContext();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasAdminAccess = useAdminAccess();

  const {
    loading: settingsLoading,
    saving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    confirmUnfollowGames,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
    handleConfirmUnfollowGamesChange,
  } = useUserSettings();

  const {
    restartTutorial,
    requestMeasure,
    state: tutorialState,
  } = useTutorial();

  const {appLanguage, savingLanguage, handleLanguageChange} =
    useAppLanguage(steamId);

  const scrollViewRef = useRef(null);
  const notifGroupYRef = useRef(null);
  const autoFollowGroupYRef = useRef(null);

  // Quand le tutoriel atteint une étape "Settings", on défile jusqu'au groupe
  // ciblé : sinon l'encadré viserait l'ancienne position de scroll.
  const scrollToActiveTutorialStep = useCallback(() => {
    if (tutorialState.status !== 'running') {
      return;
    }
    const step = TUTORIAL_STEPS[tutorialState.stepIndex];
    if (!step || step.screen !== 'Settings' || step.isSummary) {
      return;
    }
    const targetId = step.targets?.[0]?.id;
    let targetY = null;
    if (targetId === 'settings-notifications') {
      targetY = notifGroupYRef.current;
    } else if (
      targetId === 'settings-library' ||
      targetId === 'settings-wishlist'
    ) {
      targetY = autoFollowGroupYRef.current;
    }
    if (targetY == null || !scrollViewRef.current) {
      return;
    }
    scrollViewRef.current.scrollTo({
      y: Math.max(targetY - 12, 0),
      animated: true,
    });
    // Le scroll déplace la cible sans déclencher onLayout : on force la
    // re-mesure une fois l'animation terminée pour recaler l'encadré.
    setTimeout(requestMeasure, 360);
  }, [requestMeasure, tutorialState.status, tutorialState.stepIndex]);

  useEffect(() => {
    scrollToActiveTutorialStep();
  }, [scrollToActiveTutorialStep]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: hasAdminAccess ? AdminHeaderButton : EmptyHeaderButton,
    });
  }, [hasAdminAccess, navigation]);

  const followOptions = useMemo(
    () => [
      {value: 'off', title: t('followModes.offTitle')},
      {value: 'auto', title: t('followModes.autoTitle')},
      {value: 'prompt', title: t('followModes.promptTitle')},
    ],
    [t],
  );

  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map(code => ({
        value: code,
        title: LANGUAGE_NATIVE_LABELS[code],
      })),
    [],
  );

  const handlePressLogout = useCallback(() => {
    if (loggingOut) {
      return;
    }
    showDialog({
      title: t('auth.logoutConfirmTitle'),
      message: t('auth.logoutConfirmMessage'),
      icon: 'logout',
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
              reportError(error, {scope: 'account.delete'});
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
      ref={scrollViewRef}
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}>
      <ProfileHeader />

      <SettingsGroup
        onLayout={event => {
          notifGroupYRef.current = event.nativeEvent.layout.y;
          scrollToActiveTutorialStep();
        }}>
        <SettingSection
          label={t('settings.newsNotificationsLabel')}
          value={newsNotifications}
          onValueChange={handleToggleNews}
          disabled={saving || loggingOut}
          tutorialTargetId="settings-notifications"
        />
        <SettingSection
          label={t('settings.confirmUnfollowLabel')}
          value={confirmUnfollowGames}
          onValueChange={handleConfirmUnfollowGamesChange}
          disabled={saving || loggingOut}
        />
      </SettingsGroup>

      <SettingsGroup
        title={t('common.autoFollow')}
        description={t('settings.autoFollowDescription')}
        onLayout={event => {
          autoFollowGroupYRef.current = event.nativeEvent.layout.y;
          scrollToActiveTutorialStep();
        }}>
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
        <SettingsRow
          icon="school-outline"
          label={t('settings.reviewTutorial')}
          onPress={restartTutorial}
        />
      </SettingsGroup>

      <SettingsGroup title={t('settings.feedbackSectionTitle')}>
        <SettingsFeedbackForm steamId={steamId} />
      </SettingsGroup>

      <SettingsGroup title={t('settings.sectionSupportTitle')}>
        {SUPPORT_LINKS.map(link => (
          <SettingsRow
            key={link.route}
            icon={link.icon}
            label={t(link.labelKey)}
            onPress={() => navigation.navigate(link.route)}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup>
        <Pressable
          style={styles.actionRow}
          onPress={handlePressLogout}
          disabled={loggingOut}
          android_ripple={{color: 'rgba(192, 57, 43, 0.08)'}}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.ERROR} style={styles.actionIcon} />
          <Text style={styles.destructiveText}>
            {loggingOut ? t('auth.loggingOut') : t('auth.logout')}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionRow}
          onPress={handleDeleteAccount}
          disabled={deleting || loggingOut || saving}
          android_ripple={{color: 'rgba(192, 57, 43, 0.06)'}}>
          <Ionicons name="trash-outline" size={20} color={COLORS.ERROR} style={styles.actionIcon} />
          <Text style={styles.destructiveText}>
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
