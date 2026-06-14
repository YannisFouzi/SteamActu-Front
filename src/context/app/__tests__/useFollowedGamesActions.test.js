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

  it('échec de la synchro arrière-plan : l\'optimiste TIENT (pas de revert, pas d\'alerte)', async () => {
    // L'UI est optimiste : une synchro/persistance lente ou échouée n'est PAS
    // une erreur utilisateur. La file gère ses propres retries.
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

    expect(success).toBe(true); // commit optimiste = succès immédiat
    expect(mockShowAlert).not.toHaveBeenCalled(); // plus de popup d'erreur
    const finalUser = applySetUserCalls(params.setUser, {
      followedGames: [],
      mutedGames: [],
    });
    expect(finalUser.mutedGames).toContain('730'); // l'optimiste muté reste
  });

  it('plus de garde bloquante : isFollowPending renvoie toujours false (re-tap immédiat)', async () => {
    mockQueueFollowSync.mockReturnValue(new Promise(() => {})); // pend
    const {result} = renderActions();

    act(() => {
      result.current.handleFollowGame({appId: '730', name: 'CSGO'});
    });

    // Même avec une mutation "en cours", les boutons ne sont jamais désactivés.
    expect(result.current.isFollowPending('730')).toBe(false);
  });

  it('persistance/synchro lente : le commit renvoie IMMÉDIATEMENT (aucune attente AsyncStorage)', async () => {
    mockQueueFollowSync.mockReturnValue(new Promise(() => {})); // ne résout jamais
    const {result} = renderActions();

    // handleFollowGame ne doit PAS attendre queueFollowSync → résout tout de suite.
    let success;
    await act(async () => {
      success = await result.current.handleFollowGame({
        appId: '730',
        name: 'CSGO',
      });
    });

    expect(success).toBe(true);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('toggle cloche : passe par la FILE (pas de PUT direct) et mute optimistiquement', async () => {
    const {params, result} = renderActions({
      user: {followedGames: ['730'], mutedGames: []},
    });

    await act(async () => {
      await result.current.handleToggleGameNotifications('730');
    });

    // Couper la cloche = enqueue une mutation follow notifications:false
    expect(mockQueueFollowSync).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: '730',
        targetIsFollowed: true, // reste suivi
        notifications: false,
      }),
    );
    // PLUS de PUT direct dans le hook (la convergence est dans la file)
    expect(mockSetFollowNotifications).not.toHaveBeenCalled();
    // Optimiste : 730 muté
    const finalUser = applySetUserCalls(params.setUser, {
      followedGames: ['730'],
      mutedGames: [],
    });
    expect(finalUser.mutedGames).toContain('730');
  });

  it('toggle cloche : optimiste même si la synchro arrière-plan échoue (pas de revert)', async () => {
    mockQueueFollowSync.mockRejectedValue(new Error('queue down'));
    const {params, result} = renderActions({
      user: {followedGames: ['730'], mutedGames: []},
    });

    let success;
    await act(async () => {
      success = await result.current.handleToggleGameNotifications('730');
    });

    expect(success).toBe(true); // optimiste
    const finalUser = applySetUserCalls(params.setUser, {
      followedGames: ['730'],
      mutedGames: [],
    });
    expect(finalUser.mutedGames).toContain('730'); // muté optimiste tient
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('toggle cloche refusé si le jeu n\'est pas suivi', async () => {
    const {result} = renderActions({user: {followedGames: [], mutedGames: []}});

    let success;
    await act(async () => {
      success = await result.current.handleToggleGameNotifications('730');
    });

    expect(success).toBe(false);
    expect(mockQueueFollowSync).not.toHaveBeenCalled();
  });
});
