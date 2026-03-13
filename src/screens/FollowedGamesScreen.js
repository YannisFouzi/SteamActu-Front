import React from 'react';
import {View} from 'react-native';
import FollowedGamesTab from './Home/components/FollowedGamesTab';
import styles from './Home/styles';

const FollowedGamesScreen = () => {
  return (
    <View style={styles.container}>
      <FollowedGamesTab styles={styles} />
    </View>
  );
};

export default FollowedGamesScreen;
