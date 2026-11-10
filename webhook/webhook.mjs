// Recibe el webhook de la tasa BCV con el módulo http de Node (sin dependencias).
// Pruébalo en local: BCV_API_KEY=bcv_... node webhook.mjs
// Con Express, usa express.raw({ type: 'application/json' }) en esa ruta: la firma se calcula sobre el
// cuerpo exacto, y express.json() lo vuelve a serializar.

import crypto from 'node:crypto';
import http from 'node:http';

// La clave de la firma es el sha256 (hex) de tu llave: la calculas tú, nunca viaja en el mensaje.
const clave = crypto.createHash('sha256').update(process.env.BCV_API_KEY).digest('hex');

function firmaValida(cuerpo, marca, firma) {
  const esperada = Buffer.from('sha256=' + crypto.createHmac('sha256', clave).update(`${marca}.${cuerpo}`).digest('hex'));
  const recibida = Buffer.from(firma ?? '');

  return esperada.length === recibida.length
    && crypto.timingSafeEqual(esperada, recibida)
    && Math.abs(Date.now() / 1000 - Number(marca)) < 300;
}

http.createServer((req, res) => {
  let cuerpo = '';
  req.on('data', (parte) => (cuerpo += parte));
  req.on('end', () => {
    if (!firmaValida(cuerpo, req.headers['x-bcv-timestamp'], req.headers['x-bcv-signature'])) {
      res.writeHead(401).end();
      return;
    }

    const { data } = JSON.parse(cuerpo);
    // Puede llegar repetido: guarda por par y fecha (un "upsert"), así repetirlo no cambia nada.
    console.log(`Tasa ${data.pair} del ${data.date}: ${data.rate} (${req.headers['x-bcv-event']})`);
    res.writeHead(204).end();
  });
}).listen(8000, () => console.log('Esperando el webhook en http://localhost:8000'));
