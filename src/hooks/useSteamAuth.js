import AsyncStorage from '@react-native-async-storage/async-storage';
import {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, Linking} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {COLORS} from '../constants/theme';
import {steamAuthService, userService} from '../services/api';

/**
 * Hook personnalisé pour la gestion de l'authentification Steam
 * Centralise toute la logique d'authentification et de gestion des URL
 */
export const useSteamAuth = navigation => {
  const [loading, setLoading] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);
  const processedUrls = useRef(new Set());

  // Vérifier si un utilisateur est déjà connecté
  const checkExistingUser = useCallback(async () => {
    try {
      const savedSteamId = await AsyncStorage.getItem('steamId');
      if (savedSteamId) {
        navigation.replace('Home');
        return true;
      }
      return false;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'utilisateur existant:",
        error,
      );
      return false;
    }
  }, [navigation]);

  // Gérer la réception d'un SteamID après authentification
  const handleSteamIdReceived = useCallback(
    async steamId => {
      try {
        setLoading(true);

        // Enregistrer l'utilisateur sur le serveur
        let response;
        try {
          response = await userService.register(steamId);
        } catch (registerError) {
          // Vérifier si l'erreur est due à un utilisateur déjà existant
          const message = registerError.response?.data?.message || '';

          if (
            registerError.response?.status === 400 &&
            String(message).toLowerCase().includes('utilisateur existe')
          ) {
            // L'utilisateur existe déjà, récupérer ses informations
            try {
              response = await userService.getUser(steamId);
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

        // Sauvegarder le SteamID localement
        await AsyncStorage.setItem('steamId', steamId);

        // Naviguer vers l'écran d'accueil
        navigation.replace('Home');
      } catch (error) {
        console.error("Erreur lors de l'authentification:", error);
        Alert.alert(
          'Erreur',
          error.message ||
            'Impossible de se connecter. Vérifiez que le serveur est accessible.',
        );
      } finally {
        setLoading(false);
      }
    },
    [navigation],
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
        setProcessingAuth(true);

        try {
          // Extraire le SteamID de l'URL
          const steamId = url.split('steamId=')[1];

          if (steamId) {
            await handleSteamIdReceived(steamId);
          } else {
            Alert.alert(
              "Erreur d'authentification",
              'Impossible de récupérer votre identifiant Steam. Veuillez réessayer.',
            );
          }
        } catch (error) {
          console.error("Erreur lors du traitement de l'URL:", error);
        } finally {
          setProcessingAuth(false);
        }
      }
    },
    [processingAuth, handleSteamIdReceived],
  );

  // Lancer l'authentification Steam
  const handleSteamLogin = useCallback(async () => {
    try {
      setLoading(true);

      // Obtenir l'URL d'authentification Steam
      const steamAuthUrl = steamAuthService.getAuthUrl();

      // Ouvrir la page dans le navigateur intégré si disponible
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(steamAuthUrl, {
          showTitle: true,
          toolbarColor: COLORS.STEAM_DARK,
          secondaryToolbarColor: COLORS.STEAM_BLUE,
          navigationBarColor: COLORS.STEAM_DARK,
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        });
      } else {
        // Fallback sur le navigateur externe
        Linking.openURL(steamAuthUrl);
      }
    } catch (error) {
      console.error("Erreur lors du lancement de l'authentification:", error);
      Alert.alert(
        'Erreur',
        'Impossible de lancer la connexion Steam. Veuillez réessayer.',
      );
      setLoading(false);
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
