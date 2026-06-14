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
          expect.any(Object),
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
          expect.any(Object),
        ),
      );
      expect(mockContext.handleFollowGame).not.toHaveBeenCalled();
    });

    it('tap cloche → délègue le toggle (le revert est géré par le hook, pas le composant)', async () => {
      const {getByTestId} = renderToggle();
      fireEvent.press(getByTestId(BELL_ID));
      await waitFor(() =>
        expect(mockContext.handleToggleGameNotifications).toHaveBeenCalledWith(
          '730',
          expect.any(Object),
        ),
      );
    });
  });

  // Projection pure : la couleur de la cloche suit DIRECTEMENT l'état du
  // contexte (isGameNotified), pas un état local — donc pas de flash possible.
  it('rend la cloche pleine quand le contexte dit suivi + notifié', () => {
    setFollowState({followed: true, notified: true});
    const {getByTestId} = renderToggle();
    expect(getByTestId(BELL_ID).props.accessibilityLabel).toBe(
      'Couper les notifications',
    );
  });

  it('rend la cloche vide sur un suivi silencieux (suivi mais non notifié)', () => {
    setFollowState({followed: true, notified: false});
    const {getByTestId} = renderToggle();
    expect(getByTestId(BELL_ID).props.accessibilityLabel).toBe(
      'Activer les notifications',
    );
  });
});
