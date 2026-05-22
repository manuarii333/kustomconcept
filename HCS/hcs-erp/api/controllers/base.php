<?php
/* ================================================================
   HCS ERP — api/controllers/base.php
   BaseController : CRUD générique réutilisé par tous les controllers.

   Chaque controller fils déclare simplement :
     protected $table = 'nom_table';
     protected $searchFields = ['champ1', 'champ2', ...];
   ================================================================ */

class BaseController {

    /** Instance Database injectée via le constructeur */
    protected Database $db;

    /** Nom de la table MySQL (défini dans chaque sous-classe) */
    protected string $table;

    /** Colonnes utilisées par la recherche full-text */
    protected array $searchFields = ['nom'];

    /** Si true : DELETE devient UPDATE deleted_at=NOW(), getAll filtre les enregistrements supprimés */
    protected bool $softDelete = false;

    public function __construct(Database $db) {
        $this->db = $db;
    }

    /* ----------------------------------------------------------------
       LISTE — GET /api/{resource}
       Paramètres GET optionnels : sort, order, limit, offset
       ---------------------------------------------------------------- */
    public function getAll(array $params = []): array {
        /* Sécurisation du nom de colonne pour ORDER BY */
        $sort  = $this->sanitizeColumn($params['sort']  ?? 'id');
        $order = strtoupper($params['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        /* Maximum 1 000 lignes par appel pour éviter la surcharge */
        $limit  = min((int)($params['limit']  ?? 500), 1000);
        $offset = (int)($params['offset'] ?? 0);

        $hasDeletedAt = $this->softDelete && in_array('deleted_at', $this->getTableColumns());
        $sql  = "SELECT * FROM `{$this->table}`"
              . ($hasDeletedAt ? " WHERE `deleted_at` IS NULL" : "")
              . " ORDER BY `{$sort}` {$order}"
              . " LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->query($sql);

        $rows = $stmt->fetchAll();
        /* Décoder les champs JSON stockés en TEXT */
        $rows = array_map([$this, 'decodeJsonFields'], $rows);

        return [
            'items'  => $rows,
            'table'  => $this->table,
            'limit'  => $limit,
            'offset' => $offset,
        ];
    }

    /* ----------------------------------------------------------------
       UN ENREGISTREMENT — GET /api/{resource}/{id}
       ---------------------------------------------------------------- */
    public function getOne(int|string $id): array {
        /* Garder le type string si l'id est un VARCHAR (ex: 'devis-xxx') */
        $idVal = is_numeric($id) ? (int)$id : $id;
        $stmt = $this->db->query(
            "SELECT * FROM `{$this->table}` WHERE id = ?",
            [$idVal]
        );
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            throw new RuntimeException(
                "Enregistrement #{$id} introuvable dans `{$this->table}`"
            );
        }

        /* Décoder les champs JSON stockés en TEXT */
        return $this->decodeJsonFields($row);
    }

    /* ----------------------------------------------------------------
       CRÉATION — POST /api/{resource}
       Corps JSON : { "champ1": "val1", "champ2": "val2", ... }
       ---------------------------------------------------------------- */
    public function create(array $data): array {
        $data = $this->sanitizeData($data);

        /* Détecter si id est VARCHAR (pas auto-increment) pour l'assigner depuis store_id */
        $idInfo = $this->getIdColumnInfo();
        $isAutoInc = strpos(strtolower($idInfo['Extra'] ?? ''), 'auto_increment') !== false;

        if ($isAutoInc) {
            /* INT AUTO_INCREMENT → MySQL assigne tout seul */
            unset($data['id']);
        } elseif (!isset($data['id']) && isset($data['store_id'])) {
            /* VARCHAR id → utiliser store_id comme clé primaire */
            $data['id'] = $data['store_id'];
        }

        if (empty($data)) {
            throw new InvalidArgumentException('Aucune donnée valide fournie');
        }

        /* Horodatage automatique si la colonne existe dans le schéma */
        if (!isset($data['created_at'])) {
            $data['created_at'] = date('Y-m-d H:i:s');
        }

        $cols         = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        /* Si doublon de clé primaire → mettre à jour au lieu d'échouer */
        $updates = implode(', ', array_map(fn($c) => "`{$c}` = VALUES(`{$c}`)", array_keys($data)));

        $this->db->query(
            "INSERT INTO `{$this->table}` ({$cols}) VALUES ({$placeholders})"
            . " ON DUPLICATE KEY UPDATE {$updates}",
            array_values($data)
        );

        /* Retourner l'enregistrement complet avec son id (auto ou varchar) */
        $newId = $isAutoInc ? $this->db->lastInsertId() : ($data['id'] ?? $this->db->lastInsertId());

        /* Fallback : certains pilotes PDO/MySQL retournent "0" après ON DUPLICATE KEY UPDATE */
        if ((!$newId || $newId === '0') && $isAutoInc) {
            $row   = $this->db->query("SELECT LAST_INSERT_ID() AS last_id")->fetch();
            $newId = $row['last_id'] ?? 0;
        }

        /* Si toujours 0 : ON DUPLICATE KEY UPDATE sans changement réel → renvoyer les données
           sans tenter getOne(0) qui échouerait avec 404 */
        if (!$newId || (int)$newId === 0) {
            return $data + ['_upserted' => true];
        }

        return $this->getOne($newId);
    }

    /** Retourne les infos de la colonne id (type, extra) */
    protected function getIdColumnInfo(): array {
        try {
            $stmt = $this->db->query(
                "SHOW COLUMNS FROM `{$this->table}` WHERE Field = 'id'"
            );
            return $stmt->fetch() ?: [];
        } catch (\Exception $e) {
            return [];
        }
    }

    /* ----------------------------------------------------------------
       MISE À JOUR — PUT /api/{resource}/{id}
       ---------------------------------------------------------------- */
    public function update(int|string $id, array $data): array {
        $data = $this->sanitizeData($data);

        if (empty($data)) {
            throw new InvalidArgumentException('Aucune donnée valide fournie');
        }

        /* Horodatage de la dernière modification — seulement si la colonne existe */
        if (in_array('updated_at', $this->getTableColumns())) {
            $data['updated_at'] = date('Y-m-d H:i:s');
        }

        $sets   = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($data)));
        $params = array_values($data);
        $params[] = is_numeric($id) ? (int)$id : $id;

