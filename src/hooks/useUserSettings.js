import {useMemo} from 'react';
import {useAppContext} from '../context/AppContext';

export const useUserSettings = () => {
  const {
    settingsLoading,
    settingsSaving,
    newsNotifications,
    libraryFollowMode,
    wishlistFollowMode,
    confirmUnfollowGames,
    handleToggleNews,
    handleLibraryModeChange,
    handleWishlistModeChange,
    handleConfirmUnfollowGamesChange,
  } = useAppContext();

  return useMemo(
    () => ({
      loading: settingsLoading,
      saving: settingsSaving,
      newsNotifications,
      libraryFollowMode,
      wishlistFollowMode,
      confirmUnfollowGames,
      handleToggleNews,
      handleLibraryModeChange,
      handleWishlistModeChange,
      handleConfirmUnfollowGamesChange,
    }),
    [
      confirmUnfollowGames,
      handleConfirmUnfollowGamesChange,
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
