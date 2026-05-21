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
        'lignes'         => 'LONGTEXT NULL',
        'paiements_devis'=> 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'client_nom'     => 'VARCHAR(255) NULL',
        'total_ht'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'          => 'TEXT NULL',
        'store_id'       => 'VARCHAR(100) NULL',
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
        'lignes'         => 'LONGTEXT NULL',
        'paiements'      => 'LONGTEXT NULL',
        'statut'         => 'VARCHAR(50) NOT NULL DEFAULT "Brouillon"',
        'client_nom'     => 'VARCHAR(255) NULL',
        'total_ht'       => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_tva'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'total_ttc'      => 'DECIMAL(12,2) NULL DEFAULT 0',
        'notes'          => 'TEXT NULL',
        'commande_id'    => 'VARCHAR(100) NULL',
        'devis_id'       => 'VARCHAR(100) NULL',
        'store_id'       => 'VARCHAR(100) NULL',
    ],
    'produits' => [
        'paliers'        => 'LONGTEXT NULL',
        'variantes'      => 'LONGTEXT NULL',
        'stock'          => 'DECIMAL(10,2) NULL DEFAULT 0',
        'store_id'       => 'VARCHAR(100) NULL',
    ],
    'fournisseurs' => [
        'store_id'       => 'VARCHAR(100) NULL',
    ],
    'contacts' => [
        'store_id'       => 'VARCHAR(100) NULL',
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

echo json_encode([
    'ok'  => true,
    'msg' => 'Migration terminée',
    'log' => $log,
]);
