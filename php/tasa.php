<?php

// La tasa oficial del BCV y un monto en dólares pasado a bolívares.
// Uso: BCV_API_KEY=bcv_... php tasa.php 25.50

const API = 'https://__DOMINIO__/api/v1';

function tasaBcv(string $par = 'usd-ves', ?string $fecha = null): array
{
    $url = API.'/rates/'.$par.($fecha ? '?date='.$fecha : '');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer '.getenv('BCV_API_KEY')],
    ]);
    $cuerpo = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

    if ($cuerpo === false) {
        throw new RuntimeException('Sin respuesta: '.curl_error($ch));
    }

    $json = json_decode($cuerpo, true);

    if ($status !== 200) {
        // {"error": {"code": "invalid_key", "message": "..."}}
        throw new RuntimeException("{$status} {$json['error']['code']}: {$json['error']['message']}");
    }

    return $json['data'];
}

$tasa = tasaBcv();
$dolares = $argv[1] ?? '1';

// rate llega como texto con 6 decimales: multiplícalo con bcmath, nunca como float.
$bolivares = bcadd(bcmul($dolares, $tasa['rate'], 6), '0.005', 2); // redondeado a céntimos

echo "Tasa BCV {$tasa['pair']} del {$tasa['date']}: {$tasa['rate']}", PHP_EOL;
echo "USD {$dolares} = Bs. {$bolivares}", PHP_EOL;

if ($tasa['stale'] ?? false) {
    echo 'Ojo: no hay tasa de hoy; es la última que publicó el BCV.', PHP_EOL;
}
