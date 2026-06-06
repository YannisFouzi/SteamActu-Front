import {useEffect, useState} from 'react';

import {useAppContext} from '../context/AppContext';
import {adminService} from '../services/api';

/**
 * Whether the current Steam account is an admin (SteamID in ADMIN_STEAM_IDS,
 * checked server-side via GET /admin/access). Shared by the Settings header
 * button and the "Suivre" admin refresh button so the gate logic lives once.
 * Fails closed (false) on any error.
 */
export function useAdminAccess() {
  const {steamId} = useAppContext();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsAdmin(false);

    if (!steamId) {
      return () => {
        cancelled = true;
      };
    }

    adminService
      .getAccess()
      .then(response => {
        if (!cancelled) {
          setIsAdmin(Boolean(response.data?.isAdmin));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [steamId]);

  return isAdmin;
}
