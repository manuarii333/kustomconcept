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

        $sql  = "SELECT * FROM `{$this->table}`"
              . " ORDER BY `{$sort}` {$order}"
              . " LIMIT {$limit} OFFSET {$offset}";
        $stmt = $this->db->query($sql);

        return [
            'items'  => $stmt->fetchAll(),
            'table'  => $this->table,
            'limit'  => $limit,
            'offset' => $offset,
        ];
    }

    /* ----------------------------------------------------------------
       UN ENREGISTREMENT — GET /api/{resource}/{id}
       ---------------------------------------------------------------- */
    public function getOne(int|string $id): array {
        $stmt = $this->db->query(
            "SELECT * FROM `{$this->table}` WHERE id = ?",
            [(int)$id]
        );
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            throw new RuntimeException(
                "Enregistrement #{$id} introuvable dans `{$this->table}`"
            );
        }

        return $row;
    }

    /* ----------------------------------------------------------------
       CRÉATION — POST /api/{resource}
       Corps JSON : { "champ1": "val1", "champ2": "val2", ... }
       ---------------------------------------------------------------- */
    public function create(array $data): array {
        $data = $this->sanitizeData($data);

        if (empty($data)) {
            throw new InvalidArgumentException('Aucune donnée valide fournie');
        }

        /* Horodatage automatique si la colonne existe dans le schéma */
        if (!isset($data['created_at'])) {
            $data['created_at'] = date('Y-m-d H:i:s');
        }

        $cols         = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $this->db->query(
            "INSERT INTO `{$this->table}` ({$cols}) VALUES ({$placeholders})",
            array_values($data)
        );

        /* Retourner l'enregistrement complet avec son nouvel ID */
        return $this->getOne($this->db->lastInsertId());
    }

    /* ----------------------------------------------------------------
       MISE À JOUR — PUT /api/{resource}/{id}
       ---------------------------------------------------------------- */
    public function update(int|string $id, array $data): array {
        $data = $this->sanitizeData($data);

        if (empty($data)) {
            throw new InvalidArgumentException('Aucune donnée valide fournie');
        }

        /* Horodatage de la dernière modification */
        $data['updated_at'] = date('Y-m-d H:i:s');

        $sets   = implode(', ', array_map(fn($c) => "`{$c}` = ?", array_keys($data)));
        $params = array_values($data);
        $params[] = (int)$id;   // Paramètre WHERE id = ?

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

        $this->db->query(
            "DELETE FROM `{$this->table}` WHERE id = ?",
            [(int)$id]
        );

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
        $sql = "SELECT * FROM `{$this->table}`"
             . " WHERE " . implode(' OR ', $conditions)
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

    /**
     * Filtre les clés du tableau data.
     * Seules les clés avec des noms de colonnes valides sont conservées.
     * Cela protège les INSERT/UPDATE dynamiques contre l'injection SQL.
     */
    protected function sanitizeData(array $data): array {
        $clean = [];
        foreach ($data as $key => $val) {
            /* Clé valide : lettres, chiffres, underscore uniquement */
            if (preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
                $clean[$key] = $val;
            }
        }
        return $clean;
    }
}
