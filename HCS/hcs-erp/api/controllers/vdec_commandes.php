<?php
/* ================================================================
   HCS ERP — api/controllers/vdec_commandes.php
   Archive des commandes Déco Véhicule (clientèle B2C)

   GET  /api/vdec_commandes           → liste (getAll)
   GET  /api/vdec_commandes/{id}      → une commande (getOne)
   POST /api/vdec_commandes           → créer commande (create)
   ================================================================ */

class VdecCommandesController {

    private PDO $pdo;

    public function __construct($db) {
        $this->pdo = ($db instanceof PDO) ? $db : $db->getPdo();
        $this->ensureTable();
    }

    private function ensureTable(): void {
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS vdec_commandes (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            order_id        VARCHAR(40)  NOT NULL UNIQUE,
            status          VARCHAR(20)  NOT NULL DEFAULT 'nouveau',
            total_xpf       INT          NOT NULL DEFAULT 0,
            cat_name        VARCHAR(100) NOT NULL DEFAULT '',
            cat_model       VARCHAR(100) NOT NULL DEFAULT '',
            cat_icon        VARCHAR(10)  NOT NULL DEFAULT '',
            contact         JSON,
            delivery        JSON,
            logos           JSON,
            texts           JSON,
            views_json      JSON,
            view_snapshots  LONGTEXT,
            note            TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        /* Migration : ajouter view_snapshots si table existait déjà sans ce champ */
        try {
            $this->pdo->exec("ALTER TABLE vdec_commandes ADD COLUMN view_snapshots LONGTEXT AFTER views_json");
        } catch (\PDOException $e) {
            /* Colonne déjà présente — ignorer */
        }
    }

    public function getAll(array $params = []): array {
        $limit  = min((int)($params['limit']  ?? 50), 200);
        $offset = (int)($params['offset'] ?? 0);
        $status = $params['status'] ?? null;

        $where = $status ? 'WHERE status = :status' : '';
        $stmt  = $this->pdo->prepare(
            "SELECT id, order_id, status, total_xpf, cat_name, cat_model, cat_icon,
                    contact, delivery, logos, texts, views_json, view_snapshots, created_at
             FROM vdec_commandes {$where}
             ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        );
        if ($status) $stmt->bindValue(':status', $status);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map([$this, 'decode'], $rows);
    }

    public function getOne($id): array {
        $col  = is_numeric($id) ? 'id' : 'order_id';
        $stmt = $this->pdo->prepare("SELECT * FROM vdec_commandes WHERE {$col} = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            throw new RuntimeException("Commande introuvable : {$id}");
        }
        return $this->decode($row);
    }

    public function create(array $body): array {
        $orderId  = $body['order_id']  ?? ('VDC-' . time());
        $status   = $body['status']    ?? 'payé';
        $total    = (int)($body['total_xpf'] ?? 0);
        $catName  = $body['cat_name']  ?? '';
        $catModel = $body['cat_model'] ?? '';
        $catIcon  = $body['cat_icon']  ?? '';
        $contact   = json_encode($body['contact']        ?? []);
        $delivery  = json_encode($body['delivery']       ?? []);
        $logos     = json_encode($body['logos']          ?? []);
        $texts     = json_encode($body['texts']          ?? []);
        $views     = json_encode($body['views_validated'] ?? []);
        $snapshots = isset($body['view_snapshots']) ? json_encode($body['view_snapshots']) : null;

        $stmt = $this->pdo->prepare(
            "INSERT INTO vdec_commandes
                (order_id, status, total_xpf, cat_name, cat_model, cat_icon,
                 contact, delivery, logos, texts, views_json, view_snapshots)
             VALUES (:order_id, :status, :total, :cat_name, :cat_model, :cat_icon,
                     :contact, :delivery, :logos, :texts, :views, :snapshots)
             ON DUPLICATE KEY UPDATE
                status         = VALUES(status),
                total_xpf      = VALUES(total_xpf),
                contact        = VALUES(contact),
                delivery       = VALUES(delivery),
                view_snapshots = COALESCE(VALUES(view_snapshots), view_snapshots),
                updated_at     = NOW()"
        );
        $stmt->execute([
            ':order_id'  => $orderId,
            ':status'    => $status,
            ':total'     => $total,
            ':cat_name'  => $catName,
            ':cat_model' => $catModel,
            ':cat_icon'  => $catIcon,
            ':contact'   => $contact,
            ':delivery'  => $delivery,
            ':logos'     => $logos,
            ':texts'     => $texts,
            ':views'     => $views,
            ':snapshots' => $snapshots,
        ]);
        return ['ok' => true, 'order_id' => $orderId, 'id' => (int)$this->pdo->lastInsertId()];
    }

    public function update($id, array $body): array {
        $stmt = $this->pdo->prepare(
            "UPDATE vdec_commandes SET status = :status, updated_at = NOW() WHERE order_id = :id"
        );
        $stmt->execute([':status' => ($body['status'] ?? 'en cours'), ':id' => $id]);
        return ['ok' => true];
    }

    public function delete($id): void {
        $this->pdo->prepare("DELETE FROM vdec_commandes WHERE order_id = :id OR id = :id2")
                  ->execute([':id' => $id, ':id2' => $id]);
    }

    public function search(string $q): array {
        $like = '%' . $q . '%';
        $stmt = $this->pdo->prepare(
            "SELECT id, order_id, status, total_xpf, cat_name, cat_model, cat_icon,
                    contact, delivery, logos, texts, views_json, view_snapshots, note, created_at
             FROM vdec_commandes
             WHERE order_id LIKE :q1 OR cat_name LIKE :q2 OR cat_model LIKE :q3
             ORDER BY created_at DESC LIMIT 50"
        );
        $stmt->execute([':q1' => $like, ':q2' => $like, ':q3' => $like]);
        $rows = array_map([$this, 'decode'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        return ['items' => $rows, 'query' => $q, 'table' => 'vdec_commandes'];
    }

    private function decode(array $row): array {
        foreach (['contact','delivery','logos','texts'] as $col) {
            if (isset($row[$col]) && is_string($row[$col])) {
                $row[$col] = json_decode($row[$col], true) ?? [];
            }
        }
        if (isset($row['views_json']) && is_string($row['views_json'])) {
            $row['views_validated'] = json_decode($row['views_json'], true) ?? [];
            unset($row['views_json']);
        }
        if (isset($row['view_snapshots']) && is_string($row['view_snapshots'])) {
            $row['view_snapshots'] = json_decode($row['view_snapshots'], true) ?? [];
        }
        return $row;
    }
}
