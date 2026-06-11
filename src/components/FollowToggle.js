import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS} from '../constants';
import {useAppContext} from '../context/AppContext';
import {debugLog, showDialog} from '../hooks/hooksLogger';

/**
 * Suivi à deux niveaux d'un jeu : [+] puis [cloche].
 *
 * - [+] (gauche) : suivre/désabonner. Actif = le jeu est suivi (news dans le
 *   fil). Tap quand non suivi = suivi SILENCIEUX (pas de notifications) ;
 *   tap quand suivi = désabonnement (avec la confirmation existante).
 * - [cloche] (droite) : notifications. Tap quand non suivi = suit ET notifie
 *   d'un coup (comportement historique) ; tap quand suivi = bascule juste les
 *   notifications sans désabonner.
 *
 * La partie visuelle réagit immédiatement au tap, puis la source de vérité
 * reste synchronisée avec l'état résolu du contexte.
 */
const FollowToggle = ({
  appId,
  name,
  imageUrl,
  isFollowed: isFollowedProp,
  size = 28,
  activeColor = COLORS.SUCCESS,
  inactiveColor = COLORS.STEAM_LIGHT_BLUE,
  style,
  onToggle,
  testID,
}) => {
  const {t} = useTranslation();
  const {
    handleFollowGame,
    handleToggleGameNotifications,
    getResolvedFollowState,
    isGameFollowed,
    isGameNotified,
    isFollowPending,
    confirmUnfollowGames,
    handleConfirmUnfollowGamesChange,
  } = useAppContext();

  const plusScale = useSharedValue(1);
  const bellScale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  const appIdString = useMemo(() => (appId ? appId.toString() : ''), [appId]);

  const derivedIsFollowed = useMemo(() => {
    if (!appIdString) {
      return false;
    }

    if (typeof getResolvedFollowState === 'function') {
      return getResolvedFollowState(appIdString, isFollowedProp);
    }

    if (typeof isFollowedProp === 'boolean') {
      return isFollowedProp;
    }

    return isGameFollowed(appIdString);
  }, [appIdString, getResolvedFollowState, isFollowedProp, isGameFollowed]);

  // notified = suivi ET notifications actives. Garde défensive : si le
  // contexte ne fournit pas (encore) isGameNotified, un jeu suivi est notifié
  // (équivalent au comportement historique).
  const derivedIsNotified = useMemo(() => {
    if (!appIdString || !derivedIsFollowed) {
      return false;
    }
    if (typeof isGameNotified === 'function') {
      return isGameNotified(appIdString);
    }
    return true;
  }, [appIdString, derivedIsFollowed, isGameNotified]);

  const [visualIsFollowed, setVisualIsFollowed] = useState(derivedIsFollowed);
  const [visualIsNotified, setVisualIsNotified] = useState(derivedIsNotified);

  useEffect(() => {
    setVisualIsFollowed(derivedIsFollowed);
  }, [derivedIsFollowed]);

  useEffect(() => {
    setVisualIsNotified(derivedIsNotified);
  }, [derivedIsNotified]);

  const safeName = useMemo(() => name || 'Jeu inconnu', [name]);
  const safeImageUrl = useMemo(() => imageUrl || null, [imageUrl]);
  const followPending = useMemo(
    () => (appIdString ? isFollowPending?.(appIdString) : false),
    [appIdString, isFollowPending],
  );

  const plusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: plusScale.value}],
  }));

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: bellScale.value}],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: iconScale.value},
      {rotate: `${iconRotate.value}deg`},
    ],
  }));

  const resetIconAnimation = useCallback(() => {
    cancelAnimation(iconScale);
    cancelAnimation(iconRotate);

    iconScale.value = withTiming(1, {
      duration: 90,
      easing: Easing.out(Easing.quad),
    });
    iconRotate.value = withTiming(0, {
      duration: 90,
      easing: Easing.out(Easing.quad),
    });
  }, [iconRotate, iconScale]);

  const animatePressFeedback = useCallback(
    scaleValue => {
      if (followPending) {
        return;
      }

      cancelAnimation(scaleValue);
      scaleValue.value = withSequence(
        withTiming(0.95, {
          duration: 45,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 70,
          easing: Easing.out(Easing.cubic),
        }),
      );
    },
    [followPending],
  );

  const animateActivationFeedback = useCallback(() => {
    cancelAnimation(iconScale);
    cancelAnimation(iconRotate);

    iconScale.value = 1;
    iconRotate.value = 0;

    iconScale.value = withSequence(
      withTiming(1.08, {
        duration: 80,
        easing: Easing.out(Easing.cubic),
      }),
      withSpring(1, {
        damping: 14,
        stiffness: 220,
        mass: 0.6,
      }),
    );

    iconRotate.value = withSequence(
      withTiming(8, {
        duration: 70,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(-7, {
        duration: 80,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(4, {
        duration: 70,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(-2, {
        duration: 60,
        easing: Easing.inOut(Easing.quad),
      }),
      withTiming(0, {
        duration: 60,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [iconRotate, iconScale]);

  // Follow/unfollow via la queue offline (comportement historique).
  // `notifications:false` = suivi silencieux (tap sur le +).
  const commitFollowChange = useCallback(
    async (nextIsFollowed, {notifications = true, pressedScale} = {}) => {
      setVisualIsFollowed(nextIsFollowed);
      setVisualIsNotified(nextIsFollowed && notifications);
      animatePressFeedback(pressedScale || bellScale);

      if (nextIsFollowed) {
        animateActivationFeedback();
      } else {
        resetIconAnimation();
      }

      const success = await handleFollowGame({
        appId: appIdString,
        name: safeName,
        imageUrl: safeImageUrl,
        isFollowed: derivedIsFollowed,
        notifications,
      });

      if (success && typeof onToggle === 'function') {
        onToggle({
          appId: appIdString,
          previousIsFollowed: derivedIsFollowed,
          nextIsFollowed,
        });
      }
    },
    [
      animateActivationFeedback,
      animatePressFeedback,
      appIdString,
      bellScale,
      derivedIsFollowed,
      handleFollowGame,
      onToggle,
      resetIconAnimation,
      safeImageUrl,
      safeName,
    ],
  );

  const confirmThenUnfollow = useCallback(
    pressedScale => {
      if (!confirmUnfollowGames) {
        commitFollowChange(false, {pressedScale});
        return;
      }

      showDialog({
        title: t('settings.confirmUnfollowTitle'),
        message: t('settings.confirmUnfollowMessage', {game: safeName}),
        tone: 'warning',
        icon: 'bell-off-outline',
        confirmCheckboxLabel: t('settings.confirmUnfollowCheckbox'),
        options: {cancelable: true},
        buttons: [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('settings.confirmUnfollowConfirm'),
            style: 'destructive',
            onPress: async ({dontShowAgain}) => {
              if (dontShowAgain) {
                await handleConfirmUnfollowGamesChange(false);
              }
              await commitFollowChange(false, {pressedScale});
            },
          },
        ],
      });
    },
    [
      commitFollowChange,
      confirmUnfollowGames,
      handleConfirmUnfollowGamesChange,
      safeName,
      t,
    ],
  );

  // [+] : non suivi → suivi silencieux ; suivi → désabonnement (confirmé).
  const handlePlusPress = useCallback(() => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }
    if (followPending) {
      return;
    }

    if (!visualIsFollowed) {
      commitFollowChange(true, {notifications: false, pressedScale: plusScale});
      return;
    }

    confirmThenUnfollow(plusScale);
  }, [
    appIdString,
    commitFollowChange,
    confirmThenUnfollow,
    followPending,
    plusScale,
    visualIsFollowed,
  ]);

  // [cloche] : non suivi → suit ET notifie ; suivi → bascule notifications
  // seulement (jamais de désabonnement par la cloche).
  const handleBellPress = useCallback(async () => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }
    if (followPending) {
      return;
    }

    if (!visualIsFollowed) {
      commitFollowChange(true, {notifications: true, pressedScale: bellScale});
      return;
    }

    if (typeof handleToggleGameNotifications !== 'function') {
      return;
    }

    const nextIsNotified = !visualIsNotified;
    setVisualIsNotified(nextIsNotified);
    animatePressFeedback(bellScale);
    if (nextIsNotified) {
      animateActivationFeedback();
    } else {
      resetIconAnimation();
    }

    const success = await handleToggleGameNotifications(appIdString);
    if (!success) {
      setVisualIsNotified(!nextIsNotified); // revert visuel
    }
  }, [
    animateActivationFeedback,
    animatePressFeedback,
    appIdString,
    bellScale,
    commitFollowChange,
    followPending,
    handleToggleGameNotifications,
    resetIconAnimation,
    visualIsFollowed,
    visualIsNotified,
  ]);

  const bellIsActive = visualIsFollowed && visualIsNotified;

  return (
    <View style={[styles.row, style]}>
      <Animated.View style={plusAnimatedStyle}>
        <Pressable
          style={[
            styles.button,
            visualIsFollowed ? styles.buttonActive : styles.buttonInactive,
            followPending ? styles.buttonDisabled : null,
          ]}
          disabled={followPending}
          onPress={handlePlusPress}
          accessibilityRole="button"
          accessibilityState={{disabled: followPending}}
          accessibilityLabel={
            visualIsFollowed
              ? t('games.unfollowA11y')
              : t('games.followSilentA11y')
          }
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          testID={testID ? `${testID}-plus` : undefined}>
          <Icon
            name={visualIsFollowed ? 'checkmark-circle' : 'add-circle-outline'}
            size={size}
            color={visualIsFollowed ? activeColor : inactiveColor}
          />
        </Pressable>
      </Animated.View>
      <Animated.View style={bellAnimatedStyle}>
        <Pressable
          style={[
            styles.button,
            bellIsActive ? styles.buttonActive : styles.buttonInactive,
            followPending ? styles.buttonDisabled : null,
          ]}
          disabled={followPending}
          onPress={handleBellPress}
          accessibilityRole="button"
          accessibilityState={{disabled: followPending}}
          accessibilityLabel={
            bellIsActive
              ? t('games.notificationsOffA11y')
              : t('games.notificationsOnA11y')
          }
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          testID={testID}>
          <Animated.View style={iconAnimatedStyle}>
            <Icon
              name={bellIsActive ? 'notifications' : 'notifications-outline'}
              size={size}
              color={bellIsActive ? activeColor : inactiveColor}
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.28)',
  },
  buttonInactive: {
    backgroundColor: 'rgba(42, 71, 94, 0.08)',
    borderColor: 'rgba(42, 71, 94, 0.18)',
  },
  buttonDisabled: {
    opacity: 1,
  },
});

export default FollowToggle;
