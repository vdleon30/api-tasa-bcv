// La tasa oficial del BCV y un monto en dólares pasado a bolívares (Node 18 o más nuevo, sin dependencias).
// Uso: BCV_API_KEY=bcv_... node tasa.mjs 25.50

const API = 'https://__DOMINIO__/api/v1';

export async function tasaBcv(par = 'usd-ves', fecha = null) {
  const url = `${API}/rates/${par}${fecha ? `?date=${fecha}` : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.BCV_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  });
  const json = await res.json();

  if (!res.ok) {
    // {"error": {"code": "invalid_key", "message": "..."}}
    throw new Error(`${res.status} ${json.error.code}: ${json.error.message}`);
  }

  return json.data;
}

// rate llega como texto con 6 decimales. Para no perder céntimos con float, se multiplica en enteros
// (BigInt): dólares en céntimos × tasa en millonésimas, y se redondea a céntimos de bolívar.
function aBolivares(dolares, rate) {
  const centimos = BigInt(Math.round(Number(dolares) * 100));
  const millonesimas = BigInt(rate.replace('.', ''));
  const total = (centimos * millonesimas + 500_000n) / 1_000_000n; // céntimos de bolívar, redondeado

  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`;
}

const tasa = await tasaBcv();
const dolares = process.argv[2] ?? '1';

console.log(`Tasa BCV ${tasa.pair} del ${tasa.date}: ${tasa.rate}`);
console.log(`USD ${dolares} = Bs. ${aBolivares(dolares, tasa.rate)}`);

if (tasa.stale) {
  console.log('Ojo: no hay tasa de hoy; es la última que publicó el BCV.');
}
