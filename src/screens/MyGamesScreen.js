import {useFocusEffect} from '@react-navigation/native';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Linking, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import LoadingContainer from '../components/LoadingContainer';
import {useAppContext} from '../context/AppContext';
import {showDialog} from '../hooks/hooksLogger';
import {steamService} from '../services/api';
import EmptyStateMessage from './Home/components/EmptyStateMessage';
import GamesList from './Home/components/GamesList';
import SortOptions from './Home/components/SortOptions';
import styles from './Home/styles';

const STEAM_PRIVACY_URL = 'https://steamcommunity.com/my/edit/settings';

const MyGamesScreen = () => {
  const {t} = useTranslation();
  const {
    games,
    loading: gamesLoading,
    sortOption,
    setSortOption,
    filterAndSortGames,
    maybeRefreshGames,
    steamId,
    loadData,
    visibilityHint,
    updateVisibilityHint,
  } = useAppContext();
  const listRef = useRef(null);
  const [checking, setChecking] = useState(false);

  const sortOptions = useMemo(
    () => [
      {value: 'lastTwoWeeks', label: t('games.recentTwoWeeks')},
      {value: 'default', label: t('games.sortAZ')},
      {value: 'mostPlayed', label: t('games.topPlayed')},
    ],
    [t],
  );

  const handleMyGamesSortChange = useCallback(
    option => {
      setSortOption(option);
      filterAndSortGames();
      if (listRef.current) {
        listRef.current.scrollToOffset({offset: 0, animated: true});
      }
    },
    [filterAndSortGames, setSortOption],
  );

  useFocusEffect(
    useCallback(() => {
      maybeRefreshGames('myGamesScreen');
    }, [maybeRefreshGames]),
  );

  const openSteamPrivacy = useCallback(() => {
    Linking.openURL(STEAM_PRIVACY_URL);
  }, []);

  const checkVisibility = useCallback(async () => {
    if (!steamId || checking) {
      return;
    }
    setChecking(true);
    try {
      const response = await steamService.checkVisibility(steamId);
      const gamesVisible =
        response.data?.gamesVisible === true ||
        response.data?.visible === true;
      const gameDetailsVisible =
        gamesVisible ||
        response.data?.gameDetailsVisible === true ||
        response.data?.wishlistVisible === true;

      updateVisibilityHint({
        gameDetailsVisible,
        gamesVisible,
        playtimeVisible: response.data?.playtimeVisible === true,
      });

      if (gamesVisible) {
        showDialog({
          title: t('common.success'),
          message: t('games.checkVisibilitySuccess'),
          tone: 'success',
          buttons: [
            {text: 'OK', onPress: () => loadData(true, 'checkVisibility')},
          ],
        });
      } else if (gameDetailsVisible) {
        showDialog({
          title: t('common.info'),
          message: t('games.checkVisibilityPlaytimeStillPrivate'),
          tone: 'warning',
          buttons: [{text: 'OK'}],
        });
      } else {
        showDialog({
          title: t('common.info'),
          message: t('games.checkVisibilityStillPrivate'),
          tone: 'warning',
          buttons: [{text: 'OK'}],
        });
      }
    } catch (error) {
      showDialog({
        title: t('common.info'),
        message: t('games.checkVisibilityStillPrivate'),
        tone: 'warning',
        buttons: [{text: 'OK'}],
      });
    } finally {
      setChecking(false);
    }
  }, [checking, loadData, steamId, t, updateVisibilityHint]);

  const hasGames = Array.isArray(games) && games.length > 0;
  const showLockedState = !gamesLoading && !hasGames;

  if (gamesLoading) {
    return (
      <View style={styles.container}>
        <LoadingContainer text={t('games.loadingGames')} />
      </View>
    );
  }

  if (showLockedState) {
    const gameDetailsCompleted = visibilityHint?.gameDetailsVisible === true;
    return (
      <View style={styles.container}>
        <EmptyStateMessage
          styles={styles}
          iconName="lock-closed-outline"
          title={t('games.libraryEmptyTitle')}
          instructions={[
            {
              text: t('games.privacyGameDetailsStep'),
              completed: gameDetailsCompleted,
            },
            t('games.privacyPlaytimeStep'),
          ]}
          actionText={t('games.libraryEmptyPrivacyAction')}
          onAction={openSteamPrivacy}
          secondaryActionText={t('games.checkVisibilityAction')}
          onSecondaryAction={checkVisibility}
          secondaryActionLoading={checking}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SortOptions
        options={sortOptions}
        selectedValue={sortOption}
        onSelect={handleMyGamesSortChange}
      />
      <GamesList listRef={listRef} />
    </View>
  );
};

export default MyGamesScreen;
