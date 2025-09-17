module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context)/)',
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};