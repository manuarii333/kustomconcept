<?php
/* ================================================================
   HCS ERP — api/controllers/produits.php
   Table : produits (catalogue textile, DTF, sublimation…)
   ================================================================ */

require_once __DIR__ . '/base.php';

class ProduitsController extends BaseController {

    protected string $table = 'produits';

    protected array $searchFields = [
        'nom', 'sku', 'categorie', 'description'
    ];
}
