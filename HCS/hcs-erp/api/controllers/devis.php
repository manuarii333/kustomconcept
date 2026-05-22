<?php
/* ================================================================
   HCS ERP — api/controllers/devis.php
   Table : devis (devis commerciaux)
   ================================================================ */

require_once __DIR__ . '/base.php';

class DevisController extends BaseController {

    protected string $table = 'devis';

    protected bool $softDelete = false;

    protected array $searchFields = [
        'ref', 'client_nom', 'statut', 'notes'
    ];

    /** Override : search sans deleted_at (colonne inexistante dans cette table) */
    public function search(string $q): array {
        if ($q === '') return $this->getAll();

        $sql = "SELECT * FROM `devis`
                WHERE (`ref` LIKE ? OR `client_nom` LIKE ? OR `statut` LIKE ? OR `notes` LIKE ?)
                ORDER BY id DESC LIMIT 200";
        $like = "%{$q}%";
        $stmt = $this->db->query($sql, [$like, $like, $like, $like]);
        return ['items' => $stmt->fetchAll(), 'query' => $q, 'table' => 'devis'];
    }
}
