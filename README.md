# Tasa BCV: ejemplos en PHP, Node y Python

Cómo traer a tu sistema la tasa oficial del Banco Central de Venezuela (dólar y euro, con su Fecha Valor) y cómo convertir montos sin perder céntimos. Los ejemplos usan la [API de la tasa BCV de Órbita](https://orbitave.com/api-tasa-bcv?utm_source=github&utm_medium=readme), pero los consejos de la sección [Lo que hay que saber de la tasa BCV](#lo-que-hay-que-saber-de-la-tasa-bcv) sirven igual si la lees tú mismo de bcv.org.ve.

Ninguno necesita dependencias: PHP con curl y bcmath, Node 18 o más nuevo, Python 3 con su biblioteca estándar.

## Probarlo

Pide tu llave por WhatsApp desde [la página de la API](https://orbitave.com/api-tasa-bcv?utm_source=github&utm_medium=readme) (los primeros 14 días son gratis) y ponla en una variable de entorno, nunca en el código:

```bash
export BCV_API_KEY=bcv_tu_llave
```

```bash
php php/tasa.php 25.50
```

```bash
node node/tasa.mjs 25.50
```

```bash
python3 python/tasa.py 25.50
```

Los tres imprimen lo mismo:

```
Tasa BCV USD/VES del 2026-11-04: 893.217300
USD 25.50 = Bs. 22777.04
```

## La petición

```bash
curl https://orbitave.com/api/v1/rates/usd-ves \
  -H "Authorization: Bearer $BCV_API_KEY"
```

```json
{
  "data": {
    "pair": "USD/VES",
    "base": "USD",
    "quote": "VES",
    "rate": "893.217300",
    "date": "2026-11-04",
    "source": "bcv",
    "fetched_at": "2026-11-03T17:12:04-04:00",
    "stale": false
  }
}
```

| Ruta | Qué devuelve |
|---|---|
| `GET /api/v1/rates/usd-ves` | Bolívares por 1 dólar. |
| `GET /api/v1/rates/eur-ves` | Bolívares por 1 euro. |
| `GET /api/v1/rates/usd-ves?date=2026-10-15` | La tasa vigente ese día (la de esa fecha o la anterior más cercana). |
| `GET /api/v1/ip` | La IP desde la que te vemos (sin llave), para registrarla. |

Sin `date`, devuelve la tasa más reciente: la de mañana en cuanto el BCV la publica. `stale: true` quiere decir que no hay tasa de hoy ni de mañana y es la última conocida.

Los errores siempre tienen la misma forma, `{"error": {"code": "...", "message": "..."}}`:

| Status | `code` | Cuándo |
|---|---|---|
| 401 | `invalid_key` | Falta la llave o no es válida. |
| 403 | `key_inactive` | La llave está revocada o su servicio no está activo. |
| 403 | `ip_not_allowed` | La consulta viene de una IP que la llave no tiene registrada. |
| 404 | `unknown_pair` | El par no existe (usa `usd-ves` o `eur-ves`). |
| 404 | `rate_not_found` | No hay tasa para esa fecha. |
| 422 | `invalid_date` | La fecha no tiene el formato `AAAA-MM-DD`. |
| 429 | `rate_limited` | Pasaste el máximo de consultas por minuto: espera lo que dice `Retry-After`. |

## Webhook: la tasa llega sola

Si registras la dirección de un endpoint de tu servidor, te mandamos un `POST` con el mismo cuerpo de arriba cada vez que hay una tasa nueva (normalmente por la tarde, cuando el BCV publica la del día siguiente). En [`webhook/`](webhook) hay un receptor en cada lenguaje que comprueba la firma:

- `X-Bcv-Signature: sha256=<hex>` es el HMAC-SHA256 de `"<X-Bcv-Timestamp>.<cuerpo>"`.
- La clave es el **sha256 (hex) de tu llave**: la calculas tú y nunca viaja en el mensaje.
- Calcúlala sobre el cuerpo exacto que llegó. Si tu framework ya decodificó el JSON (`express.json()`, `request.json`), la firma no va a coincidir.
- Descarta lo que tenga más de 5 minutos y guarda cada tasa por par y fecha: puede llegar repetida.

```bash
php -S localhost:8000 webhook/webhook.php
```

## Lo que hay que saber de la tasa BCV

Esto vale uses o no esta API:

- **La tasa de mañana sale hoy.** El BCV publica por la tarde la tasa con la *Fecha Valor* del siguiente día hábil. Si guardas la tasa con la fecha en que la consultaste, cobras con la equivocada. Guárdala con su Fecha Valor.
- **El viernes publica la del lunes.** Un sábado, la tasa vigente es la que publicó el jueves por la tarde (Fecha Valor viernes), no la del lunes. Para una fecha pasada, busca la de esa fecha o la anterior más cercana.
- **Nunca uses float.** `893.2173 * 25.5` en punto flotante puede darte un céntimo de más o de menos. Usa `bcmath` en PHP, `Decimal` en Python, enteros (`BigInt`) en JavaScript o el tipo `DECIMAL` de tu base de datos. Por eso `rate` llega como texto.
- **La página del BCV usa coma decimal y punto de miles** (`1.234,56`). Si la lees tú mismo, quita los puntos antes de cambiar la coma.
- **Guárdala en caché.** Cambia una vez al día: con consultarla cada hora alcanza, no en cada venta.
- **La llave solo vive en tu servidor.** En el navegador o en una app móvil cualquiera puede verla.

## Licencia

MIT. Úsalo como quieras.
