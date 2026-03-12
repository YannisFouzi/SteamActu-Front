import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants';
import {formatAbsoluteDate} from '../utils';

const LEGAL_LAST_UPDATED_AT = new Date(2025, 10, 11, 12).getTime();

const sections = [
  {
    title: '1. Acceptation des conditions',
    content:
      "En accedant a l'application Steam Notifications, vous acceptez l'integralite des presentes Conditions d'utilisation. Si vous refusez une quelconque disposition, veuillez cesser d'utiliser l'application et supprimer votre compte depuis l'ecran Parametres.",
  },
  {
    title: '2. Description du service',
    content:
      "Steam Notifications agrege et vous diffuse des actualites provenant de l'ecosysteme Steam pour les jeux que vous suivez. Le service est propose a titre informatif et peut evoluer ou etre interrompu a tout moment.",
  },
  {
    title: "3. Utilisation de l'application",
    content:
      "Vous vous engagez a ne pas detourner l'application de sa finalite, a ne pas tenter d'en compromettre la securite et a ne pas collecter ou exploiter les donnees d'autres utilisateurs. Toute utilisation abusive pourra conduire a une suspension ou une suppression d'acces.",
  },
  {
    title: '4. Comptes et authentification Steam',
    content:
      "La connexion repose sur votre compte Steam. Vous etes responsable de la confidentialite de vos identifiants Steam et des actions effectuees via votre compte au sein de l'application.",
  },
  {
    title: '5. Notifications et contenu',
    content:
      "Les notifications sont generees a partir de sources publiques ou de flux officiels lies a Steam. Leur exactitude ou disponibilite n'est pas garantie. Steam Notifications ne saurait etre tenue responsable des contenus publies par des tiers.",
  },
  {
    title: '6. Disponibilite du service',
    content:
      "Nous nous efforcons d'assurer une disponibilite continue de l'application, sans garantie. Des interruptions temporaires peuvent survenir pour maintenance, mise a jour ou cas de force majeure.",
  },
  {
    title: '7. Propriete intellectuelle',
    content:
      "L'ensemble des elements graphiques, textes, logos et fonctionnalites propres a Steam Notifications demeurent la propriete de leur auteur. Steam et les elements associes sont la propriete de Valve Corporation.",
  },
  {
    title: '8. Limitation de responsabilite',
    content:
      'Steam Notifications est fournie "telle quelle". Nous ne saurions etre tenus responsables des dommages directs ou indirects resultant de l\'utilisation ou de l\'impossibilite d\'utiliser l\'application.',
  },
  {
    title: '9. Modifications des conditions',
    content:
      "Les presentes Conditions d'utilisation peuvent etre modifiees a tout moment. La version la plus recente est toujours disponible dans l'application. L'utilisation continue de l'application vaut acceptation des nouvelles conditions.",
  },
  {
    title: '10. Contact',
    content:
      "Pour toute question relative a ces Conditions d'utilisation, vous pouvez ecrire a l'adresse suivante : contact@fouzi-dev.fr.",
  },
];

const TermsOfServiceScreen = () => {
  const {t, i18n} = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language || 'fr';
  const isFrench = language.startsWith('fr');
  const lastUpdatedDate = formatAbsoluteDate(LEGAL_LAST_UPDATED_AT, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    language,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t('legal.termsTitle')}</Text>
      <Text style={styles.updatedAt}>{t('legal.lastUpdated', {date: lastUpdatedDate})}</Text>

      {!isFrench ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('legal.frenchOnlyNotice')}</Text>
        </View>
      ) : null}

      {sections.map(section => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}
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
  notice: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    marginBottom: 24,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.STEAM_TEXT_GRAY,
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
});

export default TermsOfServiceScreen;
