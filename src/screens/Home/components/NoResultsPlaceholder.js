import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import {Text, View} from 'react-native';
import {COLORS} from '../../../constants/theme';

const NoResultsPlaceholder = ({styles}) => (
  <View style={styles.centerContainer}>
    <Icon
      name="sad-outline"
      size={64}
      color={COLORS.STEAM_TEXT_GRAY}
      style={styles.emptyIcon}
    />
    <Text style={styles.emptyTitle}>Aucun résultat</Text>
    <Text style={styles.emptyText}>Essayez avec d'autres mots-clés</Text>
  </View>
);

export default NoResultsPlaceholder;
