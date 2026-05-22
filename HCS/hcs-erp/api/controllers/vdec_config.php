<?php
/* ================================================================
   HCS ERP — api/controllers/vdec_config.php
   Stockage configuration admin Déco Véhicule :
   - 3 catégories de véhicules (icône, modèle, 4 vues image URL)
   - Logos préchargés (URL serveur)
   - Polices disponibles

   GET  /api/vdec_config       → retourne la config complète
   POST /api/vdec_config       → sauvegarde la config (upsert)
   ================================================================ */

class VdecConfigController {

    private PDO $pdo;

    public function __construct($db) {
        /* Accepte un objet Database ou un PDO direct */
        $this->pdo = ($db instanceof PDO) ? $db : $db->getPdo();
        $this->ensureTable();
    }

    /* ── Création automatique de la table au premier appel ── */
    private function ensureTable(): void {
        $this->pdo->exec("CREATE TABLE IF NOT EXISTS vdec_config (
            cfg_key    VARCHAR(50)  NOT NULL PRIMARY KEY,
            cfg_value  LONGTEXT     NOT NULL,
            updated_at DATETIME     DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }

    /* ── GET /api/vdec_config → config complète ── */
    public function getAll(array $params = []): array {
        $stmt = $this->pdo->prepare(
            "SELECT cfg_value, updated_at FROM vdec_config WHERE cfg_key = 'main' LIMIT 1"
        );
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['ok' => true, 'data' => null, 'updated_at' => null];
        }

        $data = json_decode($row['cfg_value'], true);
        return [
            'ok'         => true,
            'data'       => $data,
            'updated_at' => $row['updated_at'],
        ];
    }

    /* ── POST /api/vdec_config → upsert config ── */
    public function create(array $body): array {
        /* Le body EST la config (cats + logos + fonts) */
        $json = json_encode($body, JSON_UNESCAPED_UNICODE);

        $stmt = $this->pdo->prepare(
            "INSERT INTO vdec_config (cfg_key, cfg_value)
             VALUES ('main', ?)
             ON DUPLICATE KEY UPDATE cfg_value = VALUES(cfg_value),
                                     updated_at = NOW()"
        );
        $stmt->execute([$json]);

        return ['ok' => true, 'saved' => true];
    }

    /* Méthodes stub requises par le dispatcher (non utilisées) */
    public function getOne($id): array { return $this->getAll(); }
    public function update($id, array $body): array { return $this->create($body); }
    public function delete($id): void {}
    public function search(string $q): array { return $this->getAll(); }
}
