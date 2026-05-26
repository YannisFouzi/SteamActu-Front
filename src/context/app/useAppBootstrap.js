import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {
  debugLog,
  reportError,
  setSentryUser,
} from '../../hooks/hooksLogger';
import {
  fetchSteamProfile,
  persistSteamProfile,
  readStoredSteamProfile,
} from './sessionHelpers';

export const AUTH_STATUS = {
  BOOTSTRAPPING: 'bootstrapping',
  SIGNED_OUT: 'signed_out',
  SIGNED_IN: 'signed_in',
};

export const useAppBootstrap = ({setSteamId, setUser, setSteamProfile}) => {
  const [authStatus, setAuthStatus] = useState(AUTH_STATUS.BOOTSTRAPPING);
  const isMountedRef = useRef(true);
  const profileRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applySignedOutSession = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }

    profileRequestIdRef.current += 1;
    setSteamId('');
    setUser(null);
    setSteamProfile(null);
    setAuthStatus(AUTH_STATUS.SIGNED_OUT);
    setSentryUser(null);
  }, [setSteamId, setSteamProfile, setUser]);

  const applySignedInSession = useCallback(
    ({steamId, user = null, steamProfile = null}) => {
      if (!steamId || !isMountedRef.current) {
        return;
      }

      setSteamId(steamId);
      setUser(user);
      setSteamProfile(steamProfile);
      setAuthStatus(AUTH_STATUS.SIGNED_IN);
      setSentryUser(steamId);
    },
    [setSteamId, setSteamProfile, setUser],
  );

  const refreshSteamProfile = useCallback(
    async targetSteamId => {
      if (!targetSteamId) {
        return null;
      }

      const requestId = ++profileRequestIdRef.current;

      try {
        const nextProfile = await fetchSteamProfile(targetSteamId);
        await persistSteamProfile(targetSteamId, nextProfile);

        if (
          !isMountedRef.current ||
          requestId !== profileRequestIdRef.current
        ) {
          return nextProfile;
        }

        setSteamProfile(nextProfile);
        return nextProfile;
      } catch (error) {
        reportError(error, {
          scope: 'bootstrap.profile_refresh',
          level: 'warning',
        });
        return null;
      }
    },
    [setSteamProfile],
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
      const cachedSteamProfile = await readStoredSteamProfile(savedSteamId);

      if (cachedSteamProfile) {
        applySignedInSession({
          steamId: savedSteamId,
          steamProfile: cachedSteamProfile,
        });
        refreshSteamProfile(savedSteamId);
        return true;
      }

      let freshSteamProfile = null;
      try {
        freshSteamProfile = await fetchSteamProfile(savedSteamId);
        await persistSteamProfile(savedSteamId, freshSteamProfile);
      } catch (profileError) {
        reportError(profileError, {
          scope: 'bootstrap.profile_fetch',
          level: 'warning',
        });
      }

      applySignedInSession({
        steamId: savedSteamId,
        steamProfile: freshSteamProfile,
      });
      return true;
    } catch (error) {
      reportError(error, {scope: 'bootstrap.session_restore'});
      applySignedOutSession();
      return false;
    }
  }, [applySignedInSession, applySignedOutSession, refreshSteamProfile]);

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
