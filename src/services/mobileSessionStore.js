import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stockage securise du token de session mobile.
 *
 * Backend de stockage : Keychain (iOS) / Keystore + EncryptedSharedPreferences
 * (Android) via react-native-keychain. Chiffrement materiel (Secure Enclave /
 * TEE) quand disponible — bien plus sur qu'AsyncStorage qui ecrit en clair
 * dans le sandbox de l'app.
 *
 * Le payload est serialise en JSON dans le champ `password` du Keychain ;
 * `username` sert de marqueur (`mobileSession`) pour faciliter le debug.
 *
 * Migration : a la premiere lecture apres update de l'app, si AsyncStorage
 * contient un token herite (anciennes versions), il est rapatrie dans le
 * Keychain puis efface. Transparent pour l'utilisateur (pas de re-login).
 */

const KEYCHAIN_SERVICE = 'gamenews.mobileSession';
const KEYCHAIN_USERNAME = 'mobileSession';

// Anciennes cles AsyncStorage (pre-migration) — utilisees uniquement pour la
// migration one-shot. A supprimer dans une version future (~3 mois apres
// release) quand les users auront tous migre.
const LEGACY_TOKEN_KEY = 'mobileSessionToken';
const LEGACY_EXPIRES_AT_KEY = 'mobileSessionExpiresAt';

function serialize({token, expiresAt}) {
  return JSON.stringify({token, expiresAt: expiresAt || ''});
}

function deserialize(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.token === 'string' && parsed.token) {
      return {token: parsed.token, expiresAt: parsed.expiresAt || ''};
    }
  } catch (_err) {
    // Payload corrompu → traite comme absent
  }
  return null;
}

async function migrateFromAsyncStorageIfNeeded() {
  try {
    const [[, legacyToken], [, legacyExpiresAt]] = await AsyncStorage.multiGet([
      LEGACY_TOKEN_KEY,
      LEGACY_EXPIRES_AT_KEY,
    ]);

    if (!legacyToken) {
      return null;
    }

    const session = {token: legacyToken, expiresAt: legacyExpiresAt || ''};

    // Ecrire dans Keychain puis effacer l'AsyncStorage (atomicite best-effort :
    // si le setGenericPassword echoue, on garde l'AsyncStorage pour re-tenter
    // au prochain demarrage).
    await Keychain.setGenericPassword(KEYCHAIN_USERNAME, serialize(session), {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    });
    await AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_EXPIRES_AT_KEY]);

    return session;
  } catch (_err) {
    return null;
  }
}

export const clearMobileSession = async () => {
  await Promise.all([
    Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE}),
    // Cleanup legacy au cas ou la migration n'aurait pas eu lieu
    AsyncStorage.multiRemove([LEGACY_TOKEN_KEY, LEGACY_EXPIRES_AT_KEY]),
  ]);
};

export const persistMobileSession = async session => {
  const token = session?.token || session?.sessionToken;
  const expiresAt = session?.expiresAt || session?.sessionExpiresAt || '';

  if (!token) {
    await clearMobileSession();
    return;
  }

  await Keychain.setGenericPassword(
    KEYCHAIN_USERNAME,
    serialize({token, expiresAt}),
    {
      service: KEYCHAIN_SERVICE,
      // AFTER_FIRST_UNLOCK : le token est lisible apres le premier deverrouillage
      // du device au boot, meme device verrouille ensuite. Permet aux push
      // notifications de fonctionner en background. WHEN_UNLOCKED serait plus
      // strict mais bloquerait les jobs en background si l'ecran est verrouille.
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
    },
  );
};

export const getMobileSession = async () => {
  let session = null;

  const credentials = await Keychain.getGenericPassword({
    service: KEYCHAIN_SERVICE,
  });

  if (credentials && credentials.password) {
    session = deserialize(credentials.password);
  }

  // Fallback : tenter une migration depuis AsyncStorage si rien dans Keychain
  if (!session) {
    session = await migrateFromAsyncStorageIfNeeded();
  }

  if (!session) {
    return null;
  }

  if (session.expiresAt) {
    const expiresAtMs = Date.parse(session.expiresAt);
    if (Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs) {
      await clearMobileSession();
      return null;
    }
  }

  return {token: session.token, expiresAt: session.expiresAt};
};
