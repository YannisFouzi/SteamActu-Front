import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { COLORS } from '../constants';
import { useAppContext } from '../context/AppContext';
import { steamAuthService, userService } from '../services/api';
import {
  debugError,
  debugLog,
  maskSteamId,
  showAlert,
} from './hooksLogger';

/**
 * Hook personnalisé pour la gestion de l'authentification Steam
 * Centralise toute la logique d'authentification et de gestion des URL
 */
export const useSteamAuth = navigation => {
  const {loadData} = useAppContext(); // Accès à loadData du contexte
  const [loading, setLoading] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);
  const processedUrls = useRef(new Set());
  const loadDataTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (loadDataTimeoutRef.current) {
        clearTimeout(loadDataTimeoutRef.current);
      }
    };
  }, []);

  // Vérifier si un utilisateur est déjà connecté
  const checkExistingUser = useCallback(async () => {
    try {
      debugLog('[STEAM AUTH] Vérification utilisateur existant…');

      const savedSteamId = await AsyncStorage.getItem('steamId');
      if (savedSteamId) {
        debugLog(
          '[STEAM AUTH] Session existante détectée:',
          maskSteamId(savedSteamId),
        );
        if (isMountedRef.current) {
          navigation.replace('Home');
        }
        return true;
      }
      return false;
    } catch (error) {
      debugError(
        "[STEAM AUTH] Erreur lors de la vérification de l'utilisateur existant:",
        error,
      );
      return false;
    }
  }, [navigation]);

  // Gérer la réception d'un SteamID après authentification
  const handleSteamIdReceived = useCallback(
    async steamId => {
      try {
        debugLog('\n🔐 [LOGIN] Début authentification...');
        debugLog('🔐 [LOGIN] steamId:', maskSteamId(steamId));

        if (isMountedRef.current) {
          setLoading(true);
        }

        // Enregistrer l'utilisateur sur le serveur
        let response;
        try {
          debugLog('🔐 [LOGIN] 🔄 POST /users/register');
          response = await userService.register(steamId);
          debugLog('🔐 [LOGIN] ✅ Utilisateur créé/récupéré');
        } catch (registerError) {
          // Vérifier si l'erreur est due à un utilisateur déjà existant
          const message = registerError.response?.data?.message || '';

          if (
            registerError.response?.status === 400 &&
            String(message).toLowerCase().includes('utilisateur existe')
          ) {
            debugLog('🔐 [LOGIN] ℹ️ Utilisateur existe déjà → GET /users');
            // L'utilisateur existe déjà, récupérer ses informations
            try {
              response = await userService.getUser(steamId);
              debugLog('🔐 [LOGIN] ✅ Informations utilisateur récupérées');
            } catch (getUserError) {
              throw new Error(
                "Impossible de récupérer les informations de l'utilisateur",
              );
            }
          } else {
            // Autre type d'erreur, la propager
            throw registerError;
          }
        }

        // Vérifier la validité de la réponse
        if (!response?.data) {
          throw new Error('Réponse du serveur invalide');
        }

        // Synchroniser les paramètres de notifications/auto-follow avec la réponse serveur
        const notificationSettings = response?.data?.notificationSettings;
        if (notificationSettings) {
          const {
            enabled = false,
            autoFollowNewGames = false,
            autoFollowWishlistGames = false,
          } = notificationSettings;

          await AsyncStorage.multiSet([
            ['notificationsEnabled', JSON.stringify(Boolean(enabled))],
            ['autoFollowEnabled', JSON.stringify(Boolean(autoFollowNewGames))],
            [
              'autoFollowWishlistEnabled',
              JSON.stringify(Boolean(autoFollowWishlistGames)),
            ],
          ]);
        } else {
          await AsyncStorage.multiRemove([
            'notificationsEnabled',
            'autoFollowEnabled',
            'autoFollowWishlistEnabled',
          ]);
        }

        // Sauvegarder le SteamID localement
        debugLog(
          '🔐 [LOGIN] 💾 AsyncStorage.setItem("steamId",',
          maskSteamId(steamId),
          ')',
        );
        await AsyncStorage.setItem('steamId', steamId);

        // Naviguer vers l'écran d'accueil
        debugLog('🔐 [LOGIN] 🚀 Navigation vers Home');
        if (isMountedRef.current) {
          navigation.replace('Home');
        }
        
        // Forcer le rechargement des données immédiatement après navigation
        // Cela résout la race condition où AppContext n'est pas démonté/remonté
        debugLog('🔐 [LOGIN] 🔄 Appel loadData(origine=steamAuthDelayed) pour recharger le contexte');
        // Attendre un petit délai pour que la navigation soit complète
        loadDataTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }
          loadData(false, 'steamAuthDelayed');
          debugLog('🔐 [LOGIN] ✅ Authentification et rechargement terminés\n');
        }, 100);
      } catch (error) {
        debugError('🔐 [LOGIN] ❌ Erreur authentification:', error);
        showAlert(
          'Erreur',
          error.message ||
            'Impossible de se connecter. Vérifiez que le serveur est accessible.',
        );
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [loadData, navigation],
  );

  // Gérer les URL entrantes (redirection depuis Steam)
  const handleUrl = useCallback(
    async ({url}) => {
      // Éviter de traiter plusieurs fois la même URL ou pendant un processus déjà actif
      if (processedUrls.current.has(url) || processingAuth) {
        return;
      }

      // Vérifier si c'est une URL d'authentification
      if (url?.startsWith(steamAuthService.APP_SCHEME_URL)) {
        // Marquer l'URL comme traitée
        processedUrls.current.add(url);

        if (isMountedRef.current) {
          setProcessingAuth(true);
        }

        try {
          // Extraire le SteamID de l'URL
          const steamId = url.split('steamId=')[1];

          if (steamId) {
            await handleSteamIdReceived(steamId);
          } else {
            showAlert(
              "Erreur d'authentification",
              'Impossible de récupérer votre identifiant Steam. Veuillez réessayer.',
            );
          }
        } catch (error) {
          debugError("Erreur lors du traitement de l'URL:", error);
        } finally {
          if (isMountedRef.current) {
            setProcessingAuth(false);
          }
        }
      }
    },
    [processingAuth, handleSteamIdReceived],
  );

  // Lancer l'authentification Steam
  const handleSteamLogin = useCallback(async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }

      // Obtenir l'URL d'authentification Steam
      const steamAuthUrl = steamAuthService.getAuthUrl();
      debugLog('[STEAM AUTH] Auth URL générée');

      // Ouvrir la page dans le navigateur intégré si disponible
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.open(steamAuthUrl, {
          showTitle: true,
          toolbarColor: COLORS.STEAM_DARK,
          secondaryToolbarColor: COLORS.STEAM_BLUE,
          navigationBarColor: COLORS.STEAM_DARK,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        });

        if (result?.type === 'cancel') {
          debugLog('[STEAM AUTH] Authentification annulée par l’utilisateur');
          showAlert(
            'Connexion annulée',
            'La fenêtre de connexion Steam a été fermée avant la fin du processus.',
          );
        }
      } else {
        // Fallback sur le navigateur externe
        await Linking.openURL(steamAuthUrl);
      }
    } catch (error) {
      debugError("Erreur lors du lancement de l'authentification:", error);
      showAlert(
        'Erreur',
        'Impossible de lancer la connexion Steam. Veuillez réessayer.',
      );
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Configuration de l'écouteur d'URL
  useEffect(() => {
    // Ajouter l'écouteur d'URL
    const urlListener = Linking.addEventListener('url', handleUrl);

    // Vérifier si l'application a été ouverte via une URL
    Linking.getInitialURL().then(url => {
      if (url) {
        handleUrl({url});
      }
    });

    // Nettoyer l'écouteur à la fermeture du composant
    return () => {
      urlListener.remove();
    };
  }, [handleUrl]);

  // Vérifier l'utilisateur existant au démarrage
  useEffect(() => {
    checkExistingUser();
  }, [checkExistingUser]);

  return {
    loading,
    processingAuth,
    handleSteamLogin,
    checkExistingUser,
  };
};
