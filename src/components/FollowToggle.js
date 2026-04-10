import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet} from 'react-native';
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
import {debugLog} from '../hooks/hooksLogger';

/**
 * Bouton generique de suivi/desuivi d'un jeu.
 * La partie visuelle reagit immediatement au tap, puis la source de verite
 * reste synchronisee avec l'etat resolu du contexte.
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
  const {
    handleFollowGame,
    getResolvedFollowState,
    isGameFollowed,
    isFollowPending,
  } = useAppContext();

  const pressScale = useSharedValue(1);
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

  const [visualIsFollowed, setVisualIsFollowed] = useState(derivedIsFollowed);

  useEffect(() => {
    setVisualIsFollowed(derivedIsFollowed);
  }, [derivedIsFollowed]);

  const safeName = useMemo(() => name || 'Jeu inconnu', [name]);
  const safeImageUrl = useMemo(() => imageUrl || null, [imageUrl]);
  const followPending = useMemo(
    () => (appIdString ? isFollowPending?.(appIdString) : false),
    [appIdString, isFollowPending],
  );
  const buttonStateStyle = useMemo(
    () => (visualIsFollowed ? styles.buttonActive : styles.buttonInactive),
    [visualIsFollowed],
  );

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: pressScale.value}],
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

  const animatePressFeedback = useCallback(() => {
    if (followPending) {
      return;
    }

    cancelAnimation(pressScale);
    pressScale.value = withSequence(
      withTiming(0.95, {
        duration: 45,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 70,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [followPending, pressScale]);

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

  const handlePress = useCallback(async () => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }

    if (followPending) {
      return;
    }

    const nextIsFollowed = !visualIsFollowed;
    setVisualIsFollowed(nextIsFollowed);
    animatePressFeedback();

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
    });

    if (success && typeof onToggle === 'function') {
      onToggle({
        appId: appIdString,
        previousIsFollowed: derivedIsFollowed,
        nextIsFollowed,
      });
    }
  }, [
    appIdString,
    animateActivationFeedback,
    animatePressFeedback,
    derivedIsFollowed,
    followPending,
    handleFollowGame,
    onToggle,
    resetIconAnimation,
    safeImageUrl,
    safeName,
    visualIsFollowed,
  ]);

  return (
    <Animated.View style={[style, buttonAnimatedStyle]}>
      <Pressable
        style={[
          styles.button,
          buttonStateStyle,
          followPending ? styles.buttonDisabled : null,
        ]}
        disabled={followPending}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{disabled: followPending}}
        hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}
        testID={testID}>
        <Animated.View style={iconAnimatedStyle}>
          <Icon
            name={visualIsFollowed ? 'notifications' : 'notifications-outline'}
            size={size}
            color={visualIsFollowed ? activeColor : inactiveColor}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
