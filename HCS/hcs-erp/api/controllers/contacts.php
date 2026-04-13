<?php
/* ================================================================
   HCS ERP — api/controllers/contacts.php
   Table : contacts (clients, prospects, partenaires)
   ================================================================ */

require_once __DIR__ . '/base.php';

class ContactsController extends BaseController {

    protected string $table = 'contacts';

    /* Champs inclus dans la recherche full-text */
    protected array $searchFields = [
        'nom', 'prenom', 'email', 'telephone',
        'entreprise', 'ville', 'notes'
    ];
}
