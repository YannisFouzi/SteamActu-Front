import React, {useEffect} from 'react';
import {ScrollView, StatusBar, View} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SteamLoginButton from '../components/SteamLoginButton';
import {COLORS} from '../constants';
import {useSteamAuth} from '../hooks/useSteamAuth';
import LoginBackground from './login/components/LoginBackground';
import LoginHero from './login/components/LoginHero';
import LoginStatusCard from './login/components/LoginStatusCard';
import styles from './login/LoginScreen.styles';

const CTA_ENTRANCE_DELAY = 450;
const CTA_ENTRANCE_DURATION = 500;

const getAuthStatusContent = (t, authFlowState) => {
  if (authFlowState === 'pending') {
    return {
      variant: 'pending',
      title: t('auth.loginPendingTitle'),
      message: t('auth.loginPendingMessage'),
    };
  }

  if (authFlowState === 'expired') {
    return {
      variant: 'expired',
      title: t('auth.loginExpiredTitle'),
      message: t('auth.loginExpiredMessage'),
    };
  }

  return null;
};

const LoginScreen = () => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const {loading, authFlowState, handleSteamLogin} = useSteamAuth();

  const ctaProgress = useSharedValue(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      ctaProgress.value = withTiming(1, {
        duration: CTA_ENTRANCE_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }, CTA_ENTRANCE_DELAY);

    return () => clearTimeout(timeout);
  }, [ctaProgress]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ctaProgress.value,
    transform: [{translateY: interpolate(ctaProgress.value, [0, 1], [18, 0])}],
  }));

  const authStatusContent = getAuthStatusContent(t, authFlowState);

  const features = {
    feature1: t('auth.loginFeature1'),
    feature2: t('auth.loginFeature2'),
    feature3: t('auth.loginFeature3'),
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#080D14" />

      <LoginBackground>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 32,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}>
          <View style={styles.content}>
            <LoginHero
              title={t('auth.loginTitle')}
              features={features}
            />

            <Animated.View style={[styles.ctaSection, ctaAnimatedStyle]}>
              <SteamLoginButton
                onPress={handleSteamLogin}
                loading={loading}
              />

              <View style={styles.securityNote}>
                <Ionicons
                  name="lock-closed"
                  size={12}
                  color={COLORS.STEAM_TEXT_GRAY}
                />
                <Animated.Text style={styles.securityText}>
                  {t('auth.loginSecurityNote')}
                </Animated.Text>
              </View>

              {authStatusContent ? (
                <View style={styles.statusSpacing}>
                  <LoginStatusCard
                    variant={authStatusContent.variant}
                    title={authStatusContent.title}
                    message={authStatusContent.message}
                  />
                </View>
              ) : null}
            </Animated.View>
          </View>
        </ScrollView>
      </LoginBackground>
    </View>
  );
};

export default LoginScreen;
