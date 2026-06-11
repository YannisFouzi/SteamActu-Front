jest.doMock('../../services/api', () => ({
  steamService: {
    searchGames: jest.fn(),
  },
}));

const { renderHook, act, waitFor } = require('@testing-library/react-native');
const { useStoreSearch } = require('../useStoreSearch');
const { steamService } = require('../../services/api');

describe('hooks/useStoreSearch', () => {
  beforeEach(() => {
    steamService.searchGames.mockReset();
  });

  it('renvoie [] sans loader si query trop courte', async () => {
    const { result } = renderHook(() => useStoreSearch('a', { minLength: 3 }));
    expect(result.current.results).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasSearched).toBe(false);
  });

  it('debounce + appelle searchGames + remplit results', async () => {
    jest.useFakeTimers();
    steamService.searchGames.mockResolvedValue({
      data: [{ appid: 730, name: 'CSGO' }],
    });

    const { result } = renderHook(
      ({ q }) => useStoreSearch(q, { debounceMs: 100, minLength: 2 }),
      { initialProps: { q: 'cs' } },
    );

    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    jest.useRealTimers();

    await waitFor(() => {
      expect(result.current.hasSearched).toBe(true);
    });
    expect(steamService.searchGames).toHaveBeenCalledWith(
      'cs',
      5,
      expect.objectContaining({ signal: expect.any(Object) }),
    );
    expect(result.current.results).toEqual([{ appid: 730, name: 'CSGO' }]);
  });

  it('hasSearched=true même sur erreur, results=[]', async () => {
    jest.useFakeTimers();
    steamService.searchGames.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() =>
      useStoreSearch('csgo', { debounceMs: 50, minLength: 2 }),
    );

    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    jest.useRealTimers();

    await waitFor(() => {
      expect(result.current.hasSearched).toBe(true);
    });
    expect(result.current.results).toEqual([]);
  });

  it('canceled error ne met pas hasSearched', async () => {
    jest.useFakeTimers();
    steamService.searchGames.mockRejectedValue({
      name: 'CanceledError',
    });

    const { result } = renderHook(() =>
      useStoreSearch('csgo', { debounceMs: 50, minLength: 2 }),
    );

    await act(async () => {
      jest.advanceTimersByTime(50);
    });
    jest.useRealTimers();
    // hasSearched reste false (l'abort n'est pas une vraie search)
    expect(result.current.hasSearched).toBe(false);
  });
});
