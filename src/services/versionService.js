import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import {APP_CONFIG} from '../config/env';
import {debugError, debugLog} from '../hooks/hooksLogger';

const VERSION_CHECK_TIMEOUT_MS = 5000;

const versionApi = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: VERSION_CHECK_TIMEOUT_MS,
  headers: {'Content-Type': 'application/json'},
});

// "1.2.3" -> [1, 2, 3]. Tolere les suffixes type "1.2.0-beta" (le suffixe est
// ignore : on compare uniquement la partie numerique). Tout segment non-numerique
// retombe a 0 plutot que de cracher (fail-open).
const parseVersion = raw => {
  if (typeof raw !== 'string') {
    return [0];
  }
  return raw
    .split('-')[0]
    .split('.')
    .map(seg => {
      const n = parseInt(seg, 10);
      return Number.isFinite(n) ? n : 0;
    });
};

// compareVersions('1.10', '1.2') > 0 (semver-aware, pas string compare)
export const compareVersions = (a, b) => {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  const len = Math.max(va.length, vb.length);
  for (let i = 0; i < len; i += 1) {
    const ai = va[i] ?? 0;
    const bi = vb[i] ?? 0;
    if (ai > bi) {
      return 1;
    }
    if (ai < bi) {
      return -1;
    }
  }
  return 0;
};

/**
 * Verifie si la version locale est >= minSupportedVersion renvoyee par le backend.
 *
 * Fail-open : en cas d'erreur reseau, timeout, ou reponse malformee, on considere
 * l'app valide pour ne pas bloquer les users sur un hoquet backend. Le seul cas
 * "outdated" est une reponse explicite et coherente du serveur.
 *
 * @returns {Promise<{status: 'ok'|'outdated', updateUrl: string|null, latestVersion: string|null}>}
 */
export const checkAppVersion = async () => {
  try {
    const {data} = await versionApi.get('/version');
    const minSupported = data?.minSupportedVersion;

    if (!minSupported) {
      debugLog('[VERSION] No minSupportedVersion in response, treating as ok');
      return {status: 'ok', updateUrl: null, latestVersion: null};
    }

    if (compareVersions(APP_CONFIG.APP_VERSION, minSupported) < 0) {
      debugLog('[VERSION] App outdated', {
        local: APP_CONFIG.APP_VERSION,
        minSupported,
      });
      // Remonte a Sentry comme un warning (pas une error) : c'est attendu
      // pour les vieux APK, mais on veut pouvoir compter combien d'users
      // sont bloques sur UpdateRequiredScreen et a quelle version.
      try {
        Sentry.captureMessage('App version outdated', {
          level: 'warning',
          tags: {scope: 'version.outdated'},
          extra: {
            localVersion: APP_CONFIG.APP_VERSION,
            minSupportedVersion: minSupported,
            latestVersion: data?.latestVersion || null,
          },
        });
      } catch (_sentryErr) {
        // Ne pas bloquer le retour de status si Sentry rate
      }
      return {
        status: 'outdated',
        updateUrl: data?.updateUrl || null,
        latestVersion: data?.latestVersion || null,
      };
    }

    return {
      status: 'ok',
      updateUrl: data?.updateUrl || null,
      latestVersion: data?.latestVersion || null,
    };
  } catch (error) {
    debugError('[VERSION] Check failed, failing open:', error?.message || error);
    return {status: 'ok', updateUrl: null, latestVersion: null};
  }
};
