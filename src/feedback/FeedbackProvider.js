import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet} from 'react-native';
import {Button, Dialog, Portal, Snackbar, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  },
  success: {
    backgroundColor: '#173822',
    accentColor: '#7BE495',
  },
  error: {
    backgroundColor: '#4A1F24',
    accentColor: '#FF9F9F',
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

const buildSnackbarMessage = snackbar => {
  if (!snackbar) {
    return '';
  }

  if (snackbar.title && snackbar.message) {
    return `${snackbar.title}: ${snackbar.message}`;
  }

  return snackbar.message || snackbar.title || '';
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
      mode: 'text',
      textColor: COLORS.STEAM_TEXT_GRAY,
      compact: true,
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
  const insets = useSafeAreaInsets();
  const dialogQueueRef = useRef([]);
  const snackbarQueueRef = useRef([]);
  const [activeDialog, setActiveDialog] = useState(null);
  const [activeSnackbar, setActiveSnackbar] = useState(null);

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

  const handleDialogDismiss = useCallback(() => {
    setActiveDialog(current => {
      if (!current?.dismissible) {
        return current;
      }

      return null;
    });
  }, []);

  const handleDialogActionPress = useCallback(button => {
    setActiveDialog(null);

    if (typeof button?.onPress === 'function') {
      requestAnimationFrame(() => {
        button.onPress();
      });
    }
  }, []);

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

          {activeDialog?.message ? (
            <Dialog.Content>
              <Text style={styles.dialogMessage}>{activeDialog.message}</Text>
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
            {backgroundColor: snackbarVariantStyle.backgroundColor},
          ]}
          wrapperStyle={[
            styles.snackbarWrapper,
            {bottom: insets.bottom + SPACING.lg},
          ]}
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
                }
              : undefined
          }>
          <Text style={styles.snackbarText}>
            {buildSnackbarMessage(activeSnackbar)}
          </Text>
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
  dialogActions: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
    gap: SPACING.sm,
  },
  dialogButton: {
    borderRadius: RADIUS.md,
  },
  dialogButtonLabel: {
    letterSpacing: 0.2,
  },
  snackbar: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.STEAM_BORDER,
    marginHorizontal: SPACING.lg,
  },
  snackbarWrapper: {
    left: 0,
    right: 0,
  },
  snackbarText: {
    color: COLORS.WHITE,
    lineHeight: 20,
  },
});

export default FeedbackProvider;
