import React from 'react';
import {ActivityIndicator, Text, View} from 'react-native';
import styles from '../styles';

const LoadingIndicator = ({message}) => {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#66C0F4" />
      <Text style={styles.loadingText}>
        {message || 'Chargement en cours...'}
      </Text>
    </View>
  );
};

export default LoadingIndicator;
