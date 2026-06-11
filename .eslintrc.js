module.exports = {
  root: true,
  extends: ['@react-native'],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    'assets/bootsplash/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
  ],
  overrides: [
    {
      // Setup Jest à la racine : non matché par les globs de test du preset
      // @react-native, donc le global `jest` y était signalé non défini.
      files: ['jest.setup.js'],
      env: {jest: true},
    },
  ],
};
