import {useEffect, useState} from 'react';

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
  const [debounceTimer, setDebounceTimer] = useState(null);

  const debouncedCallback = (...args) => {
    // Nettoyer le timer précédent
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Créer un nouveau timer
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);

    setDebounceTimer(newTimer);
  };

  // Nettoyer le timer au démontage du composant
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return debouncedCallback;
};
