import React from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const NewsDetailScreen = ({route}) => {
  const {title, content, url, date} = route.params;

  // Fonction pour formater la date
  const formatDate = timestamp => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Fonction pour ouvrir le lien d'une actualité
  const openNewsLink = () => {
    Linking.openURL(url).catch(err => {
      console.error("Erreur lors de l'ouverture du lien:", err);
      Alert.alert('Erreur', "Impossible d'ouvrir ce lien");
    });
  };

  // Fonction pour nettoyer le contenu HTML
  const cleanHtml = html => {
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.date}>{formatDate(date)}</Text>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.separator} />

        <Text style={styles.content}>{cleanHtml(content)}</Text>

        <TouchableOpacity style={styles.steamButton} onPress={openNewsLink}>
          <Text style={styles.steamButtonText}>Voir sur Steam</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171A21',
  },
  contentContainer: {
    padding: 16,
  },
  date: {
    fontSize: 14,
    color: '#66C0F4',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#2A3F5A',
    marginVertical: 16,
  },
  content: {
    fontSize: 16,
    color: '#CCCCCC',
    lineHeight: 24,
    marginBottom: 24,
  },
  steamButton: {
    backgroundColor: '#66C0F4',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  steamButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NewsDetailScreen;
