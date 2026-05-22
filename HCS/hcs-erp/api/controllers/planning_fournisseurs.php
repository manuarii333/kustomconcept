<?php
/* ================================================================
   HCS ERP — api/controllers/planning_fournisseurs.php
   Table : planning_fournisseurs (fournisseurs du planning production)
   ================================================================ */

require_once __DIR__ . '/base.php';

class PlanningFournisseursController extends BaseController {

    protected string $table = 'planning_fournisseurs';

    protected array $searchFields = [
        'nom', 'type', 'email', 'produits', 'pays', 'telephone'
    ];
}
