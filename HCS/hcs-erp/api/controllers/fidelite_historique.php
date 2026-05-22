<?php
/* ================================================================
   HCS ERP — api/controllers/fidelite_historique.php
   Table : fidelite_historique (historique des points par commande)
   ================================================================ */

require_once __DIR__ . '/base.php';

class FideliteHistoriqueController extends BaseController {

    protected string $table = 'fidelite_historique';

    protected array $searchFields = [
        'client_email', 'order_id', 'tier_at_time', 'reason'
    ];
}
