<?php
/* ================================================================
   HCS ERP — api/controllers/bonsAchat.php
   Table : bons_achat (bons de commande fournisseurs + réservations)
   ================================================================ */

require_once __DIR__ . '/base.php';

class BonsAchatController extends BaseController {

    protected string $table = 'bons_achat';

    protected array $searchFields = [
        'ref', 'fournisseur', 'statut', 'notes', 'devis_origine_ref'
    ];
}
