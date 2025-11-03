import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {COLORS} from '../../constants/theme';

/**
 * Badge "Nouveau" pour les jeux récemment ajoutés
 * Affiche un badge si le jeu a été ajouté il y a moins de 7 jours
 */
const NewGameBadge = ({firstSeenDate, daysThreshold = 7}) => {
  if (!firstSeenDate) {
    return null;
  }

  // Calculer le nombre de jours depuis l'ajout
  const daysSinceAdded = Math.floor(
    (Date.now() - new Date(firstSeenDate).getTime()) / (1000 * 60 * 60 * 24),
  );

  // N'afficher le badge que si le jeu a été ajouté récemment
  if (daysSinceAdded > daysThreshold) {
    return null;
  }

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>NOUVEAU</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.STEAM_BLUE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: COLORS.STEAM_WHITE,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

export default NewGameBadge;




