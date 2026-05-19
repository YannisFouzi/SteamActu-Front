import { renderHook, act } from '@testing-library/react-native';

import { useDebounce } from '../useDebounce';

describe('hooks/useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renvoie la valeur initiale immédiatement', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('attend `delay` ms avant de propager la nouvelle valeur', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    expect(result.current).toBe('a'); // pas encore propagé

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('b');
  });

  it('reset le timer si la valeur change avant la fin', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'c' }); // reset
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe('a'); // 200ms après c, pas encore propagé

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });

  it('défaut delay=300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'a' } },
    );
    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('cleanup le timer au unmount', () => {
    const { unmount } = renderHook(() => useDebounce('x', 300));
    unmount();
    // Pas de re-render après unmount = pas d'erreur "setState on unmounted"
    act(() => {
      jest.advanceTimersByTime(1000);
    });
  });
});
