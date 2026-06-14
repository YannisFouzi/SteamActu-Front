import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
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

// Sécurité : l'intention d'un tap est relâchée après ce délai si le contexte ne
// l'a pas confirmée (échec permanent rare), pour que la couleur suive la réalité.
const INTENT_SETTLE_TIMEOUT_MS = 6000;

/**
 * Suivi à deux niveaux d'un jeu : [+] puis [cloche].
 *
 * - [+] (gauche) : suivre / désabonner. Tap non suivi → suivi SILENCIEUX ;
 *   tap suivi → désabonnement (avec la confirmation existante).
 * - [cloche] (droite) : notifications. Tap non suivi → suit ET notifie d'un
 *   coup ; tap suivi → bascule juste les notifications sans désabonner.
 *
 * FEEDBACK INSTANTANÉ : la couleur est pilotée par un état LOCAL
 * (followedVisual/notifiedVisual) mis à jour SYNCHRONEMENT au tap, puis le
 * travail lourd du contexte est DIFFÉRÉ (setTimeout 0) pour ne pas être batché
 * avec le changement de couleur — sinon la couleur attendait le gros re-render
 * de l'app (~1 s sur device chargé). L'état local se re-synchronise ensuite sur
 * l'état résolu du contexte (qui est fiable : overlay + pas de reload parasite),
 * donc aucun flash : le contexte rattrape toujours la même valeur.
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
    confirmUnfollowGames,
    handleConfirmUnfollowGamesChange,
  } = useAppContext();

  const plusScale = useSharedValue(1);
  const bellScale = useSharedValue(1);
  const bellIconScale = useSharedValue(1);
  const bellIconRotate = useSharedValue(0);

  const appIdString = useMemo(() => (appId ? appId.toString() : ''), [appId]);

  // ── État résolu du contexte (source de vérité éventuelle) ──
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

  const derivedIsNotified = useMemo(() => {
    if (!appIdString || !derivedIsFollowed) {
      return false;
    }
    if (typeof isGameNotified === 'function') {
      return isGameNotified(appIdString);
    }
    return true;
  }, [appIdString, derivedIsFollowed, isGameNotified]);

  // ── État visuel LOCAL : pilote la couleur, instantané au tap ──
  const [followedVisual, setFollowedVisual] = useState(derivedIsFollowed);
  const [notifiedVisual, setNotifiedVisual] = useState(derivedIsNotified);

  // Intention du dernier tap : {followed, notified} ou null. Tant qu'elle est
  // posée, on IGNORE les valeurs transitoires du contexte (échos de notre propre
  // action qui se propage lentement sur un device chargé : c'est ce qui faisait
  // clignoter la couleur). On la lève dès que le contexte CONFIRME l'intention,
  // ou si l'action échoue (revert). Un changement externe (pas d'intention en
  // cours) est appliqué immédiatement.
  const intentRef = useRef(null);
  const intentTimeoutRef = useRef(null);

  useEffect(
    () => () => {
      if (intentTimeoutRef.current) {
        clearTimeout(intentTimeoutRef.current);
      }
    },
    [],
  );

  // Reconciliation contexte → visuel, filtrée par l'intention.
  useEffect(() => {
    const intent = intentRef.current;
    if (intent) {
      if (
        intent.followed === derivedIsFollowed &&
        intent.notified === derivedIsNotified
      ) {
        // Le contexte a rattrapé l'intention → on relâche le verrou.
        intentRef.current = null;
        if (intentTimeoutRef.current) {
          clearTimeout(intentTimeoutRef.current);
          intentTimeoutRef.current = null;
        }
      }
      // Échos transitoires (≠ intention) ignorés : la couleur reste sur l'intention.
      return;
    }
    // Pas d'intention en cours → changement externe → on adopte.
    setFollowedVisual(derivedIsFollowed);
    setNotifiedVisual(derivedIsNotified);
  }, [derivedIsFollowed, derivedIsNotified]);

  const safeName = useMemo(() => name || 'Jeu inconnu', [name]);
  const safeImageUrl = useMemo(() => imageUrl || null, [imageUrl]);

  const plusAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: plusScale.value}],
  }));
  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: bellScale.value}],
  }));
  const bellIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {scale: bellIconScale.value},
      {rotate: `${bellIconRotate.value}deg`},
    ],
  }));

  const pressBounce = useCallback(scaleValue => {
    cancelAnimation(scaleValue);
    scaleValue.value = withSequence(
      withTiming(0.95, {duration: 45, easing: Easing.out(Easing.cubic)}),
      withTiming(1, {duration: 70, easing: Easing.out(Easing.cubic)}),
    );
  }, []);

  // Wiggle réservé à l'activation de la CLOCHE (jamais sur le +).
  const bellActivationWiggle = useCallback(() => {
    cancelAnimation(bellIconScale);
    cancelAnimation(bellIconRotate);
    bellIconScale.value = 1;
    bellIconRotate.value = 0;
    bellIconScale.value = withSequence(
      withTiming(1.08, {duration: 80, easing: Easing.out(Easing.cubic)}),
      withSpring(1, {damping: 14, stiffness: 220, mass: 0.6}),
    );
    bellIconRotate.value = withSequence(
      withTiming(8, {duration: 70, easing: Easing.out(Easing.quad)}),
      withTiming(-7, {duration: 80, easing: Easing.inOut(Easing.quad)}),
      withTiming(4, {duration: 70, easing: Easing.inOut(Easing.quad)}),
      withTiming(-2, {duration: 60, easing: Easing.inOut(Easing.quad)}),
      withTiming(0, {duration: 60, easing: Easing.out(Easing.quad)}),
    );
  }, [bellIconRotate, bellIconScale]);

  // Diffère le travail lourd (mutations contexte) hors du batch du tap, pour que
  // le changement de couleur (état local) peigne d'abord.
  const deferHeavyWork = useCallback(work => {
    setTimeout(work, 0);
  }, []);

  // Pose l'intention + état visuel instantané. Sur échec : on relâche
  // l'intention et on resynchronise sur le contexte (qui a reverté).
  // Sécurité : si le contexte ne confirme jamais l'intention (échec permanent
  // rare), on la lève après un délai pour que la couleur suive la réalité.
  const applyIntent = useCallback((followed, notified) => {
    intentRef.current = {followed, notified};
    setFollowedVisual(followed);
    setNotifiedVisual(notified);
    if (intentTimeoutRef.current) {
      clearTimeout(intentTimeoutRef.current);
    }
    intentTimeoutRef.current = setTimeout(() => {
      intentRef.current = null;
      intentTimeoutRef.current = null;
    }, INTENT_SETTLE_TIMEOUT_MS);
  }, []);

  const onActionFailed = useCallback(() => {
    intentRef.current = null;
    setFollowedVisual(derivedIsFollowed);
    setNotifiedVisual(derivedIsNotified);
  }, [derivedIsFollowed, derivedIsNotified]);

  const doFollow = useCallback(
    (notifications, pressedScale) => {
      applyIntent(true, notifications);
      pressBounce(pressedScale);
      if (notifications) {
        bellActivationWiggle();
      }
      deferHeavyWork(() => {
        handleFollowGame({
          appId: appIdString,
          name: safeName,
          imageUrl: safeImageUrl,
          isFollowed: derivedIsFollowed,
          notifications,
        }).then(success => {
          if (!success) {
            onActionFailed();
            return;
          }
          if (typeof onToggle === 'function') {
            onToggle({
              appId: appIdString,
              previousIsFollowed: derivedIsFollowed,
              nextIsFollowed: true,
            });
          }
        });
      });
    },
    [
      appIdString,
      applyIntent,
      bellActivationWiggle,
      deferHeavyWork,
      derivedIsFollowed,
      handleFollowGame,
      onActionFailed,
      onToggle,
      pressBounce,
      safeImageUrl,
      safeName,
    ],
  );

  const doUnfollow = useCallback(
    pressedScale => {
      applyIntent(false, false);
      pressBounce(pressedScale);
      deferHeavyWork(() => {
        handleFollowGame({
          appId: appIdString,
          name: safeName,
          imageUrl: safeImageUrl,
          isFollowed: derivedIsFollowed,
        }).then(success => {
          if (!success) {
            onActionFailed();
            return;
          }
          if (typeof onToggle === 'function') {
            onToggle({
              appId: appIdString,
              previousIsFollowed: derivedIsFollowed,
              nextIsFollowed: false,
            });
          }
        });
      });
    },
    [
      appIdString,
      applyIntent,
      deferHeavyWork,
      derivedIsFollowed,
      handleFollowGame,
      onActionFailed,
      onToggle,
      pressBounce,
      safeImageUrl,
      safeName,
    ],
  );

  // [+] : non suivi → suivi silencieux ; suivi → désabonnement (confirmé).
  const handlePlusPress = useCallback(() => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }

    if (!followedVisual) {
      doFollow(false, plusScale);
      return;
    }

    if (!confirmUnfollowGames) {
      doUnfollow(plusScale);
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
            doUnfollow(plusScale);
          },
        },
      ],
    });
  }, [
    appIdString,
    confirmUnfollowGames,
    doFollow,
    doUnfollow,
    followedVisual,
    handleConfirmUnfollowGamesChange,
    plusScale,
    safeName,
    t,
  ]);

  // [cloche] : non suivi → suit ET notifie ; suivi → bascule notifications.
  const handleBellPress = useCallback(() => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }

    if (!followedVisual) {
      doFollow(true, bellScale);
      return;
    }

    if (typeof handleToggleGameNotifications !== 'function') {
      return;
    }
    // Optimiste visuel INSTANTANÉ + intention (reste suivi, notif togglée)
    const nextNotified = !notifiedVisual;
    applyIntent(true, nextNotified);
    pressBounce(bellScale);
    if (nextNotified) {
      bellActivationWiggle();
    }
    deferHeavyWork(() => {
      // name/imageUrl : préservent la card (évite un placeholder "Jeu <id>" pour
      // les jeux hors liste locale — wishlist, jeux suivis).
      handleToggleGameNotifications(appIdString, {
        name: safeName,
        imageUrl: safeImageUrl,
      }).then(success => {
        if (!success) {
          onActionFailed();
        }
      });
    });
  }, [
    appIdString,
    applyIntent,
    bellActivationWiggle,
    bellScale,
    deferHeavyWork,
    doFollow,
    followedVisual,
    handleToggleGameNotifications,
    notifiedVisual,
    onActionFailed,
    pressBounce,
    safeImageUrl,
    safeName,
  ]);

  const bellIsActive = followedVisual && notifiedVisual;

  return (
    <View style={[styles.row, style]}>
      <Animated.View style={plusAnimatedStyle}>
        <Pressable
          style={[
            styles.button,
            followedVisual ? styles.buttonActive : styles.buttonInactive,
          ]}
          onPress={handlePlusPress}
          accessibilityRole="button"
          accessibilityLabel={
            followedVisual
              ? t('games.unfollowA11y')
              : t('games.followSilentA11y')
          }
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          testID={testID ? `${testID}-plus` : undefined}>
          <Icon
            name={followedVisual ? 'checkmark-circle' : 'add-circle-outline'}
            size={size}
            color={followedVisual ? activeColor : inactiveColor}
          />
        </Pressable>
      </Animated.View>
      <Animated.View style={bellAnimatedStyle}>
        <Pressable
          style={[
            styles.button,
            bellIsActive ? styles.buttonActive : styles.buttonInactive,
          ]}
          onPress={handleBellPress}
          accessibilityRole="button"
          accessibilityLabel={
            bellIsActive
              ? t('games.notificationsOffA11y')
              : t('games.notificationsOnA11y')
          }
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
          testID={testID}>
          <Animated.View style={bellIconAnimatedStyle}>
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
});

export default FollowToggle;
