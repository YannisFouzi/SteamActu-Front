import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { debugError } from './hooksLogger';

/**
 * Hook personnalisé pour gérer la persistance avec AsyncStorage
 * @param {string} key - Clé de stockage
 * @param {any} defaultValue - Valeur par défaut
 * @returns {[any, function]} [valeur, setter]
 */
export const useAsyncStorage = (key, defaultValue) => {
  const [value, setValue] = useState(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger la valeur au montage
  useEffect(() => {
    let isActive = true;

    const loadValue = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(key);
        if (!isActive) {
          return;
        }

        if (storedValue !== null) {
          try {
            setValue(JSON.parse(storedValue));
          } catch {
            setValue(storedValue);
          }
        }
      } catch (error) {
        debugError(`Erreur lors du chargement de ${key}:`, error);
      } finally {
        if (isActive) {
          setIsLoaded(true);
        }
      }
    };

    loadValue();

    return () => {
      isActive = false;
    };
  }, [key]);

  // Fonction pour mettre à jour la valeur
  const setStoredValue = async newValue => {
    try {
      setValue(newValue);
      if (newValue === null || newValue === undefined) {
        await AsyncStorage.removeItem(key);
      } else {
        const valueToStore =
          typeof newValue === 'string' ? newValue : JSON.stringify(newValue);
        await AsyncStorage.setItem(key, valueToStore);
      }
    } catch (error) {
      debugError(`Erreur lors de la sauvegarde de ${key}:`, error);
    }
  };

  return [value, setStoredValue, isLoaded];
};

/**
 * Hook spécialisé pour les options de tri
 */
export const useSortOption = () => {
  return useAsyncStorage('sortOption', 'default');
};

/**
 * Hook spécialisé pour la date de dernière vérification
 */
export const useLastVerificationDate = () => {
  const [date, setDate, isLoaded] = useAsyncStorage(
    'lastVerificationDate',
    null,
  );

  const updateVerificationDate = () => {
    setDate(Date.now().toString());
  };

  const isOlderThanOneDay = () => {
    if (!date) {
      return true;
    }
    const lastDate = parseInt(date, 10);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    return now - lastDate > oneDayMs;
  };

  return {
    date,
    updateVerificationDate,
    isOlderThanOneDay,
    isLoaded,
  };
};

/**
 * Hook spécialisé pour la gestion du SteamID
 */
export const useSteamId = () => {
  const [steamId, setSteamId, isLoaded] = useAsyncStorage('steamId', '');

  const clearSteamId = () => {
    setSteamId(null);
  };

  return {
    steamId,
    setSteamId,
    clearSteamId,
    isLoaded,
  };
};

export const buildStorageKey = (prefix, steamId) => {
  if (!steamId) {
    return null;
  }
  return `app:${prefix}:${steamId}`;
};

export const getJSONItem = async (key, fallback = null) => {
  if (!key) {
    return fallback;
  }

  try {
    const storedValue = await AsyncStorage.getItem(key);
    if (!storedValue) {
      return fallback;
    }
    return JSON.parse(storedValue);
  } catch (error) {
    debugError(`[AsyncStorage] Erreur parse JSON pour ${key}:`, error);
    await AsyncStorage.removeItem(key);
    return fallback;
  }
};

export const setJSONItem = async (key, value) => {
  if (!key) {
    return;
  }

  try {
    if (value === null || value === undefined) {
      await AsyncStorage.removeItem(key);
      return;
    }

    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    debugError(`[AsyncStorage] Erreur sauvegarde JSON pour ${key}:`, error);
  }
};
