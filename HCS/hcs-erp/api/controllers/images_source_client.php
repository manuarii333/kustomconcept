<?php
/* ================================================================
   HCS ERP — api/controllers/images_source_client.php
   Table : images_source_client (logos et visuels sources par client)
   Colonnes : id, client_id, client_nom, emplacement,
              fichier_nom, image_base64, date_ajout
   ================================================================ */

require_once __DIR__ . '/base.php';

class ImagesSourceClientController extends BaseController {

    protected string $table = 'images_source_client';

    protected array $searchFields = [
        'client_nom', 'emplacement', 'fichier_nom'
    ];

    /**
     * Surcharge create() pour ne pas injecter created_at
     * (colonne absente de cette table).
     */
    public function create(array $data): array {
        $data = $this->sanitizeData($data);

        if (empty($data)) {
            throw new InvalidArgumentException('Aucune donnée valide fournie');
        }

        $cols         = implode(', ', array_map(fn($c) => "`{$c}`", array_keys($data)));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $this->db->query(
            "INSERT INTO `{$this->table}` ({$cols}) VALUES ({$placeholders})",
            array_values($data)
        );

        return $this->getOne($this->db->lastInsertId());
    }
}
