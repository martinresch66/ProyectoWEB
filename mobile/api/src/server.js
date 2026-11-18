import os from 'node:os';

import { app } from './app.js';
import { env } from './config/env.js';
import { explicarErrorMysql } from './middlewares/sincronizarDatos.js';

const PORT = env.port;

/** IPs de la PC en la red local (las que usa el celular para conectarse). */
function localIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

/** Muestra de dónde salen los datos y, con MySQL, prueba la conexión al iniciar. */
async function mostrarFuenteDeDatos() {
  if (env.fuenteDatos !== 'mysql') {
    console.log('  Datos:   de prueba, en memoria (DATA_SOURCE=memoria)');
    return;
  }
  const { database, host, port } = env.mysql;
  try {
    const { leerBase } = await import('./data/mysql.js');
    const tablas = await leerBase();
    console.log(`  Datos:   MySQL "${database}" en ${host}:${port} (${tablas.convenios.length} convenios, ${tablas.usuarios.length} usuarios)`);
  } catch (error) {
    console.error(`  Datos:   ⚠ MySQL "${database}" no disponible. ${explicarErrorMysql(error)}`);
  }
}

// 0.0.0.0 = escuchar en todas las interfaces, para que el celular pueda conectarse por Wi-Fi.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de convenios escuchando en el puerto ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}/api/health`);
  for (const ip of localIps()) console.log(`  En red:  http://${ip}:${PORT}/api/health`);
  mostrarFuenteDeDatos();
});