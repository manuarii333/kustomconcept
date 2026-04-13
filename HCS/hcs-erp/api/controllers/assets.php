<?php
/* ================================================================
   HCS ERP — api/controllers/assets.php
   Table : assets (fichiers, images, documents)
   ================================================================ */

require_once __DIR__ . '/base.php';

class AssetsController extends BaseController {

    protected string $table = 'assets';

    protected array $searchFields = [
        'nom', 'type', 'categorie', 'tags', 'description'
    ];
}
