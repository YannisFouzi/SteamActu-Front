const actionsMock = {
  executeFollowPromptAction: jest.fn(),
  executeNotificationUnfollow: jest.fn(),
  notifyUnfollowSyncCallbacks: jest.fn(),
  performHeadlessNotificationUnfollow: jest.fn().mockResolvedValue(true),
};

const initStoreMock = {
  consumePendingNotification: jest.fn(),
  setPendingNavigationFollowPromptIntent: jest.fn(),
};

const helpersMock = {
  appIdOrThrow: jest.fn((v) => String(v)),
  extractNotificationPayload: jest.fn(),
  logCriticalNotificationError: jest.fn(),
  openUrlSafely: jest.fn(),
};

const processedNotificationIdsMock = {
  has: jest.fn().mockReturnValue(false),
  add: jest.fn(),
};

jest.doMock('@notifee/react-native', () => ({
  __esModule: true,
  default: {},
  EventType: {
    PRESS: 1,
    ACTION_PRESS: 2,
    DISMISSED: 0,
    UNKNOWN: -1,
    DELIVERED: 3,
  },
}));
jest.doMock('../actions', () => actionsMock);
jest.doMock('../../initialNotificationStore', () => initStoreMock);
jest.doMock('../helpers', () => helpersMock);
jest.doMock('../runtime', () => ({
  backgroundEventHandlers: new Set(),
  processedNotificationIds: processedNotificationIdsMock,
}));

const {
  handleNotificationInteraction,
  consumePendingInitialNotification,
  handleBackgroundNotifeeEvent,
  getBackgroundEventHandlers,
} = require('../events');

const EventType = require('@notifee/react-native').EventType;

