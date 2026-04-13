<?php
/* ================================================================
   HCS ERP — api/controllers/conges.php
   Table : conges (gestion des congés et absences)
   ================================================================ */

require_once __DIR__ . '/base.php';

class CongesController extends BaseController {

    protected string $table = 'conges';

    protected array $searchFields = [
        'employe_nom', 'type', 'statut', 'motif'
    ];
}
