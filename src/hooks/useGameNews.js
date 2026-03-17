import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {newsService} from '../services/api';
import {getGameAppId} from '../utils';
import {debugError, debugLog, showAlert} from './hooksLogger';

/**
 * Hook personnalise pour la gestion des actualites d'un jeu.
 * Centralise la logique de chargement et de rafraichissement des actualites.
 */
export const useGameNews = game => {
  const {t} = useTranslation();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNews = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const shouldProcess = () =>
      isMountedRef.current && requestId === requestIdRef.current;

    if (shouldProcess()) {
      setLoading(true);
    }

    try {
      const gameId = getGameAppId(game);

      if (!gameId) {
        throw new Error(t('errors.missingGameId'));
      }

      debugLog('[GAME NEWS] Loading game news', gameId);
      const response = await newsService.getGameNews(gameId, 10, 500);
      const nextNews = response.data || [];

      if (!shouldProcess()) {
        return;
      }

      setNews(Array.isArray(nextNews) ? nextNews : []);
    } catch (error) {
      debugError('[GAME NEWS] Failed to load game news:', error);

      if (!shouldProcess()) {
        return;
      }

      showAlert(t('common.error'), t('news.loadGameNewsError'));
    } finally {
      if (!shouldProcess()) {
        return;
      }

      setLoading(false);
      setRefreshing(false);
    }
  }, [game, t]);

  const handleRefresh = useCallback(() => {
    if (isMountedRef.current) {
      setRefreshing(true);
    }
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  const hasNews = news && Array.isArray(news) && news.length > 0;

  return {
    news,
    loading,
    refreshing,
    hasNews,
    loadNews,
    handleRefresh,
  };
};
