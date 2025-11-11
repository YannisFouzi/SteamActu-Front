import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../constants';

const sections = [
  {
    title: '1. Acceptation des conditions',
    content:
      "En accédant à l'application Steam Notifications, vous acceptez l'intégralité des présentes Conditions d'utilisation. Si vous refusez une quelconque disposition, veuillez cesser d'utiliser l'application et supprimer votre compte depuis l'écran Paramètres.",
  },
  {
    title: '2. Description du service',
    content:
      "Steam Notifications agrège et vous diffuse des actualités provenant de l'écosystème Steam pour les jeux que vous suivez. Le service est proposé à titre informatif et peut évoluer ou être interrompu à tout moment.",
  },
  {
    title: '3. Utilisation de l’application',
    content:
      "Vous vous engagez à ne pas détourner l'application de sa finalité, à ne pas tenter d'en compromettre la sécurité et à ne pas collecter ou exploiter les données d'autres utilisateurs. Toute utilisation abusive pourra conduire à une suspension ou une suppression d'accès.",
  },
  {
    title: '4. Comptes et authentification Steam',
    content:
      "La connexion repose sur votre compte Steam. Vous êtes responsable de la confidentialité de vos identifiants Steam et des actions effectuées via votre compte au sein de l'application.",
  },
  {
    title: '5. Notifications et contenu',
    content:
      "Les notifications sont générées à partir de sources publiques ou de flux officiels liés à Steam. Leur exactitude ou disponibilité n'est pas garantie. Steam Notifications ne saurait être tenue responsable des contenus publiés par des tiers.",
  },
  {
    title: '6. Disponibilité du service',
    content:
      "Nous nous efforçons d'assurer une disponibilité continue de l'application, sans garantie. Des interruptions temporaires peuvent survenir pour maintenance, mise à jour ou cas de force majeure.",
  },
  {
    title: '7. Propriété intellectuelle',
    content:
      "L'ensemble des éléments graphiques, textes, logos et fonctionnalités propres à Steam Notifications demeurent la propriété de leur auteur. Steam et les éléments associés sont la propriété de Valve Corporation.",
  },
  {
    title: '8. Limitation de responsabilité',
    content:
      "Steam Notifications est fournie « telle quelle ». Nous ne saurions être tenus responsables des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser l'application.",
  },
  {
    title: '9. Modifications des conditions',
    content:
      "Les présentes Conditions d'utilisation peuvent être modifiées à tout moment. La version la plus récente est toujours disponible dans l'application. L'utilisation continue de l'application vaut acceptation des nouvelles conditions.",
  },
  {
    title: '10. Contact',
    content:
      "Pour toute question relative à ces Conditions d'utilisation, vous pouvez écrire à l'adresse suivante : contact@fouzi-dev.fr.",
  },
];

const TermsOfServiceScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Conditions d'utilisation</Text>
      <Text style={styles.updatedAt}>Dernière mise à jour : 11 novembre 2025</Text>

      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}

      <Text style={styles.footer}>
        Merci d'utiliser Steam Notifications. Votre confiance est essentielle et nous nous engageons à respecter ces principes pour garantir une expérience claire et transparente.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...CONTAINER_STYLES.screen,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 26,
    marginBottom: 8,
  },
  updatedAt: {
    fontSize: 13,
    color: COLORS.STEAM_TEXT_GRAY,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.WHITE,
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.STEAM_TEXT_GRAY,
  },
  footer: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 24,
  },
});

export default TermsOfServiceScreen;

