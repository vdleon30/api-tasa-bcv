<?php

// Recibe el webhook de la tasa BCV: comprueba la firma y guarda la tasa.
// Pruébalo en local: BCV_API_KEY=bcv_... php -S localhost:8000 webhook.php

$cuerpo = file_get_contents('php://input'); // el cuerpo exacto, sin volver a serializar el JSON
$marca = $_SERVER['HTTP_X_BCV_TIMESTAMP'] ?? '';
$firma = $_SERVER['HTTP_X_BCV_SIGNATURE'] ?? '';

// La clave de la firma es el sha256 (hex) de tu llave: la calculas tú, nunca viaja en el mensaje.
$clave = hash('sha256', getenv('BCV_API_KEY'));
$esperada = 'sha256='.hash_hmac('sha256', $marca.'.'.$cuerpo, $clave);

if (! hash_equals($esperada, $firma) || abs(time() - (int) $marca) > 300) {
    http_response_code(401);
    exit;
}

$tasa = json_decode($cuerpo, true)['data'];

// Puede llegar repetido: guarda por par y fecha (un "upsert"), así repetirlo no cambia nada.
// Por ejemplo: INSERT ... ON DUPLICATE KEY UPDATE rate = VALUES(rate)
error_log("Tasa {$tasa['pair']} del {$tasa['date']}: {$tasa['rate']} ({$_SERVER['HTTP_X_BCV_EVENT']})");

http_response_code(204);
