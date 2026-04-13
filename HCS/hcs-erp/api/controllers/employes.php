<?php
/* ================================================================
   HCS ERP — api/controllers/employes.php
   Table : employes (ressources humaines)
   ================================================================ */

require_once __DIR__ . '/base.php';

class EmployesController extends BaseController {

    protected string $table = 'employes';

    protected array $searchFields = [
        'nom', 'prenom', 'email', 'poste', 'departement'
    ];
}
