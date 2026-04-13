<?php
/* ================================================================
   HCS ERP — api/controllers/planning_atelier.php
   Table : planning_atelier (planning de production)
   ================================================================ */

require_once __DIR__ . '/base.php';

class PlanningAtelierController extends BaseController {

    protected string $table = 'planning_atelier';

    protected array $searchFields = [
        'titre', 'operateur', 'machine', 'statut', 'notes'
    ];
}
