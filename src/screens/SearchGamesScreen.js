import React from 'react';
import { View } from 'react-native';
import SearchGameTab from './Home/components/SearchGameTab';
import styles from './Home/styles';

const SearchGamesScreen = () => {
  return (
    <View style={styles.container}>
      <SearchGameTab styles={styles} />
    </View>
  );
};

export default SearchGamesScreen;
