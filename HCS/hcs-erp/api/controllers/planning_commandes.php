<?php
/* ================================================================
   HCS ERP — api/controllers/planning_commandes.php
   Table : planning_commandes (cartes Kanban du planning production)
   ================================================================ */

require_once __DIR__ . '/base.php';

class PlanningCommandesController extends BaseController {

    protected string $table = 'planning_commandes';

    protected array $searchFields = [
        'client', 'ref', 'desc', 'type', 'col', 'machine', 'priority'
    ];
}
