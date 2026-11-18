// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // api/ es la API de Node (tiene su propia configuración).
    ignores: ['dist/*', 'api/*'],
  },
]);
