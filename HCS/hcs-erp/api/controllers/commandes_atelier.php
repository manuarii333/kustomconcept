<?php
/* ================================================================
   HCS ERP — api/controllers/commandes_atelier.php
   Table : commandes_atelier (ordres de fabrication atelier)
   ================================================================ */

require_once __DIR__ . '/base.php';

class CommandesAtelierController extends BaseController {

    protected string $table = 'commandes_atelier';

    protected array $searchFields = [
        'reference', 'client_nom', 'type_impression',
        'statut', 'operateur', 'notes'
    ];
}
