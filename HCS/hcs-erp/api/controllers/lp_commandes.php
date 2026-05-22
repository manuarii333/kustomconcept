<?php
require_once __DIR__ . '/base.php';

class LpCommandesController extends BaseController {
    protected string $table = 'lp_commandes';
    protected array $searchFields = [
        'order_id', 'campaign_name', 'product', 'customer_name', 'customer_email', 'lp_slug'
    ];
}
