import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppContext } from '../context/AppContext';
import { debugLog } from '../hooks/hooksLogger';

/**
 * Bouton générique de suivi/désuivi d'un jeu.
 * Centralise l'appel à handleFollowGame avec les métadonnées nécessaires.
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
  const {handleFollowGame, isGameFollowed} = useAppContext();

  const appIdString = useMemo(() => (appId ? appId.toString() : ''), [appId]);

  const derivedIsFollowed = useMemo(() => {
    if (!appIdString) {
      return false;
    }

    if (typeof isFollowedProp === 'boolean') {
      return isFollowedProp;
    }

    return isGameFollowed(appIdString);
  }, [appIdString, isFollowedProp, isGameFollowed]);

  const safeName = useMemo(() => name || 'Jeu inconnu', [name]);
  const safeImageUrl = useMemo(() => imageUrl || null, [imageUrl]);

  const handlePress = useCallback(async () => {
    if (!appIdString) {
      debugLog('FollowToggle: appId manquant, action ignorée');
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
    handleFollowGame,
    onToggle,
    safeImageUrl,
    safeName,
  ]);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
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
