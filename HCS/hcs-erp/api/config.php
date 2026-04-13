<?php
/* ================================================================
   HCS ERP — api/config.php
   Configuration base de données MySQL Planet Hoster
   ⚠️  Ne jamais committer avec le vrai mot de passe en production
   ================================================================ */

define('DB_HOST', 'localhost');
define('DB_NAME', 'highftqb_hcs_erp');
define('DB_USER', 'highftqb_erp');
define('DB_PASS', 'MOT_DE_PASSE_ICI');

/* Clé API partagée entre l'ERP front et ce backend PHP */
define('API_KEY', 'hcs-erp-2026');

/* Fuseau horaire Polynésie française (UTC-10) */
date_default_timezone_set('Pacific/Tahiti');
