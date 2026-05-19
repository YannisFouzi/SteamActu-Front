import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  queueNotificationAction,
  consumeNotificationActionsForSteamId,
} from '../actionJournal';

const STEAM = '76561197960287930';
const OTHER = '76561197960287931';

describe('services/notifications/actionJournal', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('queueNotificationAction()', () => {
    it('ignore les actions sans kind/steamId/appId', async () => {
      await queueNotificationAction({});
      await queueNotificationAction({ kind: 'unfollow' });
      await queueNotificationAction({ kind: 'unfollow', steamId: STEAM });

      const drained = await consumeNotificationActionsForSteamId(STEAM);
      expect(drained).toEqual([]);
    });

    it('persiste une action avec createdAt + coerce appId', async () => {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: STEAM,
        appId: 730,
      });

      const drained = await consumeNotificationActionsForSteamId(STEAM);
      expect(drained).toHaveLength(1);
      expect(drained[0]).toMatchObject({
        kind: 'unfollow',
        steamId: STEAM,
        appId: '730',
      });
      expect(typeof drained[0].createdAt).toBe('string');
    });

    it('dédup par signature (kind+steamId+appId) — garde la dernière', async () => {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: STEAM,
        appId: '730',
        gameName: 'v1',
      });
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: STEAM,
        appId: '730',
        gameName: 'v2',
      });

      const drained = await consumeNotificationActionsForSteamId(STEAM);
      expect(drained).toHaveLength(1);
      expect(drained[0].gameName).toBe('v2');
    });
  });

  describe('consumeNotificationActionsForSteamId()', () => {
    it('renvoie [] si steamId vide', async () => {
      expect(await consumeNotificationActionsForSteamId('')).toEqual([]);
    });

    it('ne consume que les actions du steamId, laisse les autres', async () => {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: STEAM,
        appId: '730',
      });
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: OTHER,
        appId: '570',
      });

      const drained = await consumeNotificationActionsForSteamId(STEAM);
      expect(drained).toHaveLength(1);
      expect(drained[0].steamId).toBe(STEAM);

      // OTHER toujours en queue
      const otherDrained = await consumeNotificationActionsForSteamId(OTHER);
      expect(otherDrained).toHaveLength(1);
    });

    it('2e consume du même steamId renvoie []', async () => {
      await queueNotificationAction({
        kind: 'unfollow',
        steamId: STEAM,
        appId: '730',
      });
      await consumeNotificationActionsForSteamId(STEAM);
      expect(await consumeNotificationActionsForSteamId(STEAM)).toEqual([]);
    });
  });
});
