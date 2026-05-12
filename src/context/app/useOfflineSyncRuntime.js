import NetInfo from '@react-native-community/netinfo';
import {useCallback, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {debugError, debugLog} from '../../hooks/hooksLogger';
import {
  setOfflineSyncConnectivity,
  syncOfflineQueue,
} from '../../services/offlineSyncQueue';

const isNetworkUsable = state =>
  state?.isConnected !== false && state?.isInternetReachable !== false;

export const useOfflineSyncRuntime = ({enabled, scopeKey}) => {
  const scopeKeyRef = useRef(scopeKey);
  const onlineRef = useRef(true);

  useEffect(() => {
    scopeKeyRef.current = scopeKey;
  }, [scopeKey]);

  const triggerSync = useCallback((reason, options = {}) => {
    if (!enabled || !scopeKeyRef.current) {
      return;
    }

    syncOfflineQueue({
      scopeKey: scopeKeyRef.current,
      isOnline: onlineRef.current,
      reason,
      ...options,
    }).catch(error => {
      debugError('[OFFLINE_SYNC] Runtime sync failed:', error);
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !scopeKey) {
      return undefined;
    }

    let cancelled = false;

    NetInfo.fetch()
      .then(state => {
        if (cancelled) {
          return;
        }

        onlineRef.current = isNetworkUsable(state);
        setOfflineSyncConnectivity(onlineRef.current);
        triggerSync('runtime-start');
      })
      .catch(error => {
        debugError('[OFFLINE_SYNC] NetInfo initial fetch failed:', error);
        onlineRef.current = true;
        setOfflineSyncConnectivity(true);
        triggerSync('runtime-start-fallback');
      });

    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOnline = onlineRef.current;
      const isOnline = isNetworkUsable(state);
      onlineRef.current = isOnline;
      setOfflineSyncConnectivity(isOnline);

      if (!wasOnline && isOnline) {
        debugLog('[OFFLINE_SYNC] Network restored');
        triggerSync('network-restored', {force: true});
      }
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          triggerSync('app-active');
        }
      },
    );

    return () => {
      cancelled = true;
      unsubscribeNetInfo();
      appStateSubscription.remove();
    };
  }, [enabled, scopeKey, triggerSync]);
};
