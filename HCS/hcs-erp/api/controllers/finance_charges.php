<?php
/* ================================================================
   HCS ERP — api/controllers/finance_charges.php
   Charges fournisseurs / fixes — Finance Dashboard
   Table : finance_charges
   Champs clés : store_id, date, fournisseur, categorie, montant, numero, statut
   ================================================================ */

class FinanceChargesController extends BaseController {
    protected string $table        = 'finance_charges';
    protected array  $searchFields = ['fournisseur', 'categorie', 'numero'];
}
