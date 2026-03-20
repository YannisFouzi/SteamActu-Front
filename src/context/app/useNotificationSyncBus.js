import {useCallback, useRef} from 'react';
import {debugError} from '../../hooks/hooksLogger';

export const useNotificationSyncBus = () => {
  const notificationSyncListenersRef = useRef({
    news: new Set(),
    wishlist: new Set(),
    followed: new Set(),
  });

  const registerNotificationSyncHandler = useCallback((type, handler) => {
    if (!type || typeof handler !== 'function') {
      return () => {};
    }

    const listeners = notificationSyncListenersRef.current[type];
    if (!listeners) {
      return () => {};
    }

    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const notifyNotificationSync = useCallback((type, appId) => {
    if (!type || !appId) {
      return;
    }

    const listeners = notificationSyncListenersRef.current[type];
    console.log('[TRACE-SYNC]', {type, appId, listenersCount: listeners?.size || 0});
    if (!listeners || listeners.size === 0) {
      return;
    }

    listeners.forEach(listener => {
      try {
        listener(appId);
      } catch (error) {
        debugError(
          '[FCM] Erreur lors de la notification de synchronisation:',
          error,
        );
      }
    });
  }, []);

  return {
    registerNotificationSyncHandler,
    notifyNotificationSync,
  };
};
