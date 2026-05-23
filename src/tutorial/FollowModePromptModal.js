import React, {useMemo} from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import FollowModeSetting from '../components/FollowModeSetting';
import {COLORS} from '../constants';
import {useUserSettings} from '../hooks/useUserSettings';

// Affichée si l'utilisateur "passe" le tuto initial avant d'atteindre la zone
// des réglages : on force un choix éclairé sur les modes de suivi
// bibliothèque + wishlist pour qu'il ne reste pas avec les notifs
// silencieusement désactivées.
const FollowModePromptModal = ({visible, onConfirm}) => {
  const {t} = useTranslation();
  const {
    libraryFollowMode,
    wishlistFollowMode,
    saving,
    handleLibraryModeChange,
    handleWishlistModeChange,
  } = useUserSettings();

  const followOptions = useMemo(
    () => [
      {value: 'off', title: t('followModes.offTitle')},
      {value: 'auto', title: t('followModes.autoTitle')},
      {value: 'prompt', title: t('followModes.promptTitle')},
    ],
    [t],
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onConfirm}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>{t('common.autoFollow')}</Text>
            <Text style={styles.description}>
              {t('settings.autoFollowDescription')}
            </Text>

            <FollowModeSetting
              label={t('settings.libraryLabel')}
              value={libraryFollowMode}
              options={followOptions}
              onChange={handleLibraryModeChange}
              disabled={saving}
            />

            <FollowModeSetting
              label={t('settings.wishlistLabel')}
              value={wishlistFollowMode}
              options={followOptions}
              onChange={handleWishlistModeChange}
              disabled={saving}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
            onPress={onConfirm}
            disabled={saving}>
            <Text style={styles.confirmText}>{t('common.ok')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    overflow: 'hidden',
  },
  scroll: {
    padding: 22,
    paddingBottom: 8,
  },
  title: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  confirmButton: {
    margin: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.STEAM_BLUE,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default FollowModePromptModal;
