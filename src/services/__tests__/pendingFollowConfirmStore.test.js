function loadFresh() {
  let mod;
  jest.isolateModules(() => {
    mod = require('../pendingFollowConfirmStore');
  });
  return mod;
}

describe('services/pendingFollowConfirmStore', () => {
  it('push + consume FIFO', () => {
    const store = loadFresh();
    store.pushPendingFollowConfirm('730', 'CSGO');
    store.pushPendingFollowConfirm('570', 'Dota');

    const drained = store.consumePendingFollowConfirms();
    expect(drained).toEqual([
      { appId: '730', gameName: 'CSGO' },
      { appId: '570', gameName: 'Dota' },
    ]);
  });

  it('consume vide la queue (2e appel renvoie [])', () => {
    const store = loadFresh();
    store.pushPendingFollowConfirm('730', 'CSGO');
    store.consumePendingFollowConfirms();
    expect(store.consumePendingFollowConfirms()).toEqual([]);
  });

  it('push ignoré si appId falsy', () => {
    const store = loadFresh();
    store.pushPendingFollowConfirm(null, 'X');
    store.pushPendingFollowConfirm('', 'X');
    store.pushPendingFollowConfirm(undefined, 'X');
    expect(store.consumePendingFollowConfirms()).toEqual([]);
  });

  it('gameName par défaut à ""', () => {
    const store = loadFresh();
    store.pushPendingFollowConfirm('730');
    expect(store.consumePendingFollowConfirms()).toEqual([
      { appId: '730', gameName: '' },
    ]);
  });

  it('coerce appId number en string', () => {
    const store = loadFresh();
    store.pushPendingFollowConfirm(730, 'X');
    expect(store.consumePendingFollowConfirms()[0].appId).toBe('730');
  });
});
