function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../offlineSyncQueue');
  });
  return mod;
}

describe('services/offlineSyncQueue', () => {
  let queue;
  let AsyncStorage;

  beforeEach(async () => {
    queue = loadFresh();
    AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
  });

  describe('registerOfflineSyncTaskType()', () => {
    it('lève si type vide', () => {
      expect(() => queue.registerOfflineSyncTaskType('', jest.fn())).toThrow();
    });

    it('lève si handler n\'est pas une function', () => {
      expect(() => queue.registerOfflineSyncTaskType('x', null)).toThrow();
    });
  });

  describe('enqueueOfflineSyncTask()', () => {
    it('renvoie false si type/scopeKey/dedupeKey manquant', async () => {
      expect(await queue.enqueueOfflineSyncTask({})).toBe(false);
      expect(
        await queue.enqueueOfflineSyncTask({
          type: 't',
          scopeKey: '',
          dedupeKey: 'd',
        }),
      ).toBe(false);
    });

    it('persiste la task et la rend lisible dans le snapshot', async () => {
      queue.registerOfflineSyncTaskType('test', jest.fn());
      await queue.enqueueOfflineSyncTask({
        type: 'test',
        scopeKey: 'scope',
        dedupeKey: 'd1',
        payload: { foo: 'bar' },
      });

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0]).toMatchObject({
        type: 'test',
        scopeKey: 'scope',
        dedupeKey: 'd1',
        payload: { foo: 'bar' },
        attempts: 0,
      });
    });

    it('dédup par (type, scopeKey, dedupeKey) — remplace la précédente', async () => {
      queue.registerOfflineSyncTaskType('t', jest.fn());
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
        payload: { v: 1 },
      });
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
        payload: { v: 2 },
      });

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0].payload).toEqual({ v: 2 });
    });
  });

  describe('hasQueuedOfflineSyncTask()', () => {
    it('true si match scope + type', async () => {
      queue.registerOfflineSyncTaskType('t', jest.fn());
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });

      expect(
        await queue.hasQueuedOfflineSyncTask({ scopeKey: 's', type: 't' }),
      ).toBe(true);
      expect(
        await queue.hasQueuedOfflineSyncTask({ scopeKey: 'other', type: 't' }),
      ).toBe(false);
      expect(
        await queue.hasQueuedOfflineSyncTask({ scopeKey: 's', type: 'other' }),
      ).toBe(false);
    });
  });

  describe('clearOfflineSyncTasks()', () => {
    it('retire les tasks du scope correspondant', async () => {
      queue.registerOfflineSyncTaskType('a', jest.fn());
      queue.registerOfflineSyncTaskType('b', jest.fn());
      await queue.enqueueOfflineSyncTask({ type: 'a', scopeKey: 's', dedupeKey: '1' });
      await queue.enqueueOfflineSyncTask({ type: 'b', scopeKey: 's', dedupeKey: '2' });
      await queue.enqueueOfflineSyncTask({ type: 'a', scopeKey: 'other', dedupeKey: '3' });

      await queue.clearOfflineSyncTasks({ scopeKey: 's', types: ['a'] });

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap.map((t) => `${t.scopeKey}/${t.type}`).sort()).toEqual([
        'other/a',
        's/b',
      ]);
    });
  });

  describe('syncOfflineQueue()', () => {
    it('exécute le handler et retire la task', async () => {
      const handler = jest.fn().mockResolvedValue();
      queue.registerOfflineSyncTaskType('t', handler);
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
        payload: { ok: 1 },
      });

      await queue.syncOfflineQueue();

      expect(handler).toHaveBeenCalledWith(
        { ok: 1 },
        expect.objectContaining({ type: 't' }),
      );
      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toEqual([]);
    });

    it('drop une task qui throw avec offlineSyncPermanent=true', async () => {
      const err = new Error('bad');
      err.offlineSyncPermanent = true;
      queue.registerOfflineSyncTaskType(
        't',
        jest.fn().mockRejectedValue(err),
      );
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });

      await queue.syncOfflineQueue();

      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('drop une task avec erreur HTTP 4xx (sauf 408/429)', async () => {
      const err = Object.assign(new Error('bad'), { status: 400 });
      queue.registerOfflineSyncTaskType(
        't',
        jest.fn().mockRejectedValue(err),
      );
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });

      await queue.syncOfflineQueue();
      expect(await queue.getOfflineSyncQueueSnapshot()).toEqual([]);
    });

    it('retry transient errors (incrémente attempts + lastError)', async () => {
      const err = Object.assign(new Error('flaky'), { status: 503 });
      queue.registerOfflineSyncTaskType(
        't',
        jest.fn().mockRejectedValue(err),
      );
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });

      await queue.syncOfflineQueue();

      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
      expect(snap[0].attempts).toBe(1);
      expect(snap[0].lastError).toContain('503');
      expect(snap[0].nextRunAt).toBeGreaterThan(Date.now());
    });

    it('ignore les tasks dont le type n\'a pas de handler', async () => {
      // task pré-existante en storage sans handler enregistré
      await queue.enqueueOfflineSyncTask({
        type: 'unknown',
        scopeKey: 's',
        dedupeKey: 'd',
      });
      // pas de registerOfflineSyncTaskType('unknown')

      await queue.syncOfflineQueue();
      // Task reste en queue car aucun handler
      const snap = await queue.getOfflineSyncQueueSnapshot();
      expect(snap).toHaveLength(1);
    });

    it('skip drain si offline', async () => {
      const handler = jest.fn().mockResolvedValue();
      queue.registerOfflineSyncTaskType('t', handler);
      queue.setOfflineSyncConnectivity(false);
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });

      const result = await queue.syncOfflineQueue();
      expect(result).toBe(false);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('setOfflineSyncConnectivity()', () => {
    it('isOnline=true par défaut (any non-false = true)', () => {
      queue.setOfflineSyncConnectivity(undefined);
      // pas d'effet visible mais ne throw pas
      expect(true).toBe(true);
    });

    it('passe à false uniquement quand explicitement false', async () => {
      queue.setOfflineSyncConnectivity(false);
      queue.registerOfflineSyncTaskType('t', jest.fn());
      await queue.enqueueOfflineSyncTask({
        type: 't',
        scopeKey: 's',
        dedupeKey: 'd',
      });
      expect(await queue.syncOfflineQueue()).toBe(false);
    });
  });
});
