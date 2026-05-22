<?php
/* ================================================================
   HCS ERP — api/controllers/planning_achats.php
   Table : planning_achats (achats matières liés aux projets planning)
   ================================================================ */

require_once __DIR__ . '/base.php';

class PlanningAchatsController extends BaseController {

    protected string $table = 'planning_achats';

    protected array $searchFields = [
        'client', 'fournisseur', 'produit', 'ref', 'statut'
    ];
}
