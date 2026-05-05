import {useEffect, useRef, useState} from 'react';
import {steamService} from '../services/api';
import {debugError} from './hooksLogger';

const DEFAULT_DEBOUNCE_MS = 700;
const DEFAULT_MIN_LENGTH = 3;
const DEFAULT_LIMIT = 5;

export const useStoreSearch = (
  query,
  {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minLength = DEFAULT_MIN_LENGTH,
    limit = DEFAULT_LIMIT,
  } = {},
) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = (query || '').trim();

    if (trimmed.length < minLength) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const response = await steamService.searchGames(trimmed, limit, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) {
          return;
        }
        setResults(Array.isArray(response.data) ? response.data : []);
        setHasSearched(true);
      } catch (error) {
        if (error?.original?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
          return;
        }
        debugError('[useStoreSearch] erreur:', error);
        setResults([]);
        setHasSearched(true);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query, debounceMs, minLength, limit]);

  useEffect(
    () => () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    },
    [],
  );

  return {results, loading, hasSearched};
};
