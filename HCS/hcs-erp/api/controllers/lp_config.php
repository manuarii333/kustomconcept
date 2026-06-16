<?php
/* ================================================================
   HCS ERP — api/controllers/lp_config.php
   Config LP dynamique — lecture PUBLIQUE (sans auth) par slug,
   écriture authentifiée via POST/PUT standard.

   Table auto-créée :
     lp_config (slug, camp_id, camp_type, config_json, updated_at)

   Routes spéciales (sans auth, dans api/index.php) :
     GET /api/lp_config/slug/{slug}  → retourne config_json
   ================================================================ */

require_once __DIR__ . '/base.php';

class LpConfigController extends CRUDController {

    protected string $table = 'lp_config';

    protected function createTable(): void {
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS `lp_config` (
                `id`          INT AUTO_INCREMENT PRIMARY KEY,
                `slug`        VARCHAR(255) NOT NULL UNIQUE,
                `camp_id`     INT NOT NULL DEFAULT 0,
                `camp_type`   VARCHAR(20)  NOT NULL DEFAULT 'tshirt',
                `config_json` MEDIUMTEXT,
                `headline`    VARCHAR(500),
                `updated_at`  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    }

    /* ── GET public par slug (sans auth) ─────────────────────── */
    public function getBySlug(string $slug): array {
        $stmt = $this->db->prepare(
            "SELECT id, slug, camp_id, camp_type, config_json, headline, updated_at
               FROM `lp_config` WHERE slug = ?"
        );
        $stmt->execute([$slug]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            http_response_code(404);
            return ['error' => 'LP config introuvable pour le slug : ' . $slug];
        }
        /* Décoder config_json si présent */
        if (!empty($row['config_json'])) {
            $decoded = json_decode($row['config_json'], true);
            if (is_array($decoded)) {
                return array_merge(['_meta' => [
                    'slug'       => $row['slug'],
                    'camp_id'    => (int)$row['camp_id'],
                    'camp_type'  => $row['camp_type'],
                    'updated_at' => $row['updated_at'],
                ]], $decoded);
            }
        }
        return [
            '_meta' => [
                'slug'       => $row['slug'],
                'camp_id'    => (int)$row['camp_id'],
                'camp_type'  => $row['camp_type'],
                'updated_at' => $row['updated_at'],
            ],
            'products'    => [],
            'parcours'    => [],
        ];
    }

    /* ── Upsert par slug (POST → create or update) ────────────── */
    public function upsert(array $body): array {
        $this->createTable();
        $slug      = trim($body['slug'] ?? '');
        $campId    = (int)($body['camp_id']   ?? 0);
        $campType  = $body['camp_type']  ?? 'tshirt';
        $cfgJson   = isset($body['config_json']) ? $body['config_json'] : null;
        $headline  = $body['headline'] ?? null;

        if (!$slug) {
            http_response_code(400);
            return ['error' => 'slug requis'];
        }

        /* Encoder si on reçoit un array */
        if (is_array($cfgJson)) $cfgJson = json_encode($cfgJson, JSON_UNESCAPED_UNICODE);

        $stmt = $this->db->prepare("
            INSERT INTO `lp_config` (slug, camp_id, camp_type, config_json, headline)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              camp_id    = VALUES(camp_id),
              camp_type  = VALUES(camp_type),
              config_json= VALUES(config_json),
              headline   = VALUES(headline),
              updated_at = CURRENT_TIMESTAMP
        ");
        $stmt->execute([$slug, $campId, $campType, $cfgJson, $headline]);

        /* Retourner l'enregistrement mis à jour */
        return $this->getBySlug($slug);
    }

    public function create(array $body): array { return $this->upsert($body); }
    public function update($id, array $body): array {
        /* Chercher par id ou slug */
        if (!is_numeric($id)) { $body['slug'] = $id; return $this->upsert($body); }
        $stmt = $this->db->prepare("SELECT slug FROM `lp_config` WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) { http_response_code(404); return ['error' => 'Introuvable']; }
        $body['slug'] = $row['slug'];
        return $this->upsert($body);
    }
}
