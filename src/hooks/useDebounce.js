import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook personnalisé pour le debouncing
 * Retarde l'exécution d'une valeur jusqu'à ce qu'elle soit stable
 *
 * @param {any} value - Valeur à debouncer
 * @param {number} delay - Délai en millisecondes (défaut: 300ms)
 * @returns {any} Valeur debouncée
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook personnalisé pour debouncer un callback
 * Utile quand on veut debouncer une fonction plutôt qu'une valeur
 *
 * @param {function} callback - Fonction à debouncer
 * @param {number} delay - Délai en millisecondes (défaut: 300ms)
 * @returns {function} Fonction debouncée
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const timerRef = useRef(null);
  const latestCallbackRef = useRef(callback);

  useEffect(() => {
    latestCallbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        latestCallbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return debouncedCallback;
};
