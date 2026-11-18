// La API simulada (mobile/api) es un proyecto de Node aparte: Metro no tiene que vigilarla ni empaquetarla.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Escapa la ruta para usarla en una expresión regular y acepta / o \ como separador (Windows).
const carpetaApi = path
  .resolve(__dirname, 'api')
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  .replace(/\\\\|\//g, '[\\\\/]');
config.resolver.blockList = [new RegExp(`^${carpetaApi}[\\\\/].*`)];

module.exports = config;
