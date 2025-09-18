import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import {steamAuthService, userService} from '../services/api';

const LoginScreen = ({navigation}) => {
  const [loading, setLoading] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);
  const processedUrls = useRef(new Set());

  // Vérifie si un SteamID est déjà enregistré au démarrage
  useEffect(() => {
    const checkExistingUser = async () => {
      try {
        const savedSteamId = await AsyncStorage.getItem('steamId');
        if (savedSteamId) {
          // Utilisateur trouvé, naviguer vers l'écran d'accueil
          navigation.replace('Home');
        }
      } catch (error) {
        console.error(
          "Erreur lors de la vérification de l'utilisateur:",
          error,
        );
      }
    };

    checkExistingUser();
  }, [navigation]);

  // Configuration de l'écouteur d'URL pour intercepter la redirection depuis Steam
  useEffect(() => {
    // Fonction pour gérer les URL entrantes
    const handleUrl = async ({url}) => {
      console.log('URL interceptée:', url);

      // Éviter de traiter plusieurs fois la même URL ou de traiter pendant un processus déjà actif
      if (processedUrls.current.has(url) || processingAuth) {
        console.log('URL déjà traitée ou authentification en cours, ignorée');
        return;
      }

      // Vérifier si c'est une URL d'authentification
      if (url && url.startsWith(steamAuthService.APP_SCHEME_URL)) {
        // Marquer l'URL comme traitée
        processedUrls.current.add(url);

        // Activer le flag d'authentification en cours
        setProcessingAuth(true);

        try {
          // Extraire le SteamID de l'URL en utilisant une méthode compatible avec React Native
          const steamId = url.split('steamId=')[1];

          if (steamId) {
            console.log('SteamID récupéré:', steamId);
            await handleSteamIdReceived(steamId);
          } else {
            console.error("SteamID non trouvé dans l'URL");
            Alert.alert(
              "Erreur d'authentification",
              'Impossible de récupérer votre identifiant Steam. Veuillez réessayer.',
            );
          }
        } catch (error) {
          console.error("Erreur lors du traitement de l'URL:", error);
        } finally {
          // Désactiver le flag d'authentification en cours
          setProcessingAuth(false);
        }
      }
    };

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
  }, []); // Supprimer la dépendance navigation

  // Fonction pour gérer un SteamID reçu
  const handleSteamIdReceived = async steamId => {
    try {
      setLoading(true);

      // Enregistrer l'utilisateur sur le serveur
      let response;
      try {
        console.log("Tentative d'enregistrement du SteamID:", steamId);
        response = await userService.register(steamId);
        console.log('Enregistrement réussi avec réponse:', response.data);
      } catch (registerError) {
        console.log("Erreur lors de l'enregistrement:", registerError.message);

        // Vérifier si l'erreur est due à un utilisateur déjà existant
        if (
          registerError.response &&
          registerError.response.status === 400 &&
          registerError.response.data.message === 'Cet utilisateur existe déjà'
        ) {
          console.log(
            'Utilisateur déjà existant, tentative de récupération des données...',
          );
          // L'utilisateur existe déjà, essayons de récupérer ses informations
          try {
            response = await userService.getUser(steamId);
            console.log(
              'Récupération des données utilisateur réussie:',
              response.data,
            );
          } catch (getUserError) {
            throw new Error(
              "Impossible de récupérer les informations de l'utilisateur",
            );
          }
        } else {
          // Autre type d'erreur, on la propage
          throw registerError;
        }
      }

      // À ce stade, nous avons soit créé un nouvel utilisateur, soit récupéré un existant
      if (!response || !response.data) {
        throw new Error('Réponse du serveur invalide');
      }

      // Sauvegarder le SteamID localement
      console.log('Enregistrement du SteamID dans AsyncStorage:', steamId);
      await AsyncStorage.setItem('steamId', steamId);

      console.log("Navigation vers l'écran d'accueil...");
      // Naviguer vers l'écran d'accueil
      navigation.replace('Home');
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      Alert.alert(
        'Erreur',
        error.message ||
          'Impossible de se connecter. Vérifiez que le serveur est accessible.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour ouvrir la page de connexion Steam
  const handleSteamLogin = async () => {
    try {
      setLoading(true);

      // Obtenir l'URL d'authentification Steam
      const steamAuthUrl = steamAuthService.getAuthUrl();
      console.log("URL d'authentification Steam:", steamAuthUrl);

      // Ouvrir la page dans le navigateur intégré si disponible
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(steamAuthUrl, {
          // Options du navigateur
          showTitle: true,
          toolbarColor: '#171A21',
          secondaryToolbarColor: '#66C0F4',
          navigationBarColor: '#171A21',
          enableUrlBarHiding: true,
          enableDefaultShare: false,
        });
      } else {
        // Fallback sur le navigateur externe
        Linking.openURL(steamAuthUrl);
      }
    } catch (error) {
      console.error('Erreur lors de la connexion Steam:', error);
      Alert.alert(
        'Erreur',
        'Impossible de lancer la connexion Steam. Veuillez réessayer.',
      );
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/steam-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Steam Actu & Notif</Text>
      <Text style={styles.subtitle}>
        Restez informé des dernières actualités de vos jeux Steam
      </Text>

      <TouchableOpacity
        style={styles.steamLoginButton}
        onPress={handleSteamLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.steamLoginButtonText}>
            Se connecter avec Steam
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171A21',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8F98A0',
    marginBottom: 40,
    textAlign: 'center',
  },
  steamLoginButton: {
    backgroundColor: '#1b2838',
    borderRadius: 4,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#66C0F4',
  },
  steamLoginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#8F98A0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default LoginScreen;
