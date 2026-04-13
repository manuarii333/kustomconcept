<?php
/* ================================================================
   HCS ERP — api/controllers/landing_pages.php
   Table : landing_pages (pages marketing & campagnes)
   ================================================================ */

require_once __DIR__ . '/base.php';

class LandingPagesController extends BaseController {

    protected string $table = 'landing_pages';

    protected array $searchFields = [
        'titre', 'slug', 'statut', 'campagne', 'description'
    ];
}
