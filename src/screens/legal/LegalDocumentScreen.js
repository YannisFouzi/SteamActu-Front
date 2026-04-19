import React, {useMemo} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS, CONTAINER_STYLES, TEXT_STYLES} from '../../constants';
import {normalizeLanguage} from '../../i18n';
import {formatAbsoluteDate} from '../../utils';

const FALLBACK_LANGUAGES = ['en', 'fr'];

const resolveLegalDocument = (i18n, documentKey) => {
  const activeLanguage = normalizeLanguage(
    i18n.resolvedLanguage || i18n.language || 'en',
  );
  const resourcePath = `legal.documents.${documentKey}`;
  const activeDocument = i18n.getResource(
    activeLanguage,
    'translation',
    resourcePath,
  );

  if (activeDocument && Array.isArray(activeDocument.sections)) {
    return {
      document: activeDocument,
      usesDocumentFallback: false,
      documentLocale: activeLanguage,
    };
  }

  for (const fallbackLng of FALLBACK_LANGUAGES) {
    const fallbackDocument = i18n.getResource(
      fallbackLng,
      'translation',
      resourcePath,
    );
    if (fallbackDocument && Array.isArray(fallbackDocument.sections)) {
      return {
        document: fallbackDocument,
        usesDocumentFallback: activeLanguage !== fallbackLng,
        documentLocale: fallbackLng,
      };
    }
  }

  return {
    document: {updatedAt: null, sections: []},
    usesDocumentFallback: false,
    documentLocale: activeLanguage,
  };
};

const LegalDocumentScreen = ({documentKey, titleKey}) => {
  const {t, i18n} = useTranslation();

  const {document, usesDocumentFallback, documentLocale} = useMemo(
    () => resolveLegalDocument(i18n, documentKey),
    [documentKey, i18n],
  );

  const updatedAtTimestamp = document?.updatedAt
    ? new Date(document.updatedAt).getTime()
    : null;

  const updatedAtLabel =
    typeof updatedAtTimestamp === 'number' && !Number.isNaN(updatedAtTimestamp)
      ? formatAbsoluteDate(updatedAtTimestamp, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          language: documentLocale,
        })
      : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{t(titleKey)}</Text>

      {updatedAtLabel ? (
        <Text style={styles.updatedAt}>
          {t('legal.lastUpdated', {date: updatedAtLabel})}
        </Text>
      ) : null}

      {usesDocumentFallback ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('legal.documentFallbackNotice')}</Text>
        </View>
      ) : null}

      {document.sections.map(section => (
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

export default LegalDocumentScreen;
