const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('ogg');
config.transformer.babelTransformerPath = require.resolve('./theme-transformer');

module.exports = config;