describe('services/notifications/events', () => {
  beforeEach(() => {
    Object.values(actionsMock).forEach((fn) => fn.mockClear?.());
    Object.values(initStoreMock).forEach((fn) => fn.mockClear?.());
    Object.values(helpersMock).forEach((fn) => fn.mockClear?.());
    processedNotificationIdsMock.has.mockReset().mockReturnValue(false);
    processedNotificationIdsMock.add.mockClear();
  });

  describe('handleNotificationInteraction()', () => {
    it('no-op si eventType ≠ PRESS/ACTION_PRESS', async () => {
      await handleNotificationInteraction({
        eventType: EventType.DISMISSED,
        detail: {},
      });
      expect(actionsMock.executeNotificationUnfollow).not.toHaveBeenCalled();
    });

    it('action open-news → openUrlSafely', async () => {
      await handleNotificationInteraction({
        eventType: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'open-news' },
          notification: { data: { url: 'https://x' } },
        },
      });
      expect(helpersMock.openUrlSafely).toHaveBeenCalledWith('https://x');
    });

    it('action unfollow-game → executeNotificationUnfollow + notifyUnfollowSyncCallbacks', async () => {
      actionsMock.executeNotificationUnfollow.mockResolvedValue(true);

      await handleNotificationInteraction({
        eventType: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'unfollow-game' },
          notification: { data: { appId: '730', steamId: 's' } },
        },
        steamId: 's',
        onNotificationUnfollowCommitted: jest.fn(),
        onNewsUnfollow: jest.fn(),
      });

      expect(actionsMock.executeNotificationUnfollow).toHaveBeenCalled();
      expect(actionsMock.notifyUnfollowSyncCallbacks).toHaveBeenCalledWith(
        '730',
        expect.any(Object),
      );
    });

    it('action unfollow-game qui échoue → pas de notify', async () => {
      actionsMock.executeNotificationUnfollow.mockResolvedValue(false);
      await handleNotificationInteraction({
        eventType: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'unfollow-game' },
          notification: { data: { appId: '730' } },
        },
      });
      expect(actionsMock.notifyUnfollowSyncCallbacks).not.toHaveBeenCalled();
    });

    it('action follow-game → executeFollowPromptAction', async () => {
      await handleNotificationInteraction({
        eventType: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'follow-game' },
          notification: { data: { appId: '730' } },
        },
        steamId: 's',
      });
      expect(actionsMock.executeFollowPromptAction).toHaveBeenCalled();
    });

    it('PRESS sur notif type=follow_prompt (sans action) → executeFollowPromptAction', async () => {
      await handleNotificationInteraction({
        eventType: EventType.PRESS,
        detail: {
          notification: { data: { type: 'follow_prompt', appId: '730' } },
        },
      });
      expect(actionsMock.executeFollowPromptAction).toHaveBeenCalled();
    });

    it('PRESS sans action mais data.url → openUrlSafely', async () => {
      await handleNotificationInteraction({
        eventType: EventType.PRESS,
        detail: {
          notification: { data: { url: 'https://x', type: 'news' } },
        },
      });
      expect(helpersMock.openUrlSafely).toHaveBeenCalledWith('https://x');
    });
  });

  describe('consumePendingInitialNotification()', () => {
    it('no-op si rien à consommer', async () => {
      initStoreMock.consumePendingNotification.mockReturnValue(null);
      await consumePendingInitialNotification({});
      expect(helpersMock.openUrlSafely).not.toHaveBeenCalled();
    });

    it('source=firebase + payload follow_prompt → ignore + mark processed', async () => {
      initStoreMock.consumePendingNotification.mockReturnValue({
        source: 'firebase',
        data: {},
      });
      helpersMock.extractNotificationPayload.mockReturnValue({
        id: 'n1',
        type: 'follow_prompt',
      });

      await consumePendingInitialNotification({});
      expect(processedNotificationIdsMock.add).toHaveBeenCalledWith('n1');
      expect(helpersMock.openUrlSafely).not.toHaveBeenCalled();
    });

    it('source=firebase + payload news avec url → openUrlSafely', async () => {
      initStoreMock.consumePendingNotification.mockReturnValue({
        source: 'firebase',
        data: {},
      });
      helpersMock.extractNotificationPayload.mockReturnValue({
        id: 'n2',
        type: 'news',
        data: { url: 'https://x' },
      });
      await consumePendingInitialNotification({});
      expect(helpersMock.openUrlSafely).toHaveBeenCalledWith('https://x');
    });

    it('skip si payload déjà processed', async () => {
      initStoreMock.consumePendingNotification.mockReturnValue({
        source: 'firebase',
        data: {},
      });
      helpersMock.extractNotificationPayload.mockReturnValue({
        id: 'n3',
        type: 'news',
        data: { url: 'https://x' },
      });
      processedNotificationIdsMock.has.mockReturnValue(true);
      await consumePendingInitialNotification({});
      expect(helpersMock.openUrlSafely).not.toHaveBeenCalled();
    });

    it('source=notifee + follow_prompt → ignore', async () => {
      initStoreMock.consumePendingNotification.mockReturnValue({
        source: 'notifee',
        data: { notification: { id: 'nf1', data: { type: 'follow_prompt' } } },
      });
      await consumePendingInitialNotification({});
      expect(processedNotificationIdsMock.add).toHaveBeenCalledWith('nf1');
    });
  });

  describe('handleBackgroundNotifeeEvent()', () => {
    it('action open-news → openUrlSafely + mark processed', async () => {
      await handleBackgroundNotifeeEvent({
        type: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'open-news' },
          notification: { id: 'n1', data: { url: 'https://x' } },
        },
      });
      expect(helpersMock.openUrlSafely).toHaveBeenCalledWith('https://x');
      expect(processedNotificationIdsMock.add).toHaveBeenCalledWith('n1');
    });

    it('action unfollow-game → performHeadlessNotificationUnfollow', async () => {
      await handleBackgroundNotifeeEvent({
        type: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'unfollow-game' },
          notification: { id: 'n2', data: { appId: '730' } },
        },
      });
      expect(actionsMock.performHeadlessNotificationUnfollow).toHaveBeenCalled();
      expect(processedNotificationIdsMock.add).toHaveBeenCalledWith('n2');
    });

    it('action follow-game → setPendingNavigationFollowPromptIntent + executeFollowPromptAction', async () => {
      await handleBackgroundNotifeeEvent({
        type: EventType.ACTION_PRESS,
        detail: {
          pressAction: { id: 'follow-game' },
          notification: { id: 'n3', data: { appId: '730', gameName: 'CSGO' } },
        },
      });
      expect(initStoreMock.setPendingNavigationFollowPromptIntent).toHaveBeenCalledWith({
        appId: '730',
        gameName: 'CSGO',
      });
      expect(actionsMock.executeFollowPromptAction).toHaveBeenCalled();
    });

    it('logCriticalNotificationError si event corrompu', async () => {
      // event = null → accès à event.type throw
      await handleBackgroundNotifeeEvent(null);
      expect(helpersMock.logCriticalNotificationError).toHaveBeenCalled();
    });
  });

  describe('getBackgroundEventHandlers()', () => {
    it('renvoie un array', () => {
      expect(Array.isArray(getBackgroundEventHandlers())).toBe(true);
    });
  });
});
