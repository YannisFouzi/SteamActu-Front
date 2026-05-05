import React, {useCallback, useState} from 'react';
import {FlatList, Linking, RefreshControl} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../../../constants';
import {useAppContext} from '../../../context/AppContext';
import {steamService} from '../../../services/api';
import {showDialog} from '../../../hooks/hooksLogger';
import {getGameAppId} from '../../../utils';
import styles from '../styles';
import EmptyStateMessage from './EmptyStateMessage';
import GameItemAlt from './GameItemAlt';

const STEAM_PRIVACY_URL = 'https://steamcommunity.com/my/edit/settings';

const GamesList = React.memo(({listRef}) => {
  const {t} = useTranslation();
  const {filteredGames, refreshing, handleRefresh, sortOption, steamId, loadData} =
    useAppContext();
  const [checking, setChecking] = useState(false);

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
      if (response.data?.visible) {
        showDialog({
          title: t('common.success'),
          message: t('games.checkVisibilitySuccess'),
          tone: 'success',
          buttons: [{text: 'OK'}],
        });
        loadData(true, 'checkVisibility');
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
  }, [checking, loadData, steamId, t]);

  const renderEmptyList = () =>
    sortOption === 'recentsPlus' ? (
      <EmptyStateMessage
        styles={styles}
        iconName="time-outline"
        title={t('games.recentsPlusEmptyTitle')}
        text={t('games.recentsPlusEmptyText')}
      />
    ) : (
      <EmptyStateMessage
        styles={styles}
        iconName="lock-closed-outline"
        title={t('games.libraryEmptyTitle')}
        text={t('games.libraryEmptyText')}
        actionText={t('games.libraryEmptyPrivacyAction')}
        onAction={openSteamPrivacy}
        secondaryActionText={t('games.checkVisibilityAction')}
        onSecondaryAction={checkVisibility}
        secondaryActionLoading={checking}
      />
    );

  return (
    <FlatList
      ref={listRef}
      data={filteredGames}
      renderItem={({item}) => <GameItemAlt game={item} />}
      keyExtractor={(item, index) => {
        const appId = getGameAppId(item);
        return appId ? `${appId}-${index}` : `game-${index}`;
      }}
      contentContainerStyle={styles.gamesList}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[COLORS.STEAM_BLUE]}
          tintColor={COLORS.STEAM_BLUE}
        />
      }
      ListEmptyComponent={renderEmptyList}
    />
  );
});

GamesList.displayName = 'GamesList';

export default GamesList;
