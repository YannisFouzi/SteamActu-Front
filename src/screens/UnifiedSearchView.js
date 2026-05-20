import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, SectionList, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import GameCard from '../components/GameCard';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {useStoreSearch} from '../hooks/useStoreSearch';
import {
  getGameAppId,
  getGameImageFallback,
  getGameImageUrl,
} from '../utils';

const SECTION_KEYS = {
  MY_GAMES: 'myGames',
  WISHLIST: 'wishlist',
  STORE: 'store',
};

const STORE_MIN_LENGTH = 3;

const UnifiedSearchView = ({filterWishlist, onWishlistFollowToggle}) => {
  const {t} = useTranslation();
  const {searchQuery, games} = useAppContext();
  const {results: storeResults, loading: storeLoading} =
    useStoreSearch(searchQuery);

  // La recherche possede sa propre vue de la bibliotheque : on filtre la liste
  // `games` complete par la query. On NE reutilise PAS `filteredGames` (onglet
  // Mes Jeux) car celui-ci herite du tri (`lastTwoWeeks` / `mostPlayed`) qui
  // ecarte les jeux non joues recemment — un jeu possede serait alors absent
  // des resultats de recherche selon le tri actif.
  const myGamesMatches = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    if (query === '' || !Array.isArray(games)) {
      return [];
    }
    return games
      .filter(game => game?.name?.toLowerCase().includes(query))
      .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [games, searchQuery]);

  const wishlistMatches = useMemo(() => {
    if (typeof filterWishlist !== 'function') {
      return [];
    }
    const trimmed = (searchQuery || '').trim();
    if (trimmed === '') {
      return [];
    }
    return filterWishlist(trimmed);
  }, [filterWishlist, searchQuery]);

  // Dedup par appId entre sections, priorite Mes jeux > Wishlist > Boutique.
  // Un meme jeu n'apparait qu'une seule fois, dans la section la plus haute ou il existe.
  const dedupedSections = useMemo(() => {
    const myGamesData = myGamesMatches;
    const seen = new Set();
    myGamesData.forEach(item => {
      const appId = getGameAppId(item);
      if (appId) {
        seen.add(String(appId));
      }
    });

    const dedupedWishlist = wishlistMatches.filter(item => {
      const appId = item?.appid;
      if (!appId) {
        return true;
      }
      return !seen.has(String(appId));
    });
    dedupedWishlist.forEach(item => {
      if (item?.appid) {
        seen.add(String(item.appid));
      }
    });

    const dedupedStore = storeResults.filter(item => {
      const appId = item?.appid;
      if (!appId) {
        return true;
      }
      return !seen.has(String(appId));
    });

    return {myGames: myGamesData, wishlist: dedupedWishlist, store: dedupedStore};
  }, [myGamesMatches, storeResults, wishlistMatches]);

  const sections = useMemo(
    () => [
      {
        key: SECTION_KEYS.MY_GAMES,
        title: t('unifiedResults.sectionMyGames'),
        data: dedupedSections.myGames,
      },
      {
        key: SECTION_KEYS.WISHLIST,
        title: t('unifiedResults.sectionWishlist'),
        data: dedupedSections.wishlist,
      },
      {
        key: SECTION_KEYS.STORE,
        title: t('unifiedResults.sectionStore'),
        data: dedupedSections.store,
        loading: storeLoading,
      },
    ],
    [dedupedSections, storeLoading, t],
  );

  const renderItem = useCallback(
    ({item, section}) => {
      if (section.key === SECTION_KEYS.STORE) {
        const appId = item.appid?.toString();
        const imageUrl = getGameImageUrl(item);
        const fallbackImageUrl = getGameImageFallback(item);
        return (
          <GameCard
            game={{name: item.name}}
            imageUrl={imageUrl}
            fallbackImageUrl={fallbackImageUrl}
            followConfig={{
              appId,
              name: item.name,
              imageUrl,
            }}
          />
        );
      }

      if (section.key === SECTION_KEYS.WISHLIST) {
        const appId = item.appid ? item.appid.toString() : null;
        const gameName =
          item.name ||
          (appId ? t('common.gameWithId', {appId}) : t('common.unknownGame'));
        const imageUrl = getGameImageUrl(item);
        const fallbackImageUrl = getGameImageFallback(item);
        return (
          <GameCard
            game={{name: gameName}}
            imageUrl={imageUrl}
            fallbackImageUrl={fallbackImageUrl}
            followConfig={
              appId
                ? {
                    appId,
                    name: gameName,
                    imageUrl,
                    isFollowed: item.isFollowed,
                    onToggle:
                      typeof onWishlistFollowToggle === 'function'
                        ? ({nextIsFollowed}) =>
                            onWishlistFollowToggle(appId, nextIsFollowed)
                        : undefined,
                  }
                : null
            }
          />
        );
      }

      const appId = getGameAppId(item);
      const imageUrl = getGameImageUrl(item);
      const fallbackImageUrl = getGameImageFallback(item);
      return (
        <GameCard
          game={item}
          imageUrl={imageUrl}
          fallbackImageUrl={fallbackImageUrl}
          followConfig={
            appId
              ? {
                  appId: appId.toString(),
                  name: item.name,
                  imageUrl,
                }
              : null
          }
        />
      );
    },
    [onWishlistFollowToggle, t],
  );

  const trimmedQuery = (searchQuery || '').trim();
  const storeQueryTooShort =
    trimmedQuery.length > 0 && trimmedQuery.length < STORE_MIN_LENGTH;

  const renderSectionHeader = useCallback(
    ({section}) => {
      const showLoading = section.key === SECTION_KEYS.STORE && section.loading;
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {showLoading ? (
            <ActivityIndicator
              size="small"
              color={COLORS.STEAM_TEXT_GRAY}
              style={styles.sectionSpinner}
            />
          ) : null}
        </View>
      );
    },
    [],
  );

  const keyExtractor = useCallback((item, index) => {
    const appId = item.appid ?? getGameAppId(item);
    return appId ? `${appId}-${index}` : `unified-${index}`;
  }, []);

  const visibleSections = useMemo(
    () =>
      sections.filter(section => {
        if (section.data.length > 0) {
          return true;
        }
        if (section.key === SECTION_KEYS.STORE) {
          if (storeQueryTooShort) {
            return false;
          }
          return Boolean(section.loading);
        }
        return false;
      }),
    [sections, storeQueryTooShort],
  );

  return (
    <SectionList
      sections={visibleSections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      contentContainerStyle={styles.listContent}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_NAVY,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 18,
    paddingBottom: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.STEAM_TEXT_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionSpinner: {
    marginLeft: 6,
  },
});

export default UnifiedSearchView;
