const alertMock = jest.fn();

jest.doMock('react-native', () => ({
  Alert: { alert: alertMock },
}));

function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../feedbackService');
  });
  return mod;
}

let svc;
let registerFeedbackController;
let unregisterFeedbackController;
let showDialog;
let showAlert;
let showInfoMessage;
let showSuccessMessage;
let showErrorMessage;

describe('feedback/feedbackService', () => {
  beforeEach(() => {
    alertMock.mockClear();
    svc = loadFresh();
    ({
      registerFeedbackController,
      unregisterFeedbackController,
      showDialog,
      showAlert,
      showInfoMessage,
      showSuccessMessage,
      showErrorMessage,
    } = svc);
  });

  describe('register/unregister controller', () => {
    it('register puis showDialog délègue au controller', () => {
      const controller = { showDialog: jest.fn(), showSnackbar: jest.fn() };
      registerFeedbackController(controller);

      const ok = showDialog({ title: 'T', message: 'M' });
      expect(ok).toBe(true);
      expect(controller.showDialog).toHaveBeenCalledWith({ title: 'T', message: 'M' });
      expect(alertMock).not.toHaveBeenCalled();
    });

    it('unregisterFeedbackController retire le controller (mêmes refs)', () => {
      const controller = { showDialog: jest.fn() };
      registerFeedbackController(controller);
      unregisterFeedbackController(controller);

      showDialog({ title: 'X', message: 'Y' });
      expect(controller.showDialog).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalled();
    });

    it('unregisterFeedbackController ignoré si controller différent', () => {
      const controller = { showDialog: jest.fn() };
      registerFeedbackController(controller);
      unregisterFeedbackController({ showDialog: jest.fn() });

      showDialog({ title: 'X', message: 'Y' });
      expect(controller.showDialog).toHaveBeenCalled();
    });
  });

  describe('fallback Alert si pas de controller', () => {
    it('showDialog → Alert.alert', () => {
      const ok = showDialog({ title: 'T', message: 'M' });
      expect(ok).toBe(false);
      expect(alertMock).toHaveBeenCalledWith('T', 'M', undefined, undefined);
    });

    it('showInfoMessage → Alert sans action (4 args avec options)', () => {
      showInfoMessage('Info', 'message');
      expect(alertMock).toHaveBeenCalledWith(
        'Info',
        'message',
        undefined,
        undefined,
      );
    });

    it('showSnackbar avec actionLabel construit un button Alert', () => {
      const onPress = jest.fn();
      showInfoMessage('I', 'm', { actionLabel: 'OK', onActionPress: onPress });
      const [, , buttons] = alertMock.mock.calls[0];
      expect(buttons).toEqual([{ text: 'OK', onPress }]);
    });
  });

  describe('helpers showXxxMessage', () => {
    it('showSuccessMessage forward variant=success', () => {
      const controller = { showSnackbar: jest.fn() };
      registerFeedbackController(controller);

      showSuccessMessage('S', 'm');
      expect(controller.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success', title: 'S', message: 'm' }),
      );
    });

    it('showErrorMessage forward variant=error', () => {
      const controller = { showSnackbar: jest.fn() };
      registerFeedbackController(controller);

      showErrorMessage('E', 'm');
      expect(controller.showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'error' }),
      );
    });
  });

  describe('showAlert (legacy wrapper)', () => {
    it('forward vers showDialog', () => {
      const controller = { showDialog: jest.fn() };
      registerFeedbackController(controller);

      showAlert('T', 'M', [{ text: 'OK' }]);
      expect(controller.showDialog).toHaveBeenCalledWith({
        title: 'T',
        message: 'M',
        buttons: [{ text: 'OK' }],
        options: undefined,
      });
    });
  });
});
