import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {debugError, debugLog} from '../../hooks/hooksLogger';

export const AUTH_STATUS = {
  BOOTSTRAPPING: 'bootstrapping',
  SIGNED_OUT: 'signed_out',
  SIGNED_IN: 'signed_in',
};

export const useAppBootstrap = ({setSteamId, setUser}) => {
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.BOOTSTRAPPING);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applySignedOutSession = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    setSteamId('');
    setUser(null);
    setAuthStatus(AUTH_STATUS.SIGNED_OUT);
  }, [setSteamId, setUser]);

  const applySignedInSession = useCallback(
    ({steamId, user = null}) => {
      if (!steamId || !isMountedRef.current) {
        return;
      }

      setSteamId(steamId);
      setUser(user);
      setAuthStatus(AUTH_STATUS.SIGNED_IN);
    },
    [setSteamId, setUser],
  );

  const bootstrapSession = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setAuthStatus(AUTH_STATUS.BOOTSTRAPPING);
      }

      const savedSteamId = await AsyncStorage.getItem('steamId');

      if (!savedSteamId) {
        debugLog('[BOOTSTRAP] Aucune session locale trouvee');
        applySignedOutSession();
        return false;
      }

      debugLog('[BOOTSTRAP] Session locale restauree');
      applySignedInSession({steamId: savedSteamId});
      return true;
    } catch (error) {
      debugError('[BOOTSTRAP] Erreur lors de la restauration de session:', error);
      applySignedOutSession();
      return false;
    }
  }, [applySignedInSession, applySignedOutSession]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  return {
    authStatus,
    isBootstrapping: authStatus === AUTH_STATUS.BOOTSTRAPPING,
    isAuthenticated: authStatus === AUTH_STATUS.SIGNED_IN,
    applySignedInSession,
    applySignedOutSession,
    bootstrapSession,
  };
};
