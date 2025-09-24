# Steam Actu - Application Mobile

Une application React Native moderne pour suivre les actualités de vos jeux Steam favoris avec notifications et gestion avancée de votre bibliothèque.

## 📱 Aperçu de l'Application

**Steam Actu** est une application mobile qui vous permet de :

- 🎮 Visualiser votre bibliothèque Steam complète
- 📰 Suivre les actualités de vos jeux préférés
- 🔔 Recevoir des notifications pour les nouveaux contenus
- 🔍 Rechercher et filtrer vos jeux
- ⚙️ Personnaliser vos préférences de notification

## 🏗️ Architecture Technique

### Stack Technologique

- **Framework** : React Native 0.78.0
- **Navigation** : React Navigation v7 (Stack Navigator)
- **État Global** : Context API avec hooks personnalisés
- **Stockage Local** : AsyncStorage
- **Requêtes HTTP** : Axios
- **Authentification** : Steam OpenID via navigateur intégré
- **Icônes** : React Native Vector Icons (Ionicons)

### Structure du Projet

```
frontend/
├── src/
│   ├── assets/           # Images et ressources statiques
│   ├── context/          # Gestion d'état global (AppContext)
│   ├── navigation/       # Configuration de navigation
│   ├── screens/          # Écrans de l'application
│   │   ├── Home/         # Écran principal avec onglets
│   │   │   └── components/  # Composants de l'écran d'accueil
│   │   ├── LoginScreen.js   # Authentification Steam
│   │   ├── NewsFeedScreen.js # Fil d'actualités
│   │   ├── SettingsScreen.js # Paramètres utilisateur
│   │   └── GameDetailsScreen.js # Détails d'un jeu
│   └── services/         # Services API et utilitaires
├── android/              # Configuration Android
├── ios/                  # Configuration iOS
└── package.json          # Dépendances et scripts
```

## 🔧 Fonctionnalités Principales

### 1. Authentification Steam OpenID

- Connexion sécurisée via Steam OpenID
- Gestion automatique des tokens de session
- Redirection native vers l'application

### 2. Gestion de Bibliothèque

- **Synchronisation automatique** avec votre bibliothèque Steam
- **Tri avancé** : alphabétique, temps de jeu, dernière activité
- **Filtres** : jeux suivis/non suivis, recherche textuelle
- **Détection de nouveaux jeux** automatique

### 3. Système de Suivi

- Suivi/désabonnement de jeux en temps réel
- Synchronisation bidirectionnelle avec le backend
- Interface utilisateur réactive avec feedback immédiat

### 4. Fil d'Actualités

- **Actualités multi-jeux** agrégées intelligemment
- **Filtre par jeux suivis** ou bibliothèque complète
- **Mise à jour en temps réel** avec pull-to-refresh
- **Navigation directe** vers Steam Store

### 5. Gestion d'État Avancée

- **Context API** centralisé pour l'état global
- **Persistance automatique** des préférences utilisateur
- **Gestion des erreurs** robuste avec retry automatique
- **Optimisations performance** avec mémorisation

## 🚀 Installation et Configuration

### Prérequis

- Node.js ≥ 18.0.0
- React Native CLI
- Android Studio (pour Android)
- Xcode (pour iOS)
- Un appareil/émulateur configuré

### Installation

1. **Cloner le projet**

   ```bash
   git clone [URL_DU_REPO]
   cd steam-actu/frontend
   ```

2. **Installer les dépendances**

   ```bash
   npm install
   ```

3. **Configuration iOS (si applicable)**

   ```bash
   bundle install
   bundle exec pod install
   ```

4. **Configuration Android**
   - Ouvrir Android Studio
   - Importer le projet `android/`
   - Synchroniser les dépendances Gradle

### Variables de Configuration

Modifier `src/services/api.js` pour configurer l'URL du backend :

```javascript
// Pour développement local
const API_URL = 'http://10.0.2.2:5000/api'; // Émulateur Android
const API_URL = 'http://localhost:5000/api'; // Simulateur iOS

// Pour production
const API_URL = 'https://votre-backend.com/api';
```

