import {useMemo} from 'react';
import {useAppContext} from '../context/AppContext';

export const useUserSettings = () => {
  const {
    settingsStatus,
    isUserSettingsReady,
    settingsLoading,
    settingsSaving,
    steamId,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    hydrateUserSettings,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
  } = useAppContext();

  return useMemo(
    () => ({
      settingsStatus,
      isUserSettingsReady,
      loading: settingsLoading,
      saving: settingsSaving,
      steamId,
      newsNotifications,
      libraryFollowMode,
      wishlistFollowMode,
      handleToggleNews,
      handleLibraryModeChange,
      handleWishlistModeChange,
      loadUserSettings: hydrateUserSettings,
    }),
    [
      handleLibraryModeChange,
      handleToggleNews,
      handleWishlistModeChange,
      hydrateUserSettings,
      isUserSettingsReady,
      libraryFollowMode,
      newsNotifications,
      settingsLoading,
      settingsSaving,
      settingsStatus,
      steamId,
      wishlistFollowMode,
    ],
  );
};