        $this->db->query(
            "UPDATE `{$this->table}` SET {$sets} WHERE id = ?",
            $params
        );

        return $this->getOne($id);
    }

    /* ----------------------------------------------------------------
       SUPPRESSION — DELETE /api/{resource}/{id}
       ---------------------------------------------------------------- */
    public function delete(int|string $id): bool {
        /* Vérifier l'existence avant de supprimer */
        $this->getOne($id);

        $idVal = is_numeric($id) ? (int)$id : $id;
        if ($this->softDelete) {
            $this->db->query(
                "UPDATE `{$this->table}` SET `deleted_at` = NOW() WHERE id = ?",
                [$idVal]
            );
        } else {
            $this->db->query(
                "DELETE FROM `{$this->table}` WHERE id = ?",
                [$idVal]
            );
        }

        return true;
    }

    /* ----------------------------------------------------------------
       RECHERCHE — GET /api/{resource}/search?q=terme
       Lance un LIKE %terme% sur chaque champ listé dans $searchFields
       ---------------------------------------------------------------- */
    public function search(string $q): array {
        if ($q === '') {
            return $this->getAll();
        }

        /* Construire : champ1 LIKE ? OR champ2 LIKE ? ... */
        $conditions = array_map(
            fn($f) => "`{$f}` LIKE ?",
            $this->searchFields
        );
        $whereFields = implode(' OR ', $conditions);
        $hasDeletedAt = $this->softDelete && in_array('deleted_at', $this->getTableColumns());
        $sql = "SELECT * FROM `{$this->table}`"
             . " WHERE (" . $whereFields . ")"
             . ($hasDeletedAt ? " AND `deleted_at` IS NULL" : "")
             . " LIMIT 200";

        $params = array_fill(0, count($this->searchFields), "%{$q}%");
        $stmt   = $this->db->query($sql, $params);

        return [
            'items' => $stmt->fetchAll(),
            'query' => $q,
            'table' => $this->table,
        ];
    }

    /* ----------------------------------------------------------------
       UTILITAIRES DE SÉCURITÉ
       ---------------------------------------------------------------- */

    /**
     * Valide un nom de colonne : uniquement lettres, chiffres, underscore.
     * Évite l'injection SQL dans les clauses ORDER BY.
     */
    protected function sanitizeColumn(string $col): string {
        $col = preg_replace('/[^a-zA-Z0-9_]/', '', $col);
        return $col ?: 'id';
    }

    /** Cache des colonnes de la table courante */
    private ?array $_tableColumns = null;

    /** Retourne la liste des colonnes réelles de la table MySQL */
    protected function getTableColumns(): array {
        if ($this->_tableColumns !== null) return $this->_tableColumns;
        try {
            $stmt = $this->db->query("DESCRIBE `{$this->table}`");
            $this->_tableColumns = array_column($stmt->fetchAll(), 'Field');
        } catch (\Exception $e) {
            $this->_tableColumns = [];
        }
        return $this->_tableColumns;
    }

    /** Convertit camelCase → snake_case (totalHT → total_ht, clientNom → client_nom) */
    protected function camelToSnake(string $str): string {
        return strtolower(preg_replace('/(?<!^)[A-Z]+/', '_$0', $str));
    }

    /**
     * Filtre et mappe les données JS vers les colonnes MySQL réelles.
     * - Convertit camelCase → snake_case
     * - N'insère que les colonnes qui existent dans la table
     * - Encode les arrays/objects en JSON string
     */
    protected function sanitizeData(array $data): array {
        $cols  = $this->getTableColumns();
        $clean = [];
        foreach ($data as $key => $val) {
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $key)) continue;
            $snake = $this->camelToSnake($key);
            /* Chercher la colonne cible : clé originale ou version snake_case */
            if (in_array($key, $cols)) {
                $target = $key;
            } elseif (in_array($snake, $cols)) {
                $target = $snake;
            } else {
                continue; /* Colonne inconnue → ignorer */
            }
            if ($target === 'id') continue; /* Ne jamais écraser la clé primaire */
        $clean[$target] = (is_array($val) || is_object($val))
                ? json_encode($val, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
                : $val;
        }
        return $clean;
    }

    /**
     * Décode les champs JSON stockés en TEXT/LONGTEXT dans MySQL.
     * Parcourt toutes les colonnes et tente un json_decode sur les strings
     * qui commencent par [ ou { (tableaux ou objets JSON).
     */
    protected function decodeJsonFields(array $row): array {
        foreach ($row as $key => $val) {
            if (is_string($val) && strlen($val) > 1) {
                $first = $val[0];
                if ($first === '[' || $first === '{') {
                    $decoded = json_decode($val, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        $row[$key] = $decoded;
                    }
                }
            }
        }
        return $row;
    }
}
