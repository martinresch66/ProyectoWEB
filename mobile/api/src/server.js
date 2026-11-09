import os from 'node:os';

import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.port;

/** IPs de la PC en la red local (las que usa el celular para conectarse). */
function localIps() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

// 0.0.0.0 = escuchar en todas las interfaces, para que el celular pueda conectarse por Wi-Fi.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de convenios escuchando en el puerto ${PORT}`);
  console.log(`  Local:   http://localhost:${PORT}/api/health`);
  for (const ip of localIps()) console.log(`  En red:  http://${ip}:${PORT}/api/health`);
});
