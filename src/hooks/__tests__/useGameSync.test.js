const userServiceMock = {
  updateRecentActiveGames: jest.fn().mockResolvedValue(),
};

jest.doMock('../../services/api', () => ({ userService: userServiceMock }));

const { renderHook } = require('@testing-library/react-native');
const { useGameSync } = require('../useGameSync');

const STEAM = '76561197960287930';
const DAY = 24 * 60 * 60 * 1000;
const SEVEN_DAYS = 7 * DAY;

describe('hooks/useGameSync', () => {
  beforeEach(() => {
    userServiceMock.updateRecentActiveGames.mockClear();
  });

  it('no-op si pas de steamId', async () => {
    const { result } = renderHook(() => useGameSync());
    await result.current.syncRecentActiveGames(
      [{ appid: '730', lastUpdateTimestamp: Date.now() }],
      null,
    );
    expect(userServiceMock.updateRecentActiveGames).not.toHaveBeenCalled();
  });

  it('envoie un payload trié desc par timestamp, limité à 200', async () => {
    const { result } = renderHook(() => useGameSync());
    const now = Date.now();
    const games = [
      { appid: '730', name: 'A', lastUpdateTimestamp: now - 2 * DAY },
      { appid: '570', name: 'B', lastUpdateTimestamp: now - DAY },
      { appid: '440', name: 'C', lastUpdateTimestamp: now - 3 * DAY },
    ];

    await result.current.syncRecentActiveGames(games, STEAM);

    expect(userServiceMock.updateRecentActiveGames).toHaveBeenCalledTimes(1);
    const [, payload] = userServiceMock.updateRecentActiveGames.mock.calls[0];
    expect(payload.map((p) => p.appId)).toEqual(['570', '730', '440']);
  });

  it('filtre les jeux > 7 jours', async () => {
    const { result } = renderHook(() => useGameSync());
    const now = Date.now();
    const games = [
      { appid: '730', name: 'recent', lastUpdateTimestamp: now - DAY },
      { appid: '570', name: 'old', lastUpdateTimestamp: now - SEVEN_DAYS - DAY },
    ];

    await result.current.syncRecentActiveGames(games, STEAM);
    const [, payload] = userServiceMock.updateRecentActiveGames.mock.calls[0];
    expect(payload).toHaveLength(1);
    expect(payload[0].appId).toBe('730');
  });

  it('dédup sur appId — garde le plus récent', async () => {
    const { result } = renderHook(() => useGameSync());
    const now = Date.now();
    const games = [
      { appid: '730', name: 'old', lastUpdateTimestamp: now - 2 * DAY },
      { appid: '730', name: 'recent', lastUpdateTimestamp: now - DAY },
    ];

    await result.current.syncRecentActiveGames(games, STEAM);
    const [, payload] = userServiceMock.updateRecentActiveGames.mock.calls[0];
    expect(payload).toHaveLength(1);
    expect(payload[0].name).toBe('recent');
  });

  it('normalise timestamp en secondes vs ms', async () => {
    const { result } = renderHook(() => useGameSync());
    const nowSec = Math.floor(Date.now() / 1000);
    await result.current.syncRecentActiveGames(
      [{ appid: '730', name: 'X', lastUpdateTimestamp: nowSec }],
      STEAM,
    );
    expect(userServiceMock.updateRecentActiveGames).toHaveBeenCalled();
  });

  it('cap à 200 jeux', async () => {
    const { result } = renderHook(() => useGameSync());
    const now = Date.now();
    const games = Array.from({ length: 300 }, (_, i) => ({
      appid: String(i),
      name: `G${i}`,
      lastUpdateTimestamp: now - (i % 6) * DAY * 0.5,
    }));

    await result.current.syncRecentActiveGames(games, STEAM);
    const [, payload] = userServiceMock.updateRecentActiveGames.mock.calls[0];
    expect(payload.length).toBeLessThanOrEqual(200);
  });

  it('swallow les erreurs API (pas de throw)', async () => {
    userServiceMock.updateRecentActiveGames.mockRejectedValueOnce(new Error('down'));
    const { result } = renderHook(() => useGameSync());
    await expect(
      result.current.syncRecentActiveGames(
        [{ appid: '730', lastUpdateTimestamp: Date.now() }],
        STEAM,
      ),
    ).resolves.toBeUndefined();
  });
});
