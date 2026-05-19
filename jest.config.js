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
  coverageThreshold: {
    global: { branches: 65, functions: 75, lines: 75, statements: 75 },
    './src/services/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/hooks/': {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text-summary', 'lcov', 'html'],
  clearMocks: true,
  restoreMocks: true,
  testEnvironment: 'node',
};
