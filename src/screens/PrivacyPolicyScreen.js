import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../constants';
import {formatAbsoluteDate} from '../utils';

const LEGAL_LAST_UPDATED_AT = new Date(2025, 10, 11, 12).getTime();

const sections = [
  {
    title: '1. Donnees collectees',
    content:
      "Nous stockons uniquement les informations necessaires au fonctionnement de Steam Notifications : votre identifiant Steam, votre bibliotheque synchronisee (liste des jeux avec leurs temps de jeu), l'historique des jeux recemment actifs, votre wishlist, les parametres de notification que vous definissez dans l'application (activation, auto-follow, token de notification pour l'envoi push) ainsi que des journaux techniques indispensables a la stabilite du service.",
  },
  {
    title: '2. Utilisation des donnees',
    content:
      "Ces donnees servent a synchroniser vos jeux, gerer vos suivis, envoyer des notifications pertinentes et ameliorer les performances de l'application. Elles ne sont jamais vendues ni utilisees a des fins publicitaires.",
  },
  {
    title: '3. Stockage et conservation',
    content:
      "Les informations sont stockees de maniere securisee sur nos serveurs. Elles sont conservees tant que votre compte reste actif. Vous pouvez supprimer votre compte directement depuis l'application pour effacer vos donnees.",
  },
  {
    title: '4. Partage avec des tiers',
    content:
      "Aucun partage commercial n'est effectue. Nous pouvons faire transiter certaines donnees via les APIs officielles de Steam pour assurer le service. Ces echanges respectent les politiques de Valve Corporation.",
  },
  {
    title: '5. Vos droits',
    content:
      "Conformement a la reglementation en vigueur, vous disposez d'un droit d'acces, de rectification, d'opposition et de suppression de vos donnees personnelles. Contactez contact@fouzi-dev.fr pour exercer ces droits.",
  },
  {
    title: '6. Securite',
    content:
      "Des mesures techniques et organisationnelles sont mises en place pour proteger vos donnees contre tout acces non autorise, perte ou divulgation. Malgre nos efforts, aucun systeme n'est totalement invulnerable.",
  },
  {
    title: '7. Cookies et technologies similaires',
    content:
      "Steam Notifications n'utilise ni cookies, ni outils de suivi publicitaires. L'application conserve uniquement un cache technique local (sur votre appareil) pour accelerer l'affichage de vos donnees.",
  },
  {
    title: '8. Modifications de la politique',
    content:
      'La presente Politique de confidentialite peut evoluer. Toute mise a jour sera publiee dans cette section de l\'application. En continuant d\'utiliser le service, vous acceptez ces modifications.',
  },
  {
    title: '9. Contact',
    content:
      'Pour toute question relative a la protection de vos donnees, ecrivez a contact@fouzi-dev.fr. Nous faisons de notre mieux pour vous repondre rapidement.',
  },
];

const PrivacyPolicyScreen = () => {
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
      <Text style={styles.title}>{t('legal.privacyTitle')}</Text>
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

export default PrivacyPolicyScreen;
