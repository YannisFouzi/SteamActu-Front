import React, {useCallback, useMemo} from 'react';
import {StyleSheet, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useAppContext} from '../context/AppContext';
import {debugLog} from '../hooks/hooksLogger';

/**
 * Bouton generique de suivi/desuivi d'un jeu.
 * Centralise l'appel a handleFollowGame avec les metadonnees necessaires.
 */
const FollowToggle = ({
  appId,
  name,
  imageUrl,
  isFollowed: isFollowedProp,
  size = 24,
  activeColor = '#4CAF50',
  inactiveColor = '#757575',
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

  const safeName = useMemo(() => name || 'Jeu inconnu', [name]);
  const safeImageUrl = useMemo(() => imageUrl || null, [imageUrl]);
  const followPending = useMemo(
    () => (appIdString ? isFollowPending?.(appIdString) : false),
    [appIdString, isFollowPending],
  );

  const handlePress = useCallback(async () => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignoree');
      return;
    }

    if (followPending) {
      return;
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
        nextIsFollowed: !derivedIsFollowed,
      });
    }
  }, [
    appIdString,
    derivedIsFollowed,
    followPending,
    handleFollowGame,
    onToggle,
    safeImageUrl,
    safeName,
  ]);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      accessibilityState={{disabled: followPending}}
      testID={testID}>
      <Icon
        name={derivedIsFollowed ? 'notifications' : 'notifications-outline'}
        size={size}
        color={derivedIsFollowed ? activeColor : inactiveColor}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
});

export default FollowToggle;
