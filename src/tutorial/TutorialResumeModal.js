import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {COLORS} from '../constants';

const TutorialResumeModal = ({visible, onRestart, onResume, onSkip}) => {
  const {t} = useTranslation();

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{t('tutorial.resumeTitle')}</Text>
          <Text style={styles.message}>{t('tutorial.resumeMessage')}</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onSkip}>
              <Text style={styles.secondaryText}>{t('tutorial.skipButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={onRestart}>
              <Text style={styles.secondaryText}>{t('tutorial.restartButton')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onResume}>
              <Text style={styles.primaryText}>{t('tutorial.resumeButton')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  title: {
    fontSize: 20,
    color: COLORS.WHITE,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: COLORS.STEAM_TEXT_GRAY,
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.STEAM_BLUE,
  },
  primaryText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
  },
  secondaryText: {
    color: COLORS.WHITE,
    fontWeight: '500',
  },
});

export default TutorialResumeModal;
