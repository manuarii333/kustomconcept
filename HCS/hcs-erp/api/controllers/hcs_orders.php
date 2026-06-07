<?php
/* ================================================================
   HCS ERP — api/controllers/hcs_orders.php
   Commandes unifiées toutes verticales (vdec, tshirt, casquette,
   dtf, sticker, formation, abo, service, generic)

   GET  /api/hcs_orders                → liste (getAll)
   GET  /api/hcs_orders/{id}           → une commande (getOne)
   GET  /api/hcs_orders/search?q=...   → recherche
   POST /api/hcs_orders                → créer / upsert
   PUT  /api/hcs_orders/{id}           → mettre à jour statut/note
   DELETE /api/hcs_orders/{id}         → supprimer
   ================================================================ */

class HcsOrdersController {

    private PDO $pdo;

    public function __construct($db) {
        $this->pdo = ($db instanceof PDO) ? $db : $db->getPdo();
        $this->ensureTable();
    }

    private function ensureTable(): void {
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS hcs_orders (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            order_id      VARCHAR(50)   NOT NULL UNIQUE,
            vertical      VARCHAR(30)   NOT NULL DEFAULT 'generic',
            status        VARCHAR(20)   NOT NULL DEFAULT 'payé',
            total_xpf     INT           NOT NULL DEFAULT 0,
            campaign_name VARCHAR(200)  NOT NULL DEFAULT '',
            lp_slug       VARCHAR(200)  NOT NULL DEFAULT '',
            product_icon  VARCHAR(20)   NOT NULL DEFAULT '',
            product_name  VARCHAR(500)  NOT NULL DEFAULT '',
            contact       JSON,
            delivery      JSON,
            design_data   LONGTEXT,
            snapshots     LONGTEXT,
            mode          VARCHAR(10)   NOT NULL DEFAULT 'TEST',
            note          TEXT,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        /* Migrations : colonnes ajoutées après création initiale */
        foreach ([
            "ALTER TABLE hcs_orders ADD COLUMN snapshots LONGTEXT AFTER design_data",
            "ALTER TABLE hcs_orders ADD COLUMN mode VARCHAR(10) NOT NULL DEFAULT 'TEST' AFTER snapshots",
        ] as $sql) {
            try { $this->pdo->exec($sql); } catch (\PDOException $e) { /* déjà présente */ }
        }
    }

    /* ── Lecture liste ───────────────────────────────────────── */
    public function getAll(array $params = []): array {
        $limit    = min((int)($params['limit']  ?? 50), 200);
        $offset   = (int)($params['offset'] ?? 0);
        $vertical = $params['vertical'] ?? null;
        $status   = $params['status']   ?? null;

        $where = [];
        $bind  = [];
        if ($vertical) { $where[] = 'vertical = :vertical'; $bind[':vertical'] = $vertical; }
        if ($status)   { $where[] = 'status   = :status';   $bind[':status']   = $status; }
        $whereStr = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $stmt = $this->pdo->prepare(
            "SELECT id, order_id, vertical, status, total_xpf, campaign_name, lp_slug,
                    product_icon, product_name, contact, delivery, design_data, snapshots,
                    mode, note, created_at
             FROM hcs_orders {$whereStr}
             ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return array_map([$this, 'decode'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* ── Lecture unique ──────────────────────────────────────── */
    public function getOne($id): array {
        $col  = is_numeric($id) ? 'id' : 'order_id';
        $stmt = $this->pdo->prepare("SELECT * FROM hcs_orders WHERE {$col} = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            throw new RuntimeException("Commande introuvable : {$id}");
        }
        return $this->decode($row);
    }

    /* ── Création / upsert ───────────────────────────────────── */
    public function create(array $body): array {
        $orderId  = $body['order_id']      ?? ('HCS-' . time());
        $vertical = $body['vertical']      ?? 'generic';
        $status   = $body['status']        ?? 'payé';
        $total    = (int)($body['total_xpf'] ?? 0);
        $campName = $body['campaign_name'] ?? '';
        $lpSlug   = $body['lp_slug']       ?? '';
        $icon     = $body['product_icon']  ?? '';
        $prodName = $body['product_name']  ?? '';
        $contact  = json_encode($body['contact']  ?? []);
        $delivery = json_encode($body['delivery'] ?? []);
        $design   = isset($body['design_data'])
            ? (is_string($body['design_data']) ? $body['design_data'] : json_encode($body['design_data']))
            : null;
        $snaps    = isset($body['snapshots'])
            ? (is_string($body['snapshots'])    ? $body['snapshots']    : json_encode($body['snapshots']))
            : null;
        $mode     = $body['mode'] ?? 'TEST';
        $note     = $body['note'] ?? '';

        $stmt = $this->pdo->prepare(
            "INSERT INTO hcs_orders
                (order_id, vertical, status, total_xpf, campaign_name, lp_slug,
                 product_icon, product_name, contact, delivery, design_data, snapshots, mode, note)
             VALUES
                (:oid, :vert, :stat, :tot, :camp, :slug,
                 :icon, :prod, :contact, :delivery, :design, :snaps, :mode, :note)
             ON DUPLICATE KEY UPDATE
                status       = VALUES(status),
                total_xpf    = VALUES(total_xpf),
                contact      = VALUES(contact),
                delivery     = VALUES(delivery),
                design_data  = COALESCE(VALUES(design_data), design_data),
                snapshots    = COALESCE(VALUES(snapshots), snapshots),
                note         = IF(VALUES(note) != '' AND VALUES(note) IS NOT NULL, VALUES(note), note),
                updated_at   = NOW()"
        );
        $stmt->execute([
            ':oid'      => $orderId,
            ':vert'     => $vertical,
            ':stat'     => $status,
            ':tot'      => $total,
            ':camp'     => $campName,
            ':slug'     => $lpSlug,
            ':icon'     => $icon,
            ':prod'     => $prodName,
            ':contact'  => $contact,
            ':delivery' => $delivery,
            ':design'   => $design,
            ':snaps'    => $snaps,
            ':mode'     => $mode,
            ':note'     => $note,
        ]);
        return ['ok' => true, 'order_id' => $orderId, 'id' => (int)$this->pdo->lastInsertId()];
    }

    /* ── Mise à jour statut / note ───────────────────────────── */
    public function update($id, array $body): array {
        $set  = ['updated_at = NOW()'];
        $bind = [':id' => $id];
        foreach (['status', 'note'] as $f) {
            if (array_key_exists($f, $body)) {
                $set[]      = "{$f} = :{$f}";
                $bind[":{$f}"] = $body[$f];
            }
        }
        $this->pdo->prepare(
            "UPDATE hcs_orders SET " . implode(', ', $set) .
            " WHERE order_id = :id OR id = :id"
        )->execute($bind);
        return ['ok' => true];
    }

    /* ── Suppression ─────────────────────────────────────────── */
    public function delete($id): void {
        $this->pdo->prepare(
            "DELETE FROM hcs_orders WHERE order_id = :id OR id = :id2"
        )->execute([':id' => $id, ':id2' => $id]);
    }

    /* ── Recherche full-text ─────────────────────────────────── */
    public function search(string $q): array {
        $like = '%' . $q . '%';
        $stmt = $this->pdo->prepare(
            "SELECT id, order_id, vertical, status, total_xpf, campaign_name, lp_slug,
                    product_icon, product_name, contact, delivery, design_data, snapshots,
                    mode, note, created_at
             FROM hcs_orders
             WHERE order_id LIKE :q1
                OR campaign_name LIKE :q2
                OR product_name  LIKE :q3
                OR JSON_UNQUOTE(JSON_EXTRACT(contact, '$.name'))  LIKE :q4
                OR JSON_UNQUOTE(JSON_EXTRACT(contact, '$.email')) LIKE :q5
             ORDER BY created_at DESC LIMIT 50"
        );
        $stmt->execute([':q1'=>$like,':q2'=>$like,':q3'=>$like,':q4'=>$like,':q5'=>$like]);
        return [
            'items' => array_map([$this, 'decode'], $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'query' => $q,
            'table' => 'hcs_orders',
        ];
    }

    /* ── Décodage JSON ───────────────────────────────────────── */
    private function decode(array $row): array {
        foreach (['contact', 'delivery', 'design_data', 'snapshots'] as $col) {
            if (isset($row[$col]) && is_string($row[$col]) && $row[$col] !== '') {
                $row[$col] = json_decode($row[$col], true) ?? [];
            }
        }
        return $row;
    }
}
