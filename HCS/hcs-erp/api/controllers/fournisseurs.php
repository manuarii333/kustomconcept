<?php
/* ================================================================
   HCS ERP — api/controllers/fournisseurs.php
   Table : fournisseurs (fournisseurs matières & services)
   ================================================================ */

require_once __DIR__ . '/base.php';

class FournisseursController extends BaseController {

    protected string $table = 'fournisseurs';

    protected array $searchFields = [
        'nom', 'email', 'telephone', 'ville', 'pays', 'notes'
    ];
}
