import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {userService} from '../services/api';

const LoginScreen = ({navigation}) => {
  const [steamId, setSteamId] = useState('');
  const [loading, setLoading] = useState(false);

  // Vérifie si un SteamID est déjà enregistré au démarrage
  React.useEffect(() => {
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

  // Fonction pour gérer la connexion
  const handleLogin = async () => {
    if (!steamId.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre SteamID');
      return;
    }

    setLoading(true);

    try {
      // Enregistrer l'utilisateur sur le serveur
      const response = await userService.register(steamId);

      // Sauvegarder le SteamID localement
      await AsyncStorage.setItem('steamId', steamId);

      // Naviguer vers l'écran d'accueil
      navigation.replace('Home');
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);

      // Vérifier si l'erreur est due à un utilisateur déjà existant
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data.message === 'Cet utilisateur existe déjà'
      ) {
        // Simplement sauvegarder le SteamID et naviguer
        await AsyncStorage.setItem('steamId', steamId);
        navigation.replace('Home');
      } else {
        Alert.alert(
          'Erreur de connexion',
          "Impossible de se connecter avec ce SteamID. Vérifiez qu'il est correct.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Aide pour trouver son SteamID
  const openSteamIdHelp = () => {
    Linking.openURL('https://help.steampowered.com/en/wizard/HelpWithSteamID');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/steam-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Steam Notifications</Text>
      <Text style={styles.subtitle}>
        Restez informé des dernières actualités de vos jeux Steam
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Entrez votre SteamID</Text>
        <TextInput
          style={styles.input}
          value={steamId}
          onChangeText={setSteamId}
          placeholder="Votre SteamID (ex: 76561198xxxxxxxxx)"
          placeholderTextColor="#8F98A0"
          keyboardType="numeric"
          autoCorrect={false}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={openSteamIdHelp} style={styles.helpLink}>
          <Text style={styles.helpText}>Comment trouver mon SteamID ?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.loginButtonText}>Se connecter</Text>
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
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2A3F5A',
    borderRadius: 4,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    width: '100%',
  },
  helpLink: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  helpText: {
    color: '#66C0F4',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#66C0F4',
    borderRadius: 4,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
