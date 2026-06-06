<?php
/* ================================================================
   HCS ERP — api/migrate_schema.php
   Migration du schéma MySQL : ajout des colonnes JSON manquantes
   et de la colonne store_id pour la sync localStorage ↔ MySQL.

   Usage : appeler une seule fois via le navigateur :
     https://highcoffeeshirts.com/erp/api/migrate_schema.php?key=hcs-erp-2026
   ================================================================ */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

header('Content-Type: application/json; charset=utf-8');

/* Vérification clé */
$key = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($key !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Clé API invalide']);
    exit;
}

$db  = Database::getInstance();
$pdo = $db->getPdo();
$log = [];

/* ----------------------------------------------------------------
   Colonnes JSON à ajouter / vérifier dans chaque table
   Format : [ table => [ col => type ], ... ]
   ---------------------------------------------------------------- */
$migrations = [
    'devis' => [
        'ref'            => 'VARCHAR(50) NULL',
        'lignes'         => 'LONGTEXT NULL',
        'paiements'      => 'LONGTEXT NULL',
        'paiements_devis'=> 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'client_nom'     => 'VARCHAR(255) NULL',
        'client_id'      => 'VARCHAR(100) NULL',
        'date'           => 'DATE NULL',
        'date_expiration'=> 'DATE NULL',
        'total_ht'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'          => 'TEXT NULL',
        'mockup_urls'    => 'LONGTEXT NULL',
        'store_id'       => 'VARCHAR(100) NULL',
        'deleted_at'     => 'DATETIME NULL DEFAULT NULL',
    ],
    'commandes' => [
        'lignes'         => 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'client_nom'     => 'VARCHAR(255) NULL',
        'total_ht'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'          => 'TEXT NULL',
        'quote_id'       => 'VARCHAR(100) NULL',
        'archived_at'    => 'DATETIME NULL',
        'store_id'       => 'VARCHAR(100) NULL',
    ],
    'factures' => [
        'ref'            => 'VARCHAR(50) NULL',
        'lignes'         => 'LONGTEXT NULL',
        'paiements'      => 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'client_nom'     => 'VARCHAR(255) NULL',
        'client_id'      => 'VARCHAR(100) NULL',
        'date'           => 'DATE NULL',
        'date_echeance'  => 'DATE NULL',
        'total_ht'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'          => 'TEXT NULL',
        'mockup_urls'    => 'LONGTEXT NULL',
        'commande_id'    => 'VARCHAR(100) NULL',
        'devis_id'       => 'VARCHAR(100) NULL',
        'store_id'       => 'VARCHAR(100) NULL',
    ],
    'produits' => [
        'store_id'       => 'VARCHAR(100) NULL',
        'nom'            => 'VARCHAR(255) NULL',
        'ref'            => 'VARCHAR(100) NULL',
        'sku'            => 'VARCHAR(100) NULL',
        'emoji'          => 'VARCHAR(20) NULL',
        'image'          => 'LONGTEXT NULL',
        'categorie'      => 'VARCHAR(100) NULL',
        'fournisseur'    => 'VARCHAR(255) NULL',
        'unite'          => 'VARCHAR(50) NULL',
        'prix'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'cout'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'stock'          => 'DECIMAL(10,2) NULL DEFAULT 0',
        'stock_min'      => 'DECIMAL(10,2) NULL DEFAULT 0',
        'tva'            => 'INT NULL DEFAULT 0',
        'status'         => 'VARCHAR(50) NULL DEFAULT "active"',
        'description'    => 'TEXT NULL',
        'tailles'        => 'VARCHAR(500) NULL',
        'couleurs'       => 'VARCHAR(500) NULL',
        'coupe'          => 'VARCHAR(255) NULL',
        'variantes'      => 'LONGTEXT NULL',
        'paliers'        => 'LONGTEXT NULL',
        'attr_prix'      => 'VARCHAR(100) NULL',
        'attr_increments'=> 'LONGTEXT NULL',
        'formats_prix'   => 'LONGTEXT NULL',
        'custom_attrs'   => 'LONGTEXT NULL',
        'product_kind'   => 'VARCHAR(50) NULL DEFAULT "simple"',
        'updated_at'     => 'DATETIME NULL',
    ],
    'bons_achat' => [
        'store_id'           => 'VARCHAR(100) NULL',
        'ref'                => 'VARCHAR(50) NULL',
        'fournisseur'        => 'VARCHAR(255) NULL',
        'fournisseur_id'     => 'VARCHAR(100) NULL',
        'date'               => 'DATE NULL',
        'date_livraison_prevue' => 'DATE NULL',
        'statut'             => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'lignes'             => 'LONGTEXT NULL',
        'notes'              => 'TEXT NULL',
        'devis_origine_id'   => 'VARCHAR(100) NULL',
        'devis_origine_ref'  => 'VARCHAR(50) NULL',
        'total_ht'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'          => 'DECIMAL(12,2) NULL DEFAULT 0',
    ],
    'fournisseurs' => [
        'store_id'       => 'VARCHAR(100) NULL',
        'nom'            => 'VARCHAR(255) NULL',
        'contact'        => 'VARCHAR(255) NULL',
        'email'          => 'VARCHAR(255) NULL',
        'telephone'      => 'VARCHAR(50) NULL',
        'adresse'        => 'TEXT NULL',
        'notes'          => 'TEXT NULL',
    ],
    'contacts' => [
        'store_id'       => 'VARCHAR(100) NULL',
        'nom'            => 'VARCHAR(255) NULL',
        'prenom'         => 'VARCHAR(255) NULL',
        'email'          => 'VARCHAR(255) NULL',
        'telephone'      => 'VARCHAR(50) NULL',
        'entreprise'     => 'VARCHAR(255) NULL',
        'adresse'        => 'TEXT NULL',
        'type'           => 'VARCHAR(50) NULL',
        'statut'         => 'VARCHAR(50) NULL',
        'notes'          => 'TEXT NULL',
        'tags'           => 'LONGTEXT NULL',
    ],
    'commandes_atelier' => [
        'lignes'         => 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "En attente"',
        'store_id'       => 'VARCHAR(100) NULL',
        'commande_id'    => 'VARCHAR(100) NULL',
        'cmd_ref'        => 'VARCHAR(100) NULL',
        'poste'          => 'VARCHAR(100) NULL',
        'operateur'      => 'VARCHAR(255) NULL',
        'priorite'       => 'VARCHAR(50) NULL',
        'progression'    => 'INT NULL DEFAULT 0',
    ],
    'planning_atelier' => [
        'lignes'         => 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Planifié"',
        'store_id'       => 'VARCHAR(100) NULL',
        'commande_id'    => 'VARCHAR(100) NULL',
        'cmd_ref'        => 'VARCHAR(100) NULL',
    ],
    /* ── Finance Dashboard ─────────────────────────────── */
    'finance_transactions' => [
        'store_id'       => 'VARCHAR(100) NULL',
        'date'           => 'DATE NULL',
        'canal'          => 'VARCHAR(50) NULL',
        'type'           => 'VARCHAR(50) NULL',
        'description'    => 'TEXT NULL',
        'montant'        => 'DECIMAL(12,2) NULL DEFAULT 0',
        'nb'             => 'INT NULL DEFAULT 1',
        'updated_at'     => 'DATETIME NULL',
    ],
    'finance_charges' => [
        'store_id'       => 'VARCHAR(100) NULL',
        'date'           => 'DATE NULL',
        'fournisseur'    => 'VARCHAR(255) NULL',
        'categorie'      => 'VARCHAR(100) NULL',
        'montant'        => 'DECIMAL(12,2) NULL DEFAULT 0',
        'numero'         => 'VARCHAR(100) NULL',
        'statut'         => 'VARCHAR(50) NULL DEFAULT "en_attente"',
        'updated_at'     => 'DATETIME NULL',
    ],
    /* ── Rapport P&L ────────────────────────────────────── */
    'pl_rapports' => [
        'store_id'       => 'VARCHAR(20) NULL',
        'mois'           => 'VARCHAR(7) NULL',
        'data_json'      => 'LONGTEXT NULL',
        'total_revenus'  => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_charges'  => 'DECIMAL(12,2) NULL DEFAULT 0',
        'resultat_net'   => 'DECIMAL(12,2) NULL DEFAULT 0',
        'marge_nette'    => 'DECIMAL(5,2) NULL DEFAULT 0',
        'updated_at'     => 'DATETIME NULL',
    ],
    /* ── Caisse POS : ventes ──────────────────────────── */
    'ventes_caisse' => [
        'ref'                => 'VARCHAR(50) NOT NULL DEFAULT ""',
        'facture_store_id'   => 'VARCHAR(100) NULL',       /* id localStorage facture */
        'session_caisse_id'  => 'INT NULL',                /* FK → sessions_caisse */
        'date'               => 'DATE NOT NULL',
        'heure'              => 'TIME NULL',
        'client_nom'         => 'VARCHAR(255) NULL',
        'client_id'          => 'VARCHAR(100) NULL',
        'mode_paiement'      => 'VARCHAR(50) NULL',        /* Espèces/Carte/Virement/Chèque */
        'operateur'          => 'VARCHAR(255) NULL',
        'nb_lignes'          => 'INT NULL DEFAULT 0',
        'total_ht'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'          => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_remise'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'          => 'DECIMAL(12,2) NULL DEFAULT 0',
        'lignes'             => 'LONGTEXT NULL',           /* JSON des lignes panier */
        'annulee'            => 'TINYINT(1) NOT NULL DEFAULT 0',
        'motif_annulation'   => 'TEXT NULL',
        'updated_at'         => 'DATETIME NULL',
    ],
    /* ── Caisse POS : sessions journalières ───────────── */
    'sessions_caisse' => [
        'date'               => 'DATE NOT NULL',
        'operateur'          => 'VARCHAR(255) NULL',
        'statut'             => 'VARCHAR(20) NOT NULL DEFAULT "ouverte"',
        'fonds_initial'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'fonds_final'        => 'DECIMAL(12,2) NULL',
        /* Totaux calculés à la fermeture */
        'nb_ventes'          => 'INT NULL DEFAULT 0',
        'total_especes'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_carte'        => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_virement'     => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_cheque'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ht'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'          => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'          => 'DECIMAL(12,2) NULL DEFAULT 0',
        /* ecart = fonds_final - fonds_initial - total_especes (contrôle) */
        'ecart_caisse'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'              => 'TEXT NULL',
        'updated_at'         => 'DATETIME NULL',
    ],
    /* ── Planning Production : cartes Kanban ─────────────── */
    'planning_commandes' => [
        'store_id'        => 'VARCHAR(100) NULL',
        'client'          => 'VARCHAR(255) NULL',
        'ref'             => 'VARCHAR(100) NULL',
        'canal'           => 'VARCHAR(255) NULL',
        'couleur'         => 'VARCHAR(100) NULL',
        'taille'          => 'VARCHAR(50) NULL',
        'logo_dtf'        => 'VARCHAR(255) NULL',
        'desc'            => 'TEXT NULL',
        'type'            => 'VARCHAR(50) NULL',
        'machine'         => 'VARCHAR(100) NULL',
        'qty'             => 'INT NULL DEFAULT 1',
        'deadline'        => 'DATETIME NULL',
        'priority'        => 'VARCHAR(20) NULL DEFAULT "normal"',
        'notes'           => 'TEXT NULL',
        'col'             => 'VARCHAR(50) NULL DEFAULT "attente"',
        'lignes'          => 'LONGTEXT NULL',
        'mockup_urls'     => 'LONGTEXT NULL',
        'checklist_prod'  => 'LONGTEXT NULL',
        'reservation'     => 'LONGTEXT NULL',
        'statut_paiement' => 'VARCHAR(20) NULL DEFAULT ""',
        'updated_at'      => 'DATETIME NULL',
    ],
    /* ── Planning Production : fournisseurs ──────────────── */
    'planning_fournisseurs' => [
        'store_id'        => 'VARCHAR(100) NULL',
        'nom'             => 'VARCHAR(255) NULL',
        'type'            => 'VARCHAR(20) NULL',
        'telephone'       => 'VARCHAR(50) NULL',
        'email'           => 'VARCHAR(255) NULL',
        'produits'        => 'TEXT NULL',
        'pays'            => 'VARCHAR(100) NULL',
        'notes'           => 'TEXT NULL',
        'updated_at'      => 'DATETIME NULL',
    ],
    /* ── Planning Production : achats matières ───────────── */
    'planning_achats' => [
        'store_id'        => 'VARCHAR(100) NULL',
        'cmd_id'          => 'VARCHAR(100) NULL',
        'ref'             => 'VARCHAR(100) NULL',
        'client'          => 'VARCHAR(255) NULL',
        'fournisseur'     => 'VARCHAR(255) NULL',
        'produit'         => 'TEXT NULL',
        'qte'             => 'INT NULL DEFAULT 1',
        'montant'         => 'DECIMAL(12,2) NULL DEFAULT 0',
        'statut'          => 'VARCHAR(50) NULL DEFAULT "en_attente"',
        'notes'           => 'TEXT NULL',
        'feedback'        => 'TEXT NULL',
        'parcours'        => 'VARCHAR(20) NULL',
        'updated_at'      => 'DATETIME NULL',
    ],
    /* ── Sessions Comptables (périodes comptables) ──────── */
    'sessions_comptables' => [
        'nom'                    => 'VARCHAR(255) NOT NULL DEFAULT ""',
        'exercice'               => 'VARCHAR(4) NULL',
        'date_debut'             => 'DATE NOT NULL',
        'date_fin'               => 'DATE NOT NULL',
        'statut'                 => 'VARCHAR(20) NOT NULL DEFAULT "ouverte"',
        'description'            => 'TEXT NULL',
        /* Totaux calculés sur la période */
        'nb_devis'               => 'INT NULL DEFAULT 0',
        'total_devis'            => 'DECIMAL(12,2) NULL DEFAULT 0',
        'nb_factures'            => 'INT NULL DEFAULT 0',
        'total_factures_ttc'     => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_factures_payees'  => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_charges'          => 'DECIMAL(12,2) NULL DEFAULT 0',
        'resultat_net'           => 'DECIMAL(12,2) NULL DEFAULT 0',
        'marge_nette'            => 'DECIMAL(5,2) NULL DEFAULT 0',
        /* Clôture */
        'cloture_par'            => 'VARCHAR(255) NULL',
        'cloture_at'             => 'DATETIME NULL',
        /* Snapshot JSON complet (devis+factures+charges sur période) */
        'data_json'              => 'LONGTEXT NULL',
        'updated_at'             => 'DATETIME NULL',
    ],
    /* ── Andromeda : Landing Pages publiées ─────────────── */
    'lp_publiees' => [
        'campaign_id'    => 'INT NULL DEFAULT 0',
        'campaign_name'  => 'VARCHAR(255) NULL',
        'slug'           => 'VARCHAR(255) NULL',
        'url'            => 'VARCHAR(500) NULL',
        'published_at'   => 'DATETIME NULL',
        'html_size'      => 'INT NULL DEFAULT 0',
        'status'         => 'VARCHAR(50) NULL DEFAULT "active"',
        'updated_at'     => 'DATETIME NULL',
    ],
    /* ── Andromeda : Commandes clients LP ───────────────── */
    'lp_commandes' => [
        'order_id'         => 'VARCHAR(255) NULL',
        'lp_slug'          => 'VARCHAR(255) NULL',
        'campaign_name'    => 'VARCHAR(255) NULL',
        'product'          => 'VARCHAR(255) NULL',
        'size'             => 'VARCHAR(50) NULL',
        'qty'              => 'INT NULL DEFAULT 1',
        'couleur'          => 'VARCHAR(100) NULL',
        'couleur_hex'      => 'VARCHAR(20) NULL',
        'dtf_logo_ref'     => 'VARCHAR(50) NULL',
        'logo_name'        => 'VARCHAR(255) NULL',
        'logo_placement'   => 'VARCHAR(255) NULL',
        'customer_name'    => 'VARCHAR(255) NULL',
        'customer_email'   => 'VARCHAR(255) NULL',
        'customer_phone'   => 'VARCHAR(100) NULL',
        'delivery_type'    => 'VARCHAR(50) NULL',
        'delivery_address' => 'TEXT NULL',
        'island'           => 'VARCHAR(100) NULL',
        'shipping_fee'     => 'INT NULL DEFAULT 0',
        'pickup_date'      => 'VARCHAR(100) NULL',
        'pickup_slot'      => 'VARCHAR(20) NULL',
        'amount'           => 'INT NULL DEFAULT 0',
        'currency'         => 'VARCHAR(10) NULL DEFAULT "XPF"',
        'status'           => 'VARCHAR(50) NULL DEFAULT "en_attente"',
        'note'             => 'TEXT NULL',
        'planning_card_id' => 'INT NULL',
        'updated_at'       => 'DATETIME NULL',
    ],
    /* ── Programme fidélité ──────────────────────────────── */
    'fidelite_clients' => [
        'email'         => 'VARCHAR(255) NULL',
        'name'          => 'VARCHAR(255) NULL',
        'total_xpf'     => 'INT NULL DEFAULT 0',
        'points'        => 'INT NULL DEFAULT 0',
        'tier'          => 'VARCHAR(50) NULL DEFAULT "Rookie"',
        'token'         => 'VARCHAR(64) NULL',
        'token_expiry'  => 'DATETIME NULL',
        'password_hash' => 'VARCHAR(255) NULL',
        'password_set'  => 'TINYINT(1) NULL DEFAULT 0',
        'updated_at'    => 'DATETIME NULL',
    ],
    'fidelite_historique' => [
        'client_email'  => 'VARCHAR(255) NULL',
        'order_id'      => 'VARCHAR(255) NULL',
        'amount'        => 'INT NULL DEFAULT 0',
        'points_earned' => 'INT NULL DEFAULT 0',
        'tier_at_time'  => 'VARCHAR(50) NULL',
        'reason'        => 'VARCHAR(255) NULL',
        'updated_at'    => 'DATETIME NULL',
    ],
    /* ── Triage & Réception (Agent 1) ───────────────────────── */
    'triage_messages' => [
        'canal'      => 'VARCHAR(20) NULL',                        /* gmail | messenger */
        'expediteur' => 'VARCHAR(150) NULL',                       /* nom affiché */
        'source_id'  => 'VARCHAR(150) NULL',                       /* PSID Messenger OU thread_id Gmail */
        'message'    => 'TEXT NULL',                               /* contenu brut (500 chars max) */
        'categorie'  => 'VARCHAR(30) NULL',                        /* DEVIS | INFO_SERVICES | … */
        'action'     => 'TEXT NULL',                               /* réponse IA tronquée (100 chars max) */
        'devis_ref'  => 'VARCHAR(30) NULL',                        /* ref devis créé si applicable */
        'statut'     => 'VARCHAR(20) NULL DEFAULT "traite"',       /* traite | erreur */
    ],
];

