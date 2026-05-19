import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  useAsyncStorage,
  useLastVerificationDate,
  buildStorageKey,
  getJSONItem,
  setJSONItem,
} from '../useAsyncStorage';

describe('hooks/useAsyncStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe('useAsyncStorage()', () => {
    it('renvoie defaultValue puis hydrate depuis storage', async () => {
      await AsyncStorage.setItem('foo', JSON.stringify({ count: 5 }));

      const { result } = renderHook(() =>
        useAsyncStorage('foo', { count: 0 }),
      );

      expect(result.current[0]).toEqual({ count: 0 }); // initial
      await waitFor(() => expect(result.current[2]).toBe(true)); // isLoaded
      expect(result.current[0]).toEqual({ count: 5 });
    });

    it('parse string brut si JSON.parse échoue', async () => {
      await AsyncStorage.setItem('raw', 'plain-string');

      const { result } = renderHook(() => useAsyncStorage('raw', ''));
      await waitFor(() => expect(result.current[2]).toBe(true));
      expect(result.current[0]).toBe('plain-string');
    });

    it('setter persiste + met à jour la valeur', async () => {
      const { result } = renderHook(() =>
        useAsyncStorage('counter', 0),
      );
      await waitFor(() => expect(result.current[2]).toBe(true));

      await act(async () => {
        await result.current[1](42);
      });

      expect(result.current[0]).toBe(42);
      expect(JSON.parse(await AsyncStorage.getItem('counter'))).toBe(42);
    });

    it('setter null → removeItem', async () => {
      await AsyncStorage.setItem('toDelete', 'x');
      const { result } = renderHook(() => useAsyncStorage('toDelete', ''));
      await waitFor(() => expect(result.current[2]).toBe(true));

      await act(async () => {
        await result.current[1](null);
      });
      expect(await AsyncStorage.getItem('toDelete')).toBeNull();
    });

    it('setter avec string → store as-is (pas de JSON.stringify)', async () => {
      const { result } = renderHook(() => useAsyncStorage('s', ''));
      await waitFor(() => expect(result.current[2]).toBe(true));

      await act(async () => {
        await result.current[1]('hello');
      });
      expect(await AsyncStorage.getItem('s')).toBe('hello');
    });
  });

  describe('useLastVerificationDate()', () => {
    it('isOlderThanOneDay = true si pas de date', async () => {
      const { result } = renderHook(() => useLastVerificationDate());
      await waitFor(() => expect(result.current.isLoaded).toBe(true));
      expect(result.current.isOlderThanOneDay()).toBe(true);
    });

    it('updateVerificationDate stocke now()', async () => {
      const { result } = renderHook(() => useLastVerificationDate());
      await waitFor(() => expect(result.current.isLoaded).toBe(true));

      await act(async () => {
        result.current.updateVerificationDate();
      });

      // La date stockée est récente → pas plus vieille qu'un jour
      await waitFor(() => expect(result.current.date).toBeTruthy());
    });
  });

  describe('buildStorageKey()', () => {
    it('renvoie "app:{prefix}:{steamId}"', () => {
      expect(buildStorageKey('games', '7656')).toBe('app:games:7656');
    });

    it('null si steamId vide', () => {
      expect(buildStorageKey('games', '')).toBeNull();
      expect(buildStorageKey('games', null)).toBeNull();
    });
  });

  describe('getJSONItem / setJSONItem', () => {
    it('round-trip JSON', async () => {
      await setJSONItem('x', { a: 1 });
      expect(await getJSONItem('x')).toEqual({ a: 1 });
    });

    it('fallback si pas en storage', async () => {
      expect(await getJSONItem('missing', 'fallback')).toBe('fallback');
    });

    it('null si key vide', async () => {
      await setJSONItem('', { a: 1 });
      expect(await getJSONItem('')).toBeNull();
    });

    it('setJSONItem(null) → removeItem', async () => {
      await setJSONItem('x', { a: 1 });
      await setJSONItem('x', null);
      expect(await AsyncStorage.getItem('x')).toBeNull();
    });

    it('getJSONItem retire la clé si JSON invalide', async () => {
      await AsyncStorage.setItem('bad', '{not json');
      expect(await getJSONItem('bad', 'default')).toBe('default');
      expect(await AsyncStorage.getItem('bad')).toBeNull();
    });
  });
});
