<?php
/* ================================================================
   HCS ERP — api/config.php
   Charge les credentials MySQL et clé API depuis api/.env (non tracké).
   Le fichier .env doit exister sur le serveur Planet Hoster avec :

     DB_PASS=...
     API_KEY=...

   Les autres valeurs ont des défauts safe (pas de secrets).
   ================================================================ */

/* ── Loader .env minimaliste ─────────────────────────────── */
$_envFile = __DIR__ . '/.env';
if (file_exists($_envFile)) {
    foreach (file($_envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $_line) {
        $_trim = ltrim($_line);
        if ($_trim === '' || $_trim[0] === '#') continue;
        if (!str_contains($_line, '=')) continue;
        [$_k, $_v] = explode('=', $_line, 2);
        $_k = trim($_k);
        $_v = trim($_v, " \t\r\n\"'");
        if ($_k !== '' && getenv($_k) === false) putenv("$_k=$_v");
    }
}
$_env = function ($k, $default = null) {
    $v = getenv($k);
    return ($v === false || $v === '') ? $default : $v;
};

/* ── Constantes (DB_HOST/USER/NAME ont des défauts safe) ── */
define('DB_HOST', $_env('DB_HOST', 'localhost'));
define('DB_PORT', (int) $_env('DB_PORT', '3306'));
define('DB_NAME', $_env('DB_NAME', 'highftqb_HCS_ERP'));
define('DB_USER', $_env('DB_USER', 'highftqb_ERP'));
define('DB_PASS', $_env('DB_PASS'));
define('API_KEY', $_env('API_KEY'));

/* ── Validation : DB_PASS et API_KEY OBLIGATOIRES ────────── */
if (DB_PASS === null || API_KEY === null) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error'  => 'Configuration API incomplete',
        'detail' => 'Le fichier api/.env est manquant ou ne contient pas DB_PASS et API_KEY'
    ]);
    exit;
}

/* ── Fuseau horaire Polynésie française (UTC-10) ─────────── */
date_default_timezone_set('Pacific/Tahiti');
