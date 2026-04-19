import {useMemo} from 'react';
import {useAppContext} from '../context/AppContext';

export const useUserSettings = () => {
  const {
    settingsLoading,
    settingsSaving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
  } = useAppContext();

  return useMemo(
    () => ({
      loading: settingsLoading,
      saving: settingsSaving,
      newsNotifications,
      libraryFollowMode,
      wishlistFollowMode,
      handleToggleNews,
      handleLibraryModeChange,
      handleWishlistModeChange,
    }),
    [
      handleLibraryModeChange,
      handleToggleNews,
      handleWishlistModeChange,
      libraryFollowMode,
      newsNotifications,
      settingsLoading,
      settingsSaving,
      wishlistFollowMode,
    ],
  );
};
