import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, CONTAINER_STYLES, TEXT_STYLES } from '../constants';

const sections = [
  {
    title: '1. Données collectées',
    content:
      "Nous stockons uniquement les informations nécessaires au fonctionnement de Steam Notifications : votre identifiant Steam, votre bibliothèque synchronisée (liste des jeux avec leurs temps de jeu), l’historique des jeux récemment actifs, votre wishlist, les paramètres de notification que vous définissez dans l’application (activation, auto-follow, token de notification pour l’envoi push) ainsi que des journaux techniques indispensables à la stabilité du service.",
  },
  {
    title: '2. Utilisation des données',
    content:
      "Ces données servent à synchroniser vos jeux, gérer vos suivis, envoyer des notifications pertinentes et améliorer les performances de l’application. Elles ne sont jamais vendues ni utilisées à des fins publicitaires.",
  },
  {
    title: '3. Stockage et conservation',
    content:
      "Les informations sont stockées de manière sécurisée sur nos serveurs. Elles sont conservées tant que votre compte reste actif. Vous pouvez supprimer votre compte directement depuis l'application pour effacer vos données.",
  },
  {
    title: '4. Partage avec des tiers',
    content:
      "Aucun partage commercial n'est effectué. Nous pouvons faire transiter certaines données via les APIs officielles de Steam pour assurer le service. Ces échanges respectent les politiques de Valve Corporation.",
  },
  {
    title: '5. Vos droits',
    content:
      "Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données personnelles. Contactez contact@fouzi-dev.fr pour exercer ces droits.",
  },
  {
    title: '6. Sécurité',
    content:
      "Des mesures techniques et organisationnelles sont mises en place pour protéger vos données contre tout accès non autorisé, perte ou divulgation. Malgré nos efforts, aucun système n'est totalement invulnérable.",
  },
  {
    title: '7. Cookies et technologies similaires',
    content:
      "Steam Notifications n'utilise ni cookies, ni outils de suivi publicitaires. L'application conserve uniquement un cache technique local (sur votre appareil) pour accélérer l'affichage de vos données.",
  },
  {
    title: '8. Modifications de la politique',
    content:
      "La présente Politique de confidentialité peut évoluer. Toute mise à jour sera publiée dans cette section de l'application. En continuant d'utiliser le service, vous acceptez ces modifications.",
  },
  {
    title: '9. Contact',
    content:
      "Pour toute question relative à la protection de vos données, écrivez à contact@fouzi-dev.fr. Nous faisons de notre mieux pour vous répondre rapidement.",
  },
];

const PrivacyPolicyScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Politique de confidentialité</Text>
      <Text style={styles.updatedAt}>
        Dernière mise à jour : 11 novembre 2025
      </Text>

      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}

      <Text style={styles.footer}>
        Nous respectons votre vie privée et limitons la collecte de données au strict nécessaire pour fournir une expérience fiable et personnalisée.
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

export default PrivacyPolicyScreen;

