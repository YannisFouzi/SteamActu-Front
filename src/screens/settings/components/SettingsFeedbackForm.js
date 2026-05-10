import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {supportFeedbackService} from '../../../services/api';
import {COLORS, RADIUS, SPACING} from '../../../constants';

const FEEDBACK_TYPES = ['bug', 'feature'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_MESSAGE_LENGTH = 5;

const SettingsFeedbackForm = ({steamId}) => {
  const {t} = useTranslation();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  const trimmedMessage = message.trim();
  const trimmedEmail = email.trim();
  const canSubmit = useMemo(
    () =>
      trimmedMessage.length >= MIN_MESSAGE_LENGTH &&
      EMAIL_REGEX.test(trimmedEmail) &&
      !sending,
    [sending, trimmedEmail, trimmedMessage.length],
  );

  const handleSubmit = useCallback(async () => {
    if (sending) {
      return;
    }

    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setStatus({type: 'error', text: t('feedback.messageTooShort')});
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setStatus({type: 'error', text: t('feedback.emailInvalid')});
      return;
    }

    try {
      setSending(true);
      setStatus(null);
      await supportFeedbackService.submit({
        type,
        message: trimmedMessage,
        email: trimmedEmail,
        steamId,
      });
      setMessage('');
      setStatus({type: 'success', text: t('feedback.sentMessage')});
    } catch (error) {
      setStatus({
        type: 'error',
        text: error?.message || t('feedback.sendErrorMessage'),
      });
    } finally {
      setSending(false);
    }
  }, [sending, steamId, t, trimmedEmail, trimmedMessage, type]);

  return (
    <View style={styles.container}>
      <View style={styles.segmentedControl}>
        {FEEDBACK_TYPES.map(item => {
          const selected = item === type;

          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{selected}}
              hitSlop={6}
              style={[styles.segment, selected ? styles.segmentSelected : null]}
              onPress={() => setType(item)}>
              <Text
                style={[
                  styles.segmentText,
                  selected ? styles.segmentTextSelected : null,
                ]}>
                {t(`feedback.types.${item}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={message}
        onChangeText={value => {
          setMessage(value);
          setStatus(null);
        }}
        placeholder={t('feedback.messagePlaceholder')}
        placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
        style={styles.messageInput}
        multiline
        maxLength={5000}
        textAlignVertical="top"
        returnKeyType="default"
      />

      <View style={styles.footerRow}>
        <TextInput
          value={email}
          onChangeText={value => {
            setEmail(value);
            setStatus(null);
          }}
          placeholder={t('feedback.emailPlaceholder')}
          placeholderTextColor={COLORS.STEAM_TEXT_GRAY}
          style={styles.emailInput}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{disabled: !canSubmit}}
          hitSlop={6}
          disabled={!canSubmit}
          style={[styles.sendButton, !canSubmit ? styles.sendButtonDisabled : null]}
          onPress={handleSubmit}>
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Ionicons name="send-outline" size={16} color={COLORS.WHITE} />
          )}
          <Text style={styles.sendButtonText}>
            {sending ? t('feedback.sending') : t('feedback.send')}
          </Text>
        </Pressable>
      </View>

      {status ? (
        <Text
          style={[
            styles.statusText,
            status.type === 'success'
              ? styles.statusSuccess
              : styles.statusError,
          ]}>
          {status.text}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  segment: {
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderRadius: 8,
    backgroundColor: '#20242C',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentSelected: {
    backgroundColor: COLORS.WHITE,
    borderColor: COLORS.WHITE,
  },
  segmentText: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: COLORS.STEAM_DARK,
  },
  messageInput: {
    minHeight: 110,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    color: COLORS.WHITE,
    backgroundColor: '#1F232B',
    fontSize: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  emailInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    color: COLORS.WHITE,
    backgroundColor: '#1F232B',
    fontSize: 14,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 106,
    paddingHorizontal: SPACING.md,
    marginLeft: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    backgroundColor: '#20242C',
  },
  sendButtonDisabled: {
    opacity: 0.48,
  },
  sendButtonText: {
    color: COLORS.WHITE,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: SPACING.xs,
  },
  statusText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 18,
  },
  statusSuccess: {
    color: COLORS.SUCCESS,
  },
  statusError: {
    color: COLORS.WARNING,
  },
});

export default SettingsFeedbackForm;