## 🏃‍♂️ Lancement de l'Application

### Développement

1. **Démarrer Metro**

   ```bash
   npm start
   ```

2. **Lancer sur Android**

   ```bash
   npm run android
   ```

3. **Lancer sur iOS**
   ```bash
   npm run ios
   ```

### Production

1. **Build Android (APK)**

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Build iOS**
   - Ouvrir `ios/SteamNews.xcworkspace` dans Xcode
   - Sélectionner le scheme de release
   - Archiver et exporter

## 🔌 Intégration Backend

L'application communique avec un backend Node.js/Express via une API REST :

### Endpoints Utilisés

- `POST /api/users/register` - Enregistrement utilisateur
- `GET /api/users/:steamId` - Informations utilisateur
- `GET /api/steam/games/:steamId` - Bibliothèque de jeux
- `POST /api/users/:steamId/follow` - Suivre un jeu
- `DELETE /api/users/:steamId/follow/:appId` - Ne plus suivre
- `GET /api/news/feed` - Fil d'actualités
- `PUT /api/users/:steamId/notifications` - Paramètres de notification

### Format des Données

Les jeux sont formatés avec les propriétés suivantes :

```javascript
{
  appid: "string",
  name: "string",
  playtime_forever: number,
  playtime_2weeks: number,
  img_icon_url: "string",
  lastUpdateTimestamp: number,
  isFollowed: boolean
}
```

## 🎨 Thème et Design

L'application utilise un thème inspiré de Steam :

- **Couleurs principales** :

  - Fond : `#171A21` (Steam Dark)
  - Cartes : `#1B2838` (Steam Blue Dark)
  - Accent : `#66C0F4` (Steam Blue)
  - Texte : `#FFFFFF` / `#8F98A0`

- **Typographie** : Police système avec variants (regular, medium, bold)
- **Icônes** : Ionicons pour la cohérence cross-platform

## 📱 Fonctionnalités Spécifiques

### Gestion des États d'Application

- **Foreground/Background** : Synchronisation automatique au retour
- **Connectivité** : Gestion des erreurs réseau avec retry
- **Performance** : Lazy loading et mémorisation des composants

### Optimisations

- **FlatList optimisée** avec `keyExtractor` et `getItemLayout`
- **Images mises en cache** automatiquement
- **Debounce sur la recherche** pour éviter les appels excessifs
- **Pagination intelligente** des actualités

### Accessibilité

- Support des lecteurs d'écran
- Contraste élevé respecté
- Tailles de police adaptatives
- Navigation au clavier (focus management)

## 🐛 Débogage

### Outils de Développement

- **Flipper** : Débogage réseau et état
- **React Native Debugger** : Inspection des composants
- **Console logs** : Journalisation détaillée des actions

### Problèmes Courants

1. **Erreur de connexion backend**

   - Vérifier l'URL dans `api.js`
   - S'assurer que le backend est démarré
   - Vérifier les paramètres réseau

2. **Authentification Steam échoue**

   - Vérifier la configuration OpenID
   - S'assurer que les redirections sont correctes

3. **Performances lentes**
   - Activer Hermes (Android)
   - Optimiser les re-renders avec `useMemo`/`useCallback`

## 📚 Scripts Disponibles

- `npm start` - Démarre Metro bundler
- `npm run android` - Lance sur Android
- `npm run ios` - Lance sur iOS
- `npm run lint` - Analyse du code avec ESLint
- `npm test` - Lance les tests Jest

## 🔄 Mise à Jour

Pour mettre à jour l'application :

1. Sauvegarder les modifications locales
2. Mettre à jour les dépendances : `npm update`
3. Nettoyer les caches : `npm start --reset-cache`
4. Rebuilder les projets natifs si nécessaire

## 🤝 Contribution

L'application suit les bonnes pratiques React Native :

- Code TypeScript/JavaScript moderne (ES6+)
- Hooks fonctionnels privilégiés
- Architecture modulaire et réutilisable
- Tests unitaires avec Jest
- Linting avec ESLint + Prettier
