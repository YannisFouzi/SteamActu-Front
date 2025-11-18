/**
 * Composant modal bloquant pour les mises à jour CodePush
 * Affiche un écran plein écran avec barre de progression
 * Impossible de fermer ou naviguer pendant la mise à jour
 */

import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS, TEXT_STYLES } from '../constants';

/**
 * @param {Object} props
 * @param {boolean} props.visible - Si true, le modal est visible
 * @param {number} props.progress - Progression du téléchargement (0-100)
 * @param {string} props.status - Statut actuel ('CHECKING', 'DOWNLOADING', 'INSTALLING')
 * @param {string|null|undefined} props.message - Message personnalisé (optionnel)
 */
const CodePushUpdateModal = ({
  visible = false,
  progress = 0,
  status = 'CHECKING',
  message = null,
}) => {
  if (!visible) {
    return null;
  }

  // Messages selon le statut
  const getStatusMessage = () => {
    if (message) {
      return message;
    }

    switch (status) {
      case 'CHECKING':
        return 'Vérification des mises à jour...';
      case 'DOWNLOADING':
        return `Téléchargement de la mise à jour... ${Math.round(progress)}%`;
      case 'INSTALLING':
        return 'Installation de la mise à jour...';
      case 'RESTARTING':
        return 'Redémarrage de l\'application...';
      default:
        return 'Mise à jour en cours...';
    }
  };

  // Afficher la barre de progression seulement si on télécharge
  const showProgress = status === 'DOWNLOADING' && progress > 0;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      hardwareAccelerated
      statusBarTranslucent
      onRequestClose={() => {
        // Désactiver le retour Android - modal bloquant
      }}>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Icône de chargement */}
          <ActivityIndicator
            size="large"
            color={COLORS.STEAM_BLUE}
            style={styles.spinner}
          />

          {/* Message principal */}
          <Text style={styles.title}>🎮 Mise à jour en cours</Text>
          <Text style={styles.message}>{getStatusMessage()}</Text>

          {/* Barre de progression (seulement si téléchargement) */}
          {showProgress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}%
              </Text>
            </View>
          )}

          {/* Message d'information */}
          <Text style={styles.infoText}>
            Veuillez patienter, l'application va redémarrer automatiquement.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.STEAM_DARK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 32,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    ...TEXT_STYLES.title,
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    ...TEXT_STYLES.subtitle,
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: COLORS.WHITE,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.STEAM_BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.STEAM_BLUE,
    borderRadius: 4,
  },
  progressText: {
    ...TEXT_STYLES.subtitle,
    fontSize: 14,
    textAlign: 'center',
    color: COLORS.STEAM_BLUE,
    fontWeight: '600',
  },
  infoText: {
    ...TEXT_STYLES.subtitle,
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.STEAM_TEXT_GRAY,
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default CodePushUpdateModal;

