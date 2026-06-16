module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?@?react-native|@react-navigation|@notifee|@react-native-firebase|react-native-.*|@sentry/react-native|i18next|react-i18next|url-parse)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.styles.js',
    '!src/i18n/**',
    '!src/assets/**',
    '!src/feedback/index.js',
  ],
  // Seuils alignés sur la couverture réelle (juin 2026), avec ~2 pts de marge.
  // Le projet teste unitairement les COUCHES LOGIQUES (services, hooks, utils) ;
  // les écrans/composants React Native ne sont pas testés unitairement → la
  // couverture GLOBALE (sur tout `src`) est volontairement basse (~22%). Les
  // gardes qui comptent sont sur `services/` et `hooks/`. Cibles à remonter en
  // ajoutant des tests (services/hooks → 80%, global → en testant l'UI).
  coverageThreshold: {
    global: { branches: 20, functions: 20, lines: 20, statements: 20 },
    './src/services/': {
      branches: 68,
      functions: 75,
      lines: 76,
      statements: 76,
    },
    './src/hooks/': {
      branches: 22,
      functions: 28,
      lines: 30,
      statements: 30,
    },
  },
  coverageReporters: ['text-summary', 'lcov', 'html'],
  clearMocks: true,
  restoreMocks: true,
  testEnvironment: 'node',
};
