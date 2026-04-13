<?php
/* ================================================================
   HCS ERP — api/controllers/logos.php
   Table : logos (bibliothèque logos clients)
   ================================================================ */

require_once __DIR__ . '/base.php';

class LogosController extends BaseController {

    protected string $table = 'logos';

    protected array $searchFields = [
        'nom', 'client_nom', 'format', 'tags', 'notes'
    ];
}
