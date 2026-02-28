const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .sql extension for Drizzle ORM migration files
config.resolver.sourceExts.push('sql');

module.exports = config;
