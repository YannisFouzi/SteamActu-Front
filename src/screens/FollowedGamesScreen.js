import React from 'react';
import { View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { useWishlist } from '../hooks/useWishlist';
import FollowedGamesTab from './Home/components/FollowedGamesTab';
import styles from './Home/styles';

const FollowedGamesScreen = ({
  registerExternalUnfollowHandler,
  onToggleFollowState,
}) => {
  const {steamId} = useAppContext();
  const {updateWishlistFollowState} = useWishlist(steamId);

  return (
    <View style={styles.container}>
      <FollowedGamesTab
        styles={styles}
        onToggleFollowState={onToggleFollowState || updateWishlistFollowState}
        registerExternalUnfollowHandler={registerExternalUnfollowHandler}
      />
    </View>
  );
};

export default FollowedGamesScreen;
