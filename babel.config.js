module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // add 'nativewind/babel' here only if you actively use NativeWind
    'react-native-reanimated/plugin', // must be last
  ],
};