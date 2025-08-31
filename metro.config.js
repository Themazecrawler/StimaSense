const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// Ensure Metro treats TensorFlow weight binaries as assets
defaultConfig.resolver.assetExts = [
  ...defaultConfig.resolver.assetExts,
  'bin',
];

const config = defaultConfig;

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
