import React, {useEffect} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {COLORS, SPACING} from '../../../constants';

const STAGGER_DELAY = 120;
const ENTRANCE_DURATION = 550;

const ENTRANCE_STEPS = {logo: 0, title: 1, features: 2};

const FEATURES = [
  {icon: 'newspaper-outline', labelKey: 'feature1'},
  {icon: 'notifications-outline', labelKey: 'feature2'},
  {icon: 'heart-outline', labelKey: 'feature3'},
];

const useFadeSlide = (stepIndex) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      progress.value = withTiming(1, {
        duration: ENTRANCE_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }, stepIndex * STAGGER_DELAY);

    return () => clearTimeout(timeout);
  }, [stepIndex, progress]);

  return useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{translateY: interpolate(progress.value, [0, 1], [14, 0])}],
  }));
};

const FeaturePill = ({icon, label}) => (
  <View style={styles.featureRow}>
    <View style={styles.featureIconWrap}>
      <Ionicons name={icon} size={16} color={COLORS.STEAM_BLUE} />
    </View>
    <Text style={styles.featureLabel}>{label}</Text>
  </View>
);

const LoginHero = ({title, features}) => {
  const logoScale = useSharedValue(0.8);

  const logoFadeSlide = useFadeSlide(ENTRANCE_STEPS.logo);
  const titleFadeSlide = useFadeSlide(ENTRANCE_STEPS.title);
  const featuresFadeSlide = useFadeSlide(ENTRANCE_STEPS.features);

  useEffect(() => {
    logoScale.value = withSpring(1, {damping: 14, stiffness: 80});
  }, [logoScale]);

  const logoSpringStyle = useAnimatedStyle(() => ({
    transform: [{scale: logoScale.value}],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, logoFadeSlide]}>
        <Animated.View style={logoSpringStyle}>
          <Image
            source={require('../../../assets/steam-logov2.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>

      <Animated.Text style={[styles.title, titleFadeSlide]}>
        {title}
      </Animated.Text>

      <Animated.View style={[styles.featuresContainer, featuresFadeSlide]}>
        {FEATURES.map((feature) => (
          <FeaturePill
            key={feature.labelKey}
            icon={feature.icon}
            label={features[feature.labelKey]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: SPACING.xxl + 12,
  },
  logoWrap: {
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 240,
    height: 240,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xl + 4,
  },
  featuresContainer: {
    gap: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 192, 244, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  featureLabel: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default LoginHero;
