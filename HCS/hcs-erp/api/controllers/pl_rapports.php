<?php
/* ================================================================
   HCS ERP — api/controllers/pl_rapports.php
   Snapshots P&L mensuels — Rapport P&L
   Table : pl_rapports
   Champs clés : store_id (= mois ex: "2026-05"), mois, data_json,
                 total_revenus, total_charges, resultat_net, marge_nette
   ================================================================ */

class PlRapportsController extends BaseController {
    protected string $table        = 'pl_rapports';
    protected array  $searchFields = ['mois'];
}
