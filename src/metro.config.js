const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional asset types
config.resolver.assetExts.push('tflite', 'bin', 'txt', 'json', 'pb');

// Add support for ML model files and ensure proper bundling
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure model files are included in the bundle
config.resolver.assetExts.push('json', 'bin');

// Add transformer for model files
config.transformer.minifierConfig = {
  ...config.transformer.minifierConfig,
  keep_fnames: true,
};

module.exports = config;