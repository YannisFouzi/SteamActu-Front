require('@testing-library/jest-native/extend-expect');

// --- AsyncStorage : mock officiel fourni par le package ---
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// --- react-native-keychain : store en memoire avec namespacing par service ---
// Reproduit l'API getGenericPassword/setGenericPassword/resetGenericPassword
// sans dependance native. Le state est partage entre tests, reset() expose
// pour les beforeEach.
jest.mock('react-native-keychain', () => {
  const store = new Map(); // service -> { username, password }
  return {
    __esModule: true,
    ACCESSIBLE: {
      WHEN_UNLOCKED: 'WHEN_UNLOCKED',
      AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
      ALWAYS: 'ALWAYS',
    },
    setGenericPassword: jest.fn(async (username, password, options = {}) => {
      const service = options.service || 'default';
      store.set(service, {username, password});
      return {service, storage: 'keychain'};
    }),
    getGenericPassword: jest.fn(async (options = {}) => {
      const service = options.service || 'default';
      const entry = store.get(service);
      if (!entry) {
        return false;
      }
      return {
        service,
        username: entry.username,
        password: entry.password,
        storage: 'keychain',
      };
    }),
    resetGenericPassword: jest.fn(async (options = {}) => {
      const service = options.service || 'default';
      return store.delete(service);
    }),
    hasGenericPassword: jest.fn(async (options = {}) => {
      const service = options.service || 'default';
      return store.has(service);
    }),
    // Helper test-only pour reset complet du store
    __resetMock: () => store.clear(),
  };
});

// --- react-native-localize : par défaut langue "fr" ---
jest.mock('react-native-localize', () => ({
  findBestLanguageTag: () => ({ languageTag: 'fr-FR', isRTL: false }),
  getLocales: () => [
    { countryCode: 'FR', languageTag: 'fr-FR', languageCode: 'fr', isRTL: false },
  ],
  getNumberFormatSettings: () => ({
    decimalSeparator: ',',
    groupingSeparator: ' ',
  }),
  getCalendar: () => 'gregorian',
  getCountry: () => 'FR',
  getCurrencies: () => ['EUR'],
  getTemperatureUnit: () => 'celsius',
  getTimeZone: () => 'Europe/Paris',
  uses24HourClock: () => true,
  usesMetricSystem: () => true,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// --- Firebase Messaging ---
jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
    onMessage: jest.fn(() => () => {}),
    onTokenRefresh: jest.fn(() => () => {}),
    setBackgroundMessageHandler: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue(1),
    hasPermission: jest.fn().mockResolvedValue(1),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onNotificationOpenedApp: jest.fn(() => () => {}),
    deleteToken: jest.fn().mockResolvedValue(),
    subscribeToTopic: jest.fn().mockResolvedValue(),
  });
  messaging.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };
  return { __esModule: true, default: messaging };
});

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    apps: [{ name: '[DEFAULT]' }],
    initializeApp: jest.fn(),
  },
}));

// --- Notifee ---
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn().mockResolvedValue('notif-id'),
    cancelNotification: jest.fn().mockResolvedValue(),
    cancelAllNotifications: jest.fn().mockResolvedValue(),
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    setBadgeCount: jest.fn().mockResolvedValue(),
    getBadgeCount: jest.fn().mockResolvedValue(0),
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2 },
  AndroidStyle: { BIGPICTURE: 1, BIGTEXT: 2 },
  AndroidVisibility: { PUBLIC: 1, PRIVATE: 0 },
  EventType: {
    DELIVERED: 3,
    PRESS: 1,
    ACTION_PRESS: 2,
    DISMISSED: 0,
    UNKNOWN: -1,
  },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

// --- NetInfo ---
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    }),
    addEventListener: jest.fn(() => () => {}),
    useNetInfo: () => ({ isConnected: true }),
  },
  fetch: jest.fn().mockResolvedValue({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  }),
  addEventListener: jest.fn(() => () => {}),
  useNetInfo: () => ({ isConnected: true }),
}));

// --- Sentry no-op + wrap = identity ---
jest.mock('@sentry/react-native', () => {
  const noop = () => {};
  return {
    init: noop,
    wrap: (component) => component,
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    withScope: (fn) => fn({ setTag: noop, setExtra: noop }),
    ReactNativeTracing: function () {
      return { setTransaction: noop };
    },
    Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
    Native: {},
  };
});

// --- react-native-fast-image : composant noop ---
jest.mock('react-native-fast-image', () => {
  const React = require('react');
  const FastImage = (props) =>
    React.createElement('FastImage', props, props.children);
  FastImage.resizeMode = { contain: 'contain', cover: 'cover', stretch: 'stretch' };
  FastImage.priority = { low: 'low', normal: 'normal', high: 'high' };
  FastImage.cacheControl = { immutable: 'immutable', web: 'web', cacheOnly: 'cacheOnly' };
  return { __esModule: true, default: FastImage };
});

// --- react-native-linear-gradient ---
jest.mock('react-native-linear-gradient', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props) =>
      React.createElement('LinearGradient', props, props.children),
  };
});

// --- react-native-vector-icons ---
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/Feather', () => 'Icon');

// --- react-native-bootsplash ---
jest.mock('react-native-bootsplash', () => ({
  hide: jest.fn().mockResolvedValue(),
  isVisible: jest.fn().mockResolvedValue(false),
  useHideAnimation: () => ({
    container: { onLayout: jest.fn() },
    logo: { source: 0 },
  }),
}));

// --- react-native-inappbrowser-reborn ---
jest.mock('react-native-inappbrowser-reborn', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn().mockResolvedValue(true),
    open: jest.fn().mockResolvedValue({ type: 'cancel' }),
    openAuth: jest.fn().mockResolvedValue({ type: 'success', url: '' }),
    close: jest.fn(),
    closeAuth: jest.fn(),
  },
}));

// --- react-native-screens / gesture handler / reanimated already handled by RN preset ---

// Silence du log natif Animated et logger console pendant les tests
jest.spyOn(console, 'warn').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation((...args) => {
  // Laisser passer les vrais erreurs React (ex. PropTypes), masquer le bruit RN
  const msg = String(args[0] ?? '');
  if (msg.includes('useNativeDriver') || msg.includes('Animated')) {
    return;
  }
  // Imprimer quand même pour aider au debug
  if (process.env.JEST_VERBOSE) {
    console.info('[stderr]', ...args);
  }
});
