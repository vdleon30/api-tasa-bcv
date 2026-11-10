"""Recibe el webhook de la tasa BCV (Python 3, solo la biblioteca estándar).

Pruébalo en local: BCV_API_KEY=bcv_... python3 webhook.py
En Flask o Django, la idea es la misma: la firma se calcula sobre request.get_data() / request.body, el
cuerpo exacto, nunca sobre el JSON ya decodificado.
"""

import hashlib
import hmac
import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

# La clave de la firma es el sha256 (hex) de tu llave: la calculas tú, nunca viaja en el mensaje.
CLAVE = hashlib.sha256(os.environ["BCV_API_KEY"].encode()).hexdigest().encode()


def firma_valida(cuerpo: bytes, marca: str, firma: str) -> bool:
    esperada = "sha256=" + hmac.new(CLAVE, marca.encode() + b"." + cuerpo, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperada, firma or "") and abs(time.time() - int(marca or 0)) < 300


class Webhook(BaseHTTPRequestHandler):
    def do_POST(self):
        cuerpo = self.rfile.read(int(self.headers.get("Content-Length", 0)))

        if not firma_valida(cuerpo, self.headers.get("X-Bcv-Timestamp"), self.headers.get("X-Bcv-Signature")):
            self.send_response(401)
            self.end_headers()
            return

        tasa = json.loads(cuerpo)["data"]
        # Puede llegar repetido: guarda por par y fecha (un "upsert"), así repetirlo no cambia nada.
        print(f"Tasa {tasa['pair']} del {tasa['date']}: {tasa['rate']} ({self.headers.get('X-Bcv-Event')})")
        self.send_response(204)
        self.end_headers()


print("Esperando el webhook en http://localhost:8000")
HTTPServer(("", 8000), Webhook).serve_forever()
