import {Alert} from 'react-native';

let feedbackController = null;

const fallbackAlert = ({title = '', message = '', buttons, options} = {}) =>
  Alert.alert(title, message, buttons, options);

export const registerFeedbackController = controller => {
  feedbackController = controller;
};

export const unregisterFeedbackController = controller => {
  if (feedbackController === controller) {
    feedbackController = null;
  }
};

export const showDialog = config => {
  if (feedbackController?.showDialog) {
    feedbackController.showDialog(config);
    return true;
  }

  fallbackAlert(config);
  return false;
};

const showSnackbar = config => {
  if (feedbackController?.showSnackbar) {
    feedbackController.showSnackbar(config);
    return true;
  }

  fallbackAlert({
    title: config?.title || '',
    message: config?.message || '',
    buttons:
      config?.action?.label || config?.actionLabel
        ? [
            {
              text: config?.action?.label || config?.actionLabel,
              onPress: config?.action?.onPress || config?.onActionPress,
            },
          ]
        : undefined,
  });
  return false;
};

export const showAlert = (title, message, buttons, options) =>
  showDialog({title, message, buttons, options});

export const showInfoMessage = (title, message, config = {}) =>
  showSnackbar({
    ...config,
    title,
    message,
    variant: 'info',
  });

export const showSuccessMessage = (title, message, config = {}) =>
  showSnackbar({
    ...config,
    title,
    message,
    variant: 'success',
  });

export const showErrorMessage = (title, message, config = {}) =>
  showSnackbar({
    ...config,
    title,
    message,
    variant: 'error',
  });
