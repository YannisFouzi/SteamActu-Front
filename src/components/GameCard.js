import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Image, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS, CONTAINER_STYLES} from '../constants';
import {showErrorMessage} from '../feedback/feedbackService';
import {debugError} from '../hooks/hooksLogger';
import FollowToggle from './FollowToggle';

const STEAM_STORE_URL_PREFIX = 'https://store.steampowered.com/app/';

const GameCard = ({
  game,
  imageUrl,
  fallbackImageUrl,
  followConfig = null,
  showDate = false,
  dateText = '',
}) => {
  const {t} = useTranslation();
  const [currentUrl, setCurrentUrl] = useState(imageUrl);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentUrl(imageUrl);
    setImageError(false);
  }, [imageUrl]);

  const handleImageError = useCallback(() => {
    if (currentUrl !== fallbackImageUrl && fallbackImageUrl) {
      setCurrentUrl(fallbackImageUrl);
    } else {
      setImageError(true);
    }
  }, [currentUrl, fallbackImageUrl]);

  // Resolution centralisee de l'appId Steam : c'est followConfig.appId qui est
  // l'unique source coherente passee par les 5 consommateurs (GameItemAlt,
  // WishlistScreen, FollowedGamesTab, StoreSearchResults, UnifiedSearchView).
  // Si aucun appId, la card reste un View statique non interactif.
  const steamAppId = useMemo(() => {
    const raw = followConfig?.appId;
    if (raw === null || raw === undefined) {
      return null;
    }
    const normalized = String(raw).trim();
    return normalized.length > 0 ? normalized : null;
  }, [followConfig]);

  const openSteamStorePage = useCallback(() => {
    if (!steamAppId) {
      return;
    }
    const url = `${STEAM_STORE_URL_PREFIX}${steamAppId}`;
    Linking.openURL(url).catch(error => {
      debugError("Erreur lors de l'ouverture de la page Steam:", error);
      showErrorMessage(t('common.error'), t('news.openLinkError'));
    });
  }, [steamAppId, t]);

  const isFamilyShared = Boolean(game?.isFamilyShared);
  const isPressable = steamAppId !== null;

  // L'interieur (image + info) est isole pour pouvoir le wrapper dans un
  // Pressable seulement quand on a un appId. Le FollowToggle est volontairement
  // hors du Pressable : tap sur la cloche => toggle suivi, tap ailleurs =>
  // ouverture Steam. Aucun risque de propagation puisqu'ils sont freres.
  const cardBody = (
    <>
      <View style={styles.imageContainer}>
        {imageError || !currentUrl ? (
          <View style={styles.imagePlaceholder}>
            <Icon
              name="game-controller-outline"
              size={32}
              color={COLORS.STEAM_TEXT_GRAY}
            />
          </View>
        ) : (
          <Image
            source={{uri: currentUrl}}
            style={styles.image}
            resizeMode="cover"
            onError={handleImageError}
          />
        )}
        {isFamilyShared ? (
          <View style={styles.familyBadge}>
            <Icon name="people" size={10} color="#FFFFFF" />
            <Text style={styles.familyBadgeText}>
              {t('games.familyBadge')}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {game.name}
        </Text>
        {showDate && dateText ? (
          <Text style={styles.date}>{dateText}</Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={styles.card}>
      {isPressable ? (
        <Pressable
          style={({pressed}) => [
            styles.pressableBody,
            pressed ? styles.pressableBodyPressed : null,
          ]}
          onPress={openSteamStorePage}
          accessibilityRole="link"
          accessibilityLabel={game?.name}
          testID="game-card-steam-link">
          {cardBody}
        </Pressable>
      ) : (
        <View style={styles.pressableBody}>{cardBody}</View>
      )}
      {followConfig ? (
        <FollowToggle
          appId={followConfig.appId}
          name={followConfig.name || game.name}
          imageUrl={followConfig.imageUrl || imageUrl}
          isFollowed={followConfig.isFollowed}
          size={followConfig.size}
          activeColor={followConfig.activeColor}
          inactiveColor={followConfig.inactiveColor}
          style={styles.followButton}
          onToggle={followConfig.onToggle}
          testID={followConfig.testID}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...CONTAINER_STYLES.card,
    flexDirection: 'row',
    marginBottom: 8,
    overflow: 'hidden',
  },
  pressableBody: {
    flex: 1,
    flexDirection: 'row',
  },
  pressableBodyPressed: {
    opacity: 0.65,
  },
  imageContainer: {
    width: 160,
    height: 80,
    overflow: 'hidden',
    position: 'relative',
  },
  familyBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 192, 244, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  familyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  image: {
    height: '100%',
    aspectRatio: 460 / 215,
    position: 'absolute',
    left: 0,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.PLACEHOLDER_GRAY,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.NEWS_TEXT_PRIMARY,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  followButton: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginRight: 12,
  },
});

export default GameCard;
