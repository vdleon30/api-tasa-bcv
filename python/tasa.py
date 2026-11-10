"""La tasa oficial del BCV y un monto en dólares pasado a bolívares (Python 3, solo la biblioteca estándar).

Uso: BCV_API_KEY=bcv_... python3 tasa.py 25.50
"""

import json
import os
import sys
import urllib.error
import urllib.request
from decimal import ROUND_HALF_UP, Decimal

API = "https://orbitave.com/api/v1"


def tasa_bcv(par="usd-ves", fecha=None):
    url = f"{API}/rates/{par}" + (f"?date={fecha}" if fecha else "")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {os.environ['BCV_API_KEY']}"})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return json.load(res)["data"]
    except urllib.error.HTTPError as e:
        # {"error": {"code": "invalid_key", "message": "..."}}
        error = json.load(e)["error"]
        raise RuntimeError(f"{e.code} {error['code']}: {error['message']}") from None


tasa = tasa_bcv()
dolares = Decimal(sys.argv[1] if len(sys.argv) > 1 else "1")

# rate llega como texto con 6 decimales: Decimal, nunca float.
bolivares = (dolares * Decimal(tasa["rate"])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

print(f"Tasa BCV {tasa['pair']} del {tasa['date']}: {tasa['rate']}")
print(f"USD {dolares} = Bs. {bolivares}")

if tasa.get("stale"):
    print("Ojo: no hay tasa de hoy; es la última que publicó el BCV.")
