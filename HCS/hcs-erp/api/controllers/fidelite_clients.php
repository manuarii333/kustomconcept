<?php
/* ================================================================
   HCS ERP — api/controllers/fidelite_clients.php
   Table : fidelite_clients (programme fidélité — soldes clients)
   ================================================================ */

require_once __DIR__ . '/base.php';

class FideliteClientsController extends BaseController {

    protected string $table = 'fidelite_clients';

    protected array $searchFields = [
        'email', 'name', 'tier'
    ];
}
