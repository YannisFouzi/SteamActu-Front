// Le store est un module singleton avec état global ; on doit le réinitialiser
// entre les tests via jest.resetModules.
function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../initialNotificationStore');
  });
  return mod;
}

describe('services/initialNotificationStore', () => {
  describe('setPendingNotification + consume', () => {
    it('stocke + consume une seule fois (clear après)', () => {
      const store = loadFresh();
      const notif = { source: 'firebase', data: { type: 'news' } };

      store.setPendingNotification(notif);
      expect(store.consumePendingNotification()).toBe(notif);
      expect(store.consumePendingNotification()).toBeNull();
    });

    it('le 1er setPendingNotification gagne (anti-doublon firebase/notifee)', () => {
      const store = loadFresh();
      const a = { source: 'firebase', data: {} };
      const b = { source: 'notifee', data: {} };

      store.setPendingNotification(a);
      store.setPendingNotification(b);
      expect(store.consumePendingNotification()).toBe(a);
    });

    it('alimente AUSSI le store de navigation au 1er set', () => {
      const store = loadFresh();
      const a = { source: 'firebase', data: { foo: 'bar' } };
      store.setPendingNotification(a);

      expect(store.consumeNavigationInitialNotification()).toBe(a);
    });
  });

  describe('setPendingNavigationFollowPromptIntent', () => {
    it('alimente uniquement le store de navigation', () => {
      const store = loadFresh();
      store.setPendingNavigationFollowPromptIntent({
        appId: 730,
        gameName: 'CSGO',
      });

      expect(store.consumePendingNotification()).toBeNull();
      const nav = store.consumeNavigationInitialNotification();
      expect(nav).toEqual({
        source: 'follow_prompt_action',
        data: { appId: '730', gameName: 'CSGO' },
      });
    });

    it('no-op si une notif de navigation est déjà présente', () => {
      const store = loadFresh();
      store.setPendingNotification({ source: 'notifee', data: { x: 1 } });
      store.setPendingNavigationFollowPromptIntent({ appId: '999' });

      const nav = store.consumeNavigationInitialNotification();
      expect(nav.source).toBe('notifee');
    });

    it('coerce appId/gameName en string et accepte undefined', () => {
      const store = loadFresh();
      store.setPendingNavigationFollowPromptIntent({});
      expect(store.consumeNavigationInitialNotification()).toEqual({
        source: 'follow_prompt_action',
        data: { appId: '', gameName: '' },
      });
    });
  });

  describe('bootstrap resolved', () => {
    it('initialement false, true après mark', () => {
      const store = loadFresh();
      expect(store.isInitialNotificationBootstrapResolved()).toBe(false);
      store.markInitialNotificationBootstrapResolved();
      expect(store.isInitialNotificationBootstrapResolved()).toBe(true);
    });

    it('mark idempotent (2e appel = no-op)', () => {
      const store = loadFresh();
      const listener = jest.fn();
      store.subscribeInitialNotificationBootstrap(listener);

      store.markInitialNotificationBootstrapResolved();
      store.markInitialNotificationBootstrapResolved();
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('subscribe + unsubscribe', () => {
      const store = loadFresh();
      const listener = jest.fn();
      const unsub = store.subscribeInitialNotificationBootstrap(listener);
      unsub();
      store.markInitialNotificationBootstrapResolved();
      expect(listener).not.toHaveBeenCalled();
    });

    it('subscribe sur valeur non-function → no-op unsub', () => {
      const store = loadFresh();
      const unsub = store.subscribeInitialNotificationBootstrap('not-a-fn');
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });

    it('listener qui throw n\'empêche pas les autres listeners', () => {
      const store = loadFresh();
      const throwing = jest.fn(() => {
        throw new Error('boom');
      });
      const ok = jest.fn();
      store.subscribeInitialNotificationBootstrap(throwing);
      store.subscribeInitialNotificationBootstrap(ok);

      store.markInitialNotificationBootstrapResolved();
      expect(throwing).toHaveBeenCalled();
      expect(ok).toHaveBeenCalledWith(true);
    });
  });
});
