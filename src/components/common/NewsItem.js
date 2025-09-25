import React from 'react';
import {StyleSheet, Text, TouchableOpacity} from 'react-native';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../../constants/theme';
import {formatAbsoluteDate} from '../../utils/gameHelpers';

/**
 * Composant réutilisable pour afficher un élément d'actualité
 * Utilisé dans GameDetailsScreen et potentiellement ailleurs
 */
const NewsItem = ({item, onPress}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.date}>{formatAbsoluteDate(item.date * 1000)}</Text>
      <Text style={styles.content}>{item.contents}</Text>
      <Text style={styles.link}>Lire la suite</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    ...CONTAINER_STYLES.card,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.NEWS_TEXT_PRIMARY,
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    marginBottom: 8,
  },
  content: {
    fontSize: 16,
    color: COLORS.NEWS_TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 12,
  },
  link: {
    ...TEXT_STYLES.accent,
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-end',
  },
});

export default NewsItem;
