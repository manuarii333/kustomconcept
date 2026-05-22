<?php
/* ================================================================
   HCS ERP — api/controllers/taches_agents.php
   Table : taches_agents (tâches générées par les agents IA)
   ================================================================ */

require_once __DIR__ . '/base.php';

class TachesAgentsController extends BaseController {

    protected string $table = 'taches_agents';

    protected array $searchFields = [
        'titre', 'description', 'agent_nom', 'statut', 'priorite', 'source'
    ];
}
