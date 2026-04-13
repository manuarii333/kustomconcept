<?php
/* ================================================================
   HCS ERP — api/controllers/commandes.php
   Table : commandes (bons de commande clients)
   ================================================================ */

require_once __DIR__ . '/base.php';

class CommandesController extends BaseController {

    protected string $table = 'commandes';

    protected array $searchFields = [
        'numero', 'client_nom', 'statut', 'description', 'notes'
    ];
}
