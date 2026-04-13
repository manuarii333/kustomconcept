<?php
/* ================================================================
   HCS ERP — api/controllers/factures.php
   Table : factures (facturation clients)
   ================================================================ */

require_once __DIR__ . '/base.php';

class FacturesController extends BaseController {

    protected string $table = 'factures';

    protected array $searchFields = [
        'numero', 'client_nom', 'statut', 'description', 'notes'
    ];
}
