<?php
/* ================================================================
   HCS ERP — api/controllers/devis.php
   Table : devis (devis commerciaux)
   ================================================================ */

require_once __DIR__ . '/base.php';

class DevisController extends BaseController {

    protected string $table = 'devis';

    protected array $searchFields = [
        'numero', 'client_nom', 'statut', 'objet', 'notes'
    ];
}
