import React from 'react';
import {StyleSheet, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const GRADIENT_COLORS = ['#080D14', '#0E1A2A', '#162234'];
const GRADIENT_LOCATIONS = [0, 0.5, 1];

const LoginBackground = ({children}) => (
  <View style={styles.container}>
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={GRADIENT_LOCATIONS}
      style={styles.gradient}>
      {children}
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
});

export default LoginBackground;
