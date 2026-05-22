<?php
require_once __DIR__ . '/base.php';

class LpPublieesController extends BaseController {
    protected string $table = 'lp_publiees';
    protected array $searchFields = [
        'campaign_name', 'slug', 'url', 'status'
    ];
}
