<?php
/* ================================================================
   HCS ERP — api/controllers/ventes_caisse.php
   Table : ventes_caisse  (transactions du point de vente)
   ================================================================ */

require_once __DIR__ . '/base.php';

class VentesCaisseController extends BaseController {

    protected string $table = 'ventes_caisse';

    protected array $searchFields = [
        'ref', 'client_nom', 'mode_paiement', 'operateur'
    ];

    /* ----------------------------------------------------------------
       SURCHARGE getAll : filtre par date + mode + session caisse
       ---------------------------------------------------------------- */
    public function getAll(array $params = []): array {
        $conditions = [];
        $bindings   = [];

        if (!empty($params['date_debut'])) {
            $conditions[] = '`date` >= ?';
            $bindings[]   = $params['date_debut'];
        }
        if (!empty($params['date_fin'])) {
            $conditions[] = '`date` <= ?';
            $bindings[]   = $params['date_fin'];
        }
        if (!empty($params['session_caisse_id'])) {
            $conditions[] = '`session_caisse_id` = ?';
            $bindings[]   = (int)$params['session_caisse_id'];
        }
        if (isset($params['annulee'])) {
            $conditions[] = '`annulee` = ?';
            $bindings[]   = (int)$params['annulee'];
        }

        $sort  = $this->sanitizeColumn($params['sort']  ?? 'id');
        $order = strtoupper($params['order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';
        $limit = min((int)($params['limit'] ?? 500), 2000);

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        $sql   = "SELECT * FROM `{$this->table}` {$where} ORDER BY `{$sort}` {$order} LIMIT {$limit}";

        $rows = $this->db->query($sql, $bindings)->fetchAll();
        $rows = array_map([$this, 'decodeJsonFields'], $rows);

        return ['items' => $rows, 'table' => $this->table, 'total' => count($rows)];
    }

    /* ----------------------------------------------------------------
       STATS PAR PÉRIODE : GET /api/ventes_caisse/stats?date_debut=&date_fin=
       Retourne les agrégats par mode de paiement + total journalier.
       ---------------------------------------------------------------- */
    public function stats(array $params = []): array {
        $debut = $params['date_debut'] ?? date('Y-m-01');
        $fin   = $params['date_fin']   ?? date('Y-m-d');
        $pdo   = $this->db->getPdo();

        /* Totaux globaux */
        $s = $pdo->prepare(
            "SELECT
                COUNT(*)                    AS nb_ventes,
                COALESCE(SUM(total_ttc),0)  AS total_ttc,
                COALESCE(SUM(total_ht),0)   AS total_ht,
                COALESCE(SUM(total_tva),0)  AS total_tva,
                COALESCE(SUM(total_remise),0) AS total_remise
             FROM ventes_caisse
             WHERE date BETWEEN ? AND ? AND annulee = 0"
        );
        $s->execute([$debut, $fin]);
        $global = $s->fetch();

        /* Ventilation par mode de paiement */
        $s2 = $pdo->prepare(
            "SELECT mode_paiement,
                COUNT(*)                   AS nb,
                COALESCE(SUM(total_ttc),0) AS total
             FROM ventes_caisse
             WHERE date BETWEEN ? AND ? AND annulee = 0
             GROUP BY mode_paiement ORDER BY total DESC"
        );
        $s2->execute([$debut, $fin]);
        $parMode = $s2->fetchAll();

        /* Totaux par jour */
        $s3 = $pdo->prepare(
            "SELECT date,
                COUNT(*)                   AS nb,
                COALESCE(SUM(total_ttc),0) AS total
             FROM ventes_caisse
             WHERE date BETWEEN ? AND ? AND annulee = 0
             GROUP BY date ORDER BY date ASC"
        );
        $s3->execute([$debut, $fin]);
        $parJour = $s3->fetchAll();

        return [
            'periode'  => ['debut' => $debut, 'fin' => $fin],
            'global'   => $global,
            'par_mode' => $parMode,
            'par_jour' => $parJour,
        ];
    }

    /* ----------------------------------------------------------------
       ANNULATION : PUT /api/ventes_caisse/{id}/annuler
       ---------------------------------------------------------------- */
    public function annuler(int $id, array $body): array {
        $vente = $this->getOne($id);

        if ($vente['annulee']) {
            http_response_code(400);
            throw new RuntimeException('Vente déjà annulée.');
        }

        return $this->update($id, [
            'annulee'          => 1,
            'motif_annulation' => $body['motif'] ?? 'Annulation manuelle',
        ]);
    }
}
