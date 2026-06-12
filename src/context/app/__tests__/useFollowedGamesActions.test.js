import {renderHook, act} from '@testing-library/react-native';

const mockQueueFollowSync = jest.fn();
const mockSyncQueuedFollow = jest.fn().mockResolvedValue(undefined);
const mockReconcile = jest.fn().mockResolvedValue(0);
jest.mock('../../../services/followSync', () => ({
  queueFollowSync: (...args) => mockQueueFollowSync(...args),
  syncQueuedFollow: (...args) => mockSyncQueuedFollow(...args),
  reconcilePendingFollowMutations: (...args) => mockReconcile(...args),
}));

const mockApplyLocalFollowState = jest.fn();
jest.mock('../../../services/followStateLocalStore', () => ({
  applyLocalFollowState: (...args) => mockApplyLocalFollowState(...args),
  buildFollowGameRef: ref => ({...ref}),
  normalizeFollowAppId: appId =>
    appId === null || appId === undefined ? '' : String(appId).trim(),
  readPendingFollowMutations: jest.fn().mockResolvedValue({}),
}));

const mockSetFollowNotifications = jest.fn().mockResolvedValue({});
jest.mock('../../../services/api', () => ({
  userService: {
    setFollowNotifications: (...args) => mockSetFollowNotifications(...args),
  },
}));

const mockShowAlert = jest.fn();
jest.mock('../../../hooks/hooksLogger', () => ({
  showAlert: (...args) => mockShowAlert(...args),
  debugError: jest.fn(),
  debugLog: jest.fn(),
}));

jest.mock('../../../i18n', () => ({translate: key => key}));
jest.mock('../../../utils', () => ({
  getGameAppId: game => String(game?.appId ?? game?.appid ?? ''),
  getGameIconUrl: () => '',
}));

import {useFollowedGamesActions} from '../useFollowedGamesActions';

const STEAM_ID = '76561197960287930';

// Applique les updaters fonctionnels passés à setUser sur un user de départ,
// pour observer l'état optimiste réellement produit.
const applySetUserCalls = (setUserMock, initialUser) =>
  setUserMock.mock.calls.reduce(
    (acc, [updater]) => (typeof updater === 'function' ? updater(acc) : updater),
    initialUser,
  );

const renderActions = (overrides = {}) => {
  const params = {
    steamId: STEAM_ID,
    user: {followedGames: [], mutedGames: []},
    setUser: jest.fn(),
    games: [],
    setGames: jest.fn(),
    persistGamesCache: jest.fn().mockResolvedValue(undefined),
    persistGamesVersion: jest.fn().mockResolvedValue(undefined),
    markSkipNextGamesRefresh: jest.fn(),
    notifyNotificationSync: jest.fn(),
    ...overrides,
  };
  const rendered = renderHook(() => useFollowedGamesActions(params));
  return {params, ...rendered};
};

describe('context/app/useFollowedGamesActions — fixes suivi à deux niveaux', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueFollowSync.mockResolvedValue(true);
    mockApplyLocalFollowState.mockResolvedValue({appId: '730'});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suivi silencieux : mutedGames est mis à jour AVANT les écritures asynchrones (pas de flash cloche)', async () => {
    // queueFollowSync ne se résout pas tout de suite → on observe l'état
    // optimiste pendant la fenêtre asynchrone.
    let resolveQueue;
    mockQueueFollowSync.mockReturnValue(
      new Promise(resolve => {
        resolveQueue = resolve;
      }),
    );

    const {params, result} = renderActions();

    let followPromise;
    act(() => {
      followPromise = result.current.handleFollowGame({
        appId: '730',
        name: 'CSGO',
        notifications: false,
      });
    });

    // AVANT la résolution de la queue : le jeu doit déjà être muté.
    const optimisticUser = applySetUserCalls(params.setUser, {
      followedGames: [],
      mutedGames: [],
    });
    expect(optimisticUser.mutedGames).toContain('730');

    await act(async () => {
      resolveQueue(true);
      await followPromise;
    });
  });

  it('échec : l\'état muted est restauré (revert) et la garde est nettoyée', async () => {
    mockQueueFollowSync.mockRejectedValue(new Error('boom'));
    const {params, result} = renderActions();

    let success;
    await act(async () => {
      success = await result.current.handleFollowGame({
        appId: '730',
        name: 'CSGO',
        notifications: false,
      });
    });

    expect(success).toBe(false);
    expect(mockShowAlert).toHaveBeenCalled();
    // Le dernier setUser doit avoir retiré 730 de mutedGames (revert vers
    // l'état initial non muté).
    const finalUser = applySetUserCalls(params.setUser, {
      followedGames: [],
      mutedGames: [],
    });
    expect(finalUser.mutedGames).not.toContain('730');
    // Garde nettoyée → re-tap possible immédiatement
    expect(result.current.isFollowPending('730')).toBe(false);
  });

  it('opération locale pendue : le timeout fait toujours terminer handleFollowGame (garde nettoyée)', async () => {
    jest.useFakeTimers();
    mockQueueFollowSync.mockReturnValue(new Promise(() => {})); // pend pour toujours
    const {result} = renderActions();

    let followPromise;
    act(() => {
      followPromise = result.current.handleFollowGame({
        appId: '730',
        name: 'CSGO',
      });
    });

    expect(result.current.isFollowPending('730')).toBe(true);

    let success;
    await act(async () => {
      jest.advanceTimersByTime(10_001); // déclenche withLocalOpTimeout
      success = await followPromise;
    });

    expect(success).toBe(false);
    expect(result.current.isFollowPending('730')).toBe(false); // finally a nettoyé
    expect(mockShowAlert).toHaveBeenCalled();
  });

  it('garde TTL : une entrée in-flight expirée se purge toute seule (plus besoin de restart)', () => {
    jest.useFakeTimers({now: new Date('2026-06-12T10:00:00Z')});
    mockQueueFollowSync.mockReturnValue(new Promise(() => {})); // pend
    const {result} = renderActions();

    act(() => {
      result.current.handleFollowGame({appId: '730', name: 'CSGO'});
    });
    expect(result.current.isFollowPending('730')).toBe(true);

    // Au-delà du TTL (15s) : la garde se considère morte et se purge —
    // c'est le fix du "boutons morts jusqu'au restart de l'app".
    jest.setSystemTime(new Date('2026-06-12T10:00:16Z'));
    expect(result.current.isFollowPending('730')).toBe(false);
  });

  it('handleToggleGameNotifications : optimiste puis revert si le PUT échoue', async () => {
    mockSetFollowNotifications.mockRejectedValue(new Error('500'));
    const {params, result} = renderActions({
      user: {followedGames: ['730'], mutedGames: []},
    });

    let success;
    await act(async () => {
      success = await result.current.handleToggleGameNotifications('730');
    });

    expect(success).toBe(false);
    expect(mockSetFollowNotifications).toHaveBeenCalledWith(
      STEAM_ID,
      '730',
      false, // notifié → on coupait
    );
    // Optimiste (muté) puis revert (dé-muté) : l'état final ne contient pas 730
    const finalUser = applySetUserCalls(params.setUser, {
      followedGames: ['730'],
      mutedGames: [],
    });
    expect(finalUser.mutedGames).not.toContain('730');
    expect(mockShowAlert).toHaveBeenCalled();
  });
});
