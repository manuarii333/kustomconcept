<?php
/* ================================================================
   HCS ERP — api/controllers/finance_transactions.php
   Transactions financières (revenus) — Finance Dashboard
   Table : finance_transactions
   Champs clés : store_id, date, canal, type, description, montant, nb
   ================================================================ */

class FinanceTransactionsController extends BaseController {
    protected string $table        = 'finance_transactions';
    protected array  $searchFields = ['description', 'canal', 'type'];
}
