import React from 'react';
import { View } from 'react-native';
import NewsTab from './Home/components/NewsTab';
import styles from './Home/styles';

const NewsFeedScreen = ({steamId, newsState, fetchNews}) => {
  return (
    <View style={styles.container}>
      <NewsTab steamId={steamId} newsState={newsState} fetchNews={fetchNews} />
    </View>
  );
};

export default NewsFeedScreen;