/* Récupérer les tables existantes */
$tablesStmt = $pdo->query("SHOW TABLES");
$tablesExistantes = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($migrations as $table => $colonnes) {
    if (!in_array($table, $tablesExistantes)) {
        $log[] = "⚠ Table `{$table}` inexistante — création...";
        /* Créer la table avec un schéma minimal */
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS `{$table}` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $log[] = "✅ Table `{$table}` créée.";
        } catch (Exception $e) {
            $log[] = "❌ Erreur création `{$table}`: " . $e->getMessage();
            continue;
        }
    }

    /* Récupérer les colonnes existantes */
    $colStmt = $pdo->query("DESCRIBE `{$table}`");
    $colsExistantes = array_column($colStmt->fetchAll(PDO::FETCH_ASSOC), 'Field');

    foreach ($colonnes as $col => $type) {
        if (in_array($col, $colsExistantes)) {
            $log[] = "ℹ `{$table}`.`{$col}` existe déjà.";
            continue;
        }
        try {
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$col}` {$type}");
            $log[] = "✅ Ajout `{$table}`.`{$col}` ({$type})";
        } catch (Exception $e) {
            $log[] = "❌ `{$table}`.`{$col}`: " . $e->getMessage();
        }
    }
}

/* ----------------------------------------------------------------
   Réparer AUTO_INCREMENT sur les colonnes id des tables principales
   (au cas où la table existait avant sans AUTO_INCREMENT)
   ---------------------------------------------------------------- */
$tablesToFix = ['devis', 'commandes', 'factures', 'produits', 'contacts', 'fournisseurs',
                'bons_achat', 'commandes_atelier', 'planning_atelier'];

foreach ($tablesToFix as $table) {
    try {
        $stmt = $pdo->prepare(
            "SELECT Extra FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'id'"
        );
        $stmt->execute([$table]);
        $colInfo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$colInfo) continue;

        if (strpos(strtolower($colInfo['Extra'] ?? ''), 'auto_increment') === false) {
            $pdo->exec("ALTER TABLE `{$table}` MODIFY `id` INT NOT NULL AUTO_INCREMENT");
            $log[] = "✅ `{$table}`.`id` — AUTO_INCREMENT ajouté";
        } else {
            $log[] = "ℹ `{$table}`.`id` — AUTO_INCREMENT OK";
        }
    } catch (Exception $e) {
        $log[] = "❌ Fix AUTO_INCREMENT `{$table}`: " . $e->getMessage();
    }
}

echo json_encode([
    'ok'  => true,
    'msg' => 'Migration terminée',
    'log' => $log,
]);
