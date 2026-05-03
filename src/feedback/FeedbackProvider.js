import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {
  Button,
  Checkbox,
  Dialog,
  Portal,
  Snackbar,
  Text,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/Ionicons';
import {COLORS, PAPER_THEME, RADIUS, SPACING} from '../constants';
import {translate} from '../i18n';
import {
  registerFeedbackController,
  unregisterFeedbackController,
} from './feedbackService';

const DEFAULT_SNACKBAR_DURATION = 4200;

const DIALOG_ICON_BY_TONE = {
  info: 'information-outline',
  success: 'check-circle-outline',
  error: 'alert-circle-outline',
  warning: 'alert-outline',
  destructive: 'trash-can-outline',
};

const SNACKBAR_VARIANT_STYLES = {
  info: {
    backgroundColor: COLORS.STEAM_NAVY,
    accentColor: COLORS.STEAM_BLUE,
    iconName: 'information-circle-outline',
    iconBubbleBg: 'rgba(102, 192, 244, 0.15)',
  },
  success: {
    backgroundColor: COLORS.STEAM_NAVY,
    accentColor: '#7BE495',
    iconName: 'checkmark-circle-outline',
    iconBubbleBg: 'rgba(123, 228, 149, 0.15)',
  },
  error: {
    backgroundColor: COLORS.STEAM_NAVY,
    accentColor: '#FF9F9F',
    iconName: 'alert-circle-outline',
    iconBubbleBg: 'rgba(255, 159, 159, 0.15)',
  },
};

const nextId = prefix =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeDialogButtons = buttons => {
  if (Array.isArray(buttons) && buttons.length > 0) {
    return buttons;
  }

  return [{text: translate('common.ok')}];
};

const normalizeDialogEntry = config => {
  const buttons = normalizeDialogButtons(config?.buttons);
  const tone =
    config?.tone ||
    (buttons.some(button => button?.style === 'destructive')
      ? 'destructive'
      : 'info');

  return {
    id: nextId('dialog'),
    title: config?.title || '',
    message: config?.message || '',
    buttons,
    dismissible: Boolean(config?.options?.cancelable),
    tone,
    icon:
      config?.icon === false
        ? null
        : config?.icon || DIALOG_ICON_BY_TONE[tone] || null,
    confirmCheckboxLabel: config?.confirmCheckboxLabel || null,
  };
};

const normalizeSnackbarEntry = config => ({
  id: nextId('snackbar'),
  title: config?.title || '',
  message: config?.message || '',
  variant: config?.variant || 'info',
  duration:
    typeof config?.duration === 'number'
      ? config.duration
      : DEFAULT_SNACKBAR_DURATION,
  actionLabel: config?.action?.label || config?.actionLabel || null,
  onActionPress: config?.action?.onPress || config?.onActionPress || null,
});

const getDialogAccentColor = tone => {
  switch (tone) {
    case 'success':
      return COLORS.SUCCESS;
    case 'error':
    case 'destructive':
      return COLORS.DANGER;
    case 'warning':
      return COLORS.WARNING;
    default:
      return COLORS.STEAM_BLUE;
  }
};

const resolveDialogButtonProps = (button, index, buttonsLength) => {
  if (button?.style === 'destructive') {
    return {
      mode: 'contained',
      buttonColor: COLORS.DANGER,
      textColor: COLORS.WHITE,
      compact: false,
    };
  }

  if (button?.style === 'cancel') {
    return {
      mode: 'contained-tonal',
      buttonColor: COLORS.STEAM_BORDER,
      textColor: COLORS.STEAM_TEXT_GRAY,
      compact: false,
    };
  }

  if (buttonsLength === 1 || index === buttonsLength - 1) {
    return {
      mode: 'contained-tonal',
      buttonColor: COLORS.STEAM_BLUE_TRANSPARENT,
      textColor: COLORS.STEAM_BLUE,
      compact: false,
    };
  }

  return {
    mode: 'text',
    textColor: COLORS.WHITE,
    compact: true,
  };
};

const FeedbackProvider = ({children}) => {
  const dialogQueueRef = useRef([]);
  const snackbarQueueRef = useRef([]);
  const [activeDialog, setActiveDialog] = useState(null);
  const [activeSnackbar, setActiveSnackbar] = useState(null);
  const [dialogCheckboxChecked, setDialogCheckboxChecked] = useState(false);

  const showDialog = useCallback(config => {
    const entry = normalizeDialogEntry(config);

    if (!entry.title && !entry.message) {
      return;
    }

    setActiveDialog(current => {
      if (current) {
        dialogQueueRef.current.push(entry);
        return current;
      }

      return entry;
    });
  }, []);

  const showSnackbar = useCallback(config => {
    const entry = normalizeSnackbarEntry(config);

    if (!entry.title && !entry.message) {
      return;
    }

    setActiveSnackbar(current => {
      if (current) {
        snackbarQueueRef.current.push(entry);
        return current;
      }

      return entry;
    });
  }, []);

  const dismissDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);

  const dismissSnackbar = useCallback(() => {
    setActiveSnackbar(null);
  }, []);

  useEffect(() => {
    const controller = {
      showDialog,
      showSnackbar,
      dismissDialog,
      dismissSnackbar,
    };

    registerFeedbackController(controller);

    return () => {
      unregisterFeedbackController(controller);
    };
  }, [dismissDialog, dismissSnackbar, showDialog, showSnackbar]);

  useEffect(() => {
    if (!activeDialog && dialogQueueRef.current.length > 0) {
      setActiveDialog(dialogQueueRef.current.shift());
    }
  }, [activeDialog]);

  useEffect(() => {
    if (!activeSnackbar && snackbarQueueRef.current.length > 0) {
      setActiveSnackbar(snackbarQueueRef.current.shift());
    }
  }, [activeSnackbar]);

  useEffect(() => {
    setDialogCheckboxChecked(false);
  }, [activeDialog?.id]);

  const handleDialogDismiss = useCallback(() => {
    setActiveDialog(current => {
      if (!current?.dismissible) {
        return current;
      }

      return null;
    });
  }, []);

  const handleDialogActionPress = useCallback(
    button => {
      const dialogSnapshot = activeDialog;
      const checkboxPayload =
        dialogSnapshot?.confirmCheckboxLabel && dialogCheckboxChecked
          ? {dontShowAgain: true}
          : {dontShowAgain: false};

      setActiveDialog(null);

      if (typeof button?.onPress === 'function') {
        requestAnimationFrame(() => {
          button.onPress(checkboxPayload);
        });
      }
    },
    [activeDialog, dialogCheckboxChecked],
  );

  const handleSnackbarActionPress = useCallback(() => {
    const callback = activeSnackbar?.onActionPress;
    setActiveSnackbar(null);

    if (typeof callback === 'function') {
      requestAnimationFrame(() => {
        callback();
      });
    }
  }, [activeSnackbar]);

  const snackbarVariantStyle = useMemo(
    () =>
      SNACKBAR_VARIANT_STYLES[activeSnackbar?.variant] ||
      SNACKBAR_VARIANT_STYLES.info,
    [activeSnackbar?.variant],
  );

  return (
    <>
      {children}

      <Portal>
        <Dialog
          visible={Boolean(activeDialog)}
          dismissable={Boolean(activeDialog?.dismissible)}
          onDismiss={handleDialogDismiss}
          style={styles.dialog}>
          {activeDialog?.icon ? (
            <Dialog.Icon
              icon={activeDialog.icon}
              color={getDialogAccentColor(activeDialog.tone)}
            />
          ) : null}

          {activeDialog?.title ? (
            <Dialog.Title style={styles.dialogTitle}>
              {activeDialog.title}
            </Dialog.Title>
          ) : null}

          {activeDialog?.message || activeDialog?.confirmCheckboxLabel ? (
            <Dialog.Content>
              {activeDialog?.message ? (
                <Text style={styles.dialogMessage}>{activeDialog.message}</Text>
              ) : null}
              {activeDialog?.confirmCheckboxLabel ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: dialogCheckboxChecked}}
                  onPress={() =>
                    setDialogCheckboxChecked(current => !current)
                  }
                  style={styles.dialogCheckboxRow}>
                  <Checkbox.Android
                    status={
                      dialogCheckboxChecked ? 'checked' : 'unchecked'
                    }
                    pointerEvents="none"
                    color={getDialogAccentColor(activeDialog.tone)}
                  />
                  <Text style={styles.dialogCheckboxLabel}>
                    {activeDialog.confirmCheckboxLabel}
                  </Text>
                </Pressable>
              ) : null}
            </Dialog.Content>
          ) : null}

          <Dialog.Actions style={styles.dialogActions}>
            {(activeDialog?.buttons || []).map((button, index, buttons) => {
              const buttonProps = resolveDialogButtonProps(
                button,
                index,
                buttons.length,
              );

              return (
                <Button
                  key={`${activeDialog?.id || 'dialog'}-${index}`}
                  mode={buttonProps.mode}
                  compact={buttonProps.compact}
                  buttonColor={buttonProps.buttonColor}
                  textColor={buttonProps.textColor}
                  style={styles.dialogButton}
                  labelStyle={styles.dialogButtonLabel}
                  onPress={() => handleDialogActionPress(button)}>
                  {button?.text || translate('common.ok')}
                </Button>
              );
            })}
          </Dialog.Actions>
        </Dialog>

        <Snackbar
          visible={Boolean(activeSnackbar)}
          onDismiss={dismissSnackbar}
          duration={activeSnackbar?.duration || DEFAULT_SNACKBAR_DURATION}
          style={[
            styles.snackbar,
            {
              backgroundColor: snackbarVariantStyle.backgroundColor,
              borderColor: snackbarVariantStyle.accentColor,
            },
          ]}
          wrapperStyle={styles.snackbarWrapper}
          contentStyle={styles.snackbarContent}
          theme={{
            ...PAPER_THEME,
            colors: {
              ...PAPER_THEME.colors,
              inverseSurface: snackbarVariantStyle.backgroundColor,
              inverseOnSurface: COLORS.WHITE,
              inversePrimary: snackbarVariantStyle.accentColor,
            },
          }}
          action={
            activeSnackbar?.actionLabel
              ? {
                  label: activeSnackbar.actionLabel,
                  onPress: handleSnackbarActionPress,
                  textColor: snackbarVariantStyle.accentColor,
                }
              : undefined
          }>
          <Pressable
            onPress={dismissSnackbar}
            style={styles.snackbarRow}
            android_ripple={{color: 'rgba(255,255,255,0.06)', borderless: false}}>
            <View
              style={[
                styles.snackbarIconBubble,
                {backgroundColor: snackbarVariantStyle.iconBubbleBg},
              ]}>
              <Icon
                name={snackbarVariantStyle.iconName}
                size={24}
                color={snackbarVariantStyle.accentColor}
              />
            </View>
            <View style={styles.snackbarTextColumn}>
              {activeSnackbar?.title ? (
                <Text style={styles.snackbarTitle} numberOfLines={2}>
                  {activeSnackbar.title}
                </Text>
              ) : null}
              {activeSnackbar?.message ? (
                <Text style={styles.snackbarMessage} numberOfLines={4}>
                  {activeSnackbar.message}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Snackbar>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: COLORS.STEAM_NAVY,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    overflow: 'hidden',
  },
  dialogTitle: {
    color: COLORS.WHITE,
  },
  dialogMessage: {
    color: COLORS.STEAM_TEXT_GRAY,
    lineHeight: 22,
  },
  dialogCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  dialogCheckboxLabel: {
    flex: 1,
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 15,
    lineHeight: 22,
    marginLeft: SPACING.sm,
  },
  dialogActions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dialogButton: {
    borderRadius: RADIUS.md,
    flex: 1,
  },
  dialogButtonLabel: {
    letterSpacing: 0.2,
  },
  snackbar: {
    margin: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    width: '90%',
    maxWidth: 460,
    alignSelf: 'center',
    elevation: 12,
    shadowColor: COLORS.BLACK,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  snackbarWrapper: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  snackbarContent: {
    marginHorizontal: 0,
    marginVertical: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    flex: 1,
  },
  snackbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  snackbarIconBubble: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snackbarTextColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  snackbarTitle: {
    color: COLORS.WHITE,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  snackbarMessage: {
    color: COLORS.STEAM_TEXT_GRAY,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default FeedbackProvider;
