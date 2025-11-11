import React, { useCallback } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../constants';

const CONTACT_LINKS = [
  {
    label: 'Email',
    value: 'contact@fouzi-dev.fr',
    url: 'mailto:contact@fouzi-dev.fr',
    icon: 'mail-unread-outline',
  },
  {
    label: 'GitHub',
    value: 'github.com/YannisFouzi',
    url: 'https://github.com/YannisFouzi',
    icon: 'logo-github',
  },
  {
    label: 'Site web',
    value: 'fouzi-dev.fr',
    url: 'https://fouzi-dev.fr/',
    icon: 'globe-outline',
  },
];

const ContactScreen = () => {
  const handleOpenLink = useCallback(async url => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      debugError("Erreur lors de l'ouverture du lien de contact:", error);
      Alert.alert(
        'Lien indisponible',
        "Impossible d'ouvrir ce lien pour le moment.",
      );
    }
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Contact direct</Text>
      </View>

      <View style={styles.list}>
        {CONTACT_LINKS.map((link, index) => (
          <TouchableOpacity
            key={link.label}
            style={[
              styles.listItem,
              index === CONTACT_LINKS.length - 1 && styles.listItemLast,
            ]}
            onPress={() => handleOpenLink(link.url)}>
            <View style={styles.itemIcon}>
              <Icon name={link.icon} size={20} color={COLORS.STEAM_BLUE} />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>{link.label}</Text>
              <Text style={styles.itemValue}>{link.value}</Text>
            </View>

            <Icon
              name="chevron-forward"
              size={18}
              color={COLORS.STEAM_TEXT_GRAY}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...CONTAINER_STYLES.screen,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  list: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 18,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.STEAM_BORDER,
  },
  listItemLast: {
    borderBottomWidth: 0,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.STEAM_BLUE_TRANSPARENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 12,
    color: COLORS.STEAM_TEXT_GRAY,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemValue: {
    fontSize: 17,
    color: COLORS.WHITE,
    fontWeight: '600',
    marginTop: 6,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.STEAM_TEXT_GRAY,
    lineHeight: 20,
    marginTop: 24,
  },
});

export default ContactScreen;

