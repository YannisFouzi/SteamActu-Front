import React from 'react';
import {fireEvent, render, waitFor} from '@testing-library/react-native';

// Contexte app stubé : on pilote l'état de suivi/notifications par test.
const mockContext = {
  handleFollowGame: jest.fn().mockResolvedValue(true),
  handleToggleGameNotifications: jest.fn().mockResolvedValue(true),
  getResolvedFollowState: jest.fn(),
  isGameFollowed: jest.fn().mockReturnValue(false),
  isGameNotified: jest.fn().mockReturnValue(false),
  isFollowPending: jest.fn().mockReturnValue(false),
  confirmUnfollowGames: false,
  handleConfirmUnfollowGamesChange: jest.fn(),
};

jest.mock('../../context/AppContext', () => ({
  useAppContext: () => mockContext,
}));

const mockShowDialog = jest.fn();
jest.mock('../../hooks/hooksLogger', () => ({
  debugLog: jest.fn(),
  showDialog: config => mockShowDialog(config),
}));

require('../../i18n');

import FollowToggle from '../FollowToggle';

const PLUS_ID = 'toggle-plus';
const BELL_ID = 'toggle';

const renderToggle = () =>
  render(<FollowToggle appId="730" name="CSGO" testID={BELL_ID} />);

const setFollowState = ({followed, notified}) => {
  mockContext.getResolvedFollowState.mockReturnValue(followed);
  mockContext.isGameFollowed.mockReturnValue(followed);
  mockContext.isGameNotified.mockReturnValue(notified);
};

describe('components/FollowToggle — machine à états [+][cloche]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockContext.handleFollowGame.mockResolvedValue(true);
    mockContext.handleToggleGameNotifications.mockResolvedValue(true);
    mockContext.isFollowPending.mockReturnValue(false);
    mockContext.confirmUnfollowGames = false;
  });

  describe('jeu NON suivi', () => {
    beforeEach(() => setFollowState({followed: false, notified: false}));

    it('tap + → suivi SILENCIEUX (notifications:false)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(PLUS_ID));

      await waitFor(() =>
        expect(mockContext.handleFollowGame).toHaveBeenCalledWith(
          expect.objectContaining({appId: '730', notifications: false}),
        ),
      );
    });

    it('tap cloche → suit ET notifie d\'un coup (notifications:true)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(BELL_ID));

      await waitFor(() =>
        expect(mockContext.handleFollowGame).toHaveBeenCalledWith(
          expect.objectContaining({appId: '730', notifications: true}),
        ),
      );
      expect(mockContext.handleToggleGameNotifications).not.toHaveBeenCalled();
    });
  });

  describe('jeu suivi NOTIFIÉ', () => {
    beforeEach(() => setFollowState({followed: true, notified: true}));

    it('tap cloche → coupe juste les notifs (toggle, PAS unfollow)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(BELL_ID));

      await waitFor(() =>
        expect(mockContext.handleToggleGameNotifications).toHaveBeenCalledWith(
          '730',
        ),
      );
      expect(mockContext.handleFollowGame).not.toHaveBeenCalled();
    });

    it('tap + avec confirmation activée → ouvre le dialog, ne désabonne pas direct', () => {
      mockContext.confirmUnfollowGames = true;
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(PLUS_ID));

      expect(mockShowDialog).toHaveBeenCalled();
      expect(mockContext.handleFollowGame).not.toHaveBeenCalled();
    });

    it('tap + sans confirmation → désabonne (unfollow via queue)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(PLUS_ID));

      await waitFor(() =>
        expect(mockContext.handleFollowGame).toHaveBeenCalledWith(
          expect.objectContaining({appId: '730', isFollowed: true}),
        ),
      );
      expect(mockShowDialog).not.toHaveBeenCalled();
    });
  });

  describe('jeu suivi SILENCIEUX', () => {
    beforeEach(() => setFollowState({followed: true, notified: false}));

    it('tap cloche → réactive les notifs (toggle)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(BELL_ID));

      await waitFor(() =>
        expect(mockContext.handleToggleGameNotifications).toHaveBeenCalledWith(
          '730',
        ),
      );
      expect(mockContext.handleFollowGame).not.toHaveBeenCalled();
    });

    it('échec du toggle → l\'état visuel de la cloche est reverté', async () => {
      mockContext.handleToggleGameNotifications.mockResolvedValue(false);
      const {getByTestId} = renderToggle();
      const bell = getByTestId(BELL_ID);

      fireEvent.press(bell);

      await waitFor(() =>
        expect(mockContext.handleToggleGameNotifications).toHaveBeenCalled(),
      );
      // Revert : la cloche redevient inactive → son label propose d'activer
      expect(bell.props.accessibilityLabel).toBe('Activer les notifications');
    });
  });

  it('aucune action quand une mutation est en attente (followPending)', () => {
    setFollowState({followed: false, notified: false});
    mockContext.isFollowPending.mockReturnValue(true);
    const {getByTestId} = renderToggle();

    fireEvent.press(getByTestId(PLUS_ID));
    fireEvent.press(getByTestId(BELL_ID));

    expect(mockContext.handleFollowGame).not.toHaveBeenCalled();
    expect(mockContext.handleToggleGameNotifications).not.toHaveBeenCalled();
  });
});
