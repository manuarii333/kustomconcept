<?php
/* ================================================================
   HCS ERP — api/controllers/sessions_caisse.php
   Table : sessions_caisse  (journées de caisse / Z de caisse)
   ================================================================ */

require_once __DIR__ . '/base.php';

class SessionsCaisseController extends BaseController {

    protected string $table = 'sessions_caisse';

    protected array $searchFields = ['date', 'operateur', 'statut'];

    /* ----------------------------------------------------------------
       SESSION DU JOUR — GET /api/sessions_caisse/today
       Retourne la session ouverte du jour ou null.
       ---------------------------------------------------------------- */
    public function today(): array {
        $today = date('Y-m-d');
        $row   = $this->db->query(
            "SELECT * FROM sessions_caisse WHERE date = ? AND statut = 'ouverte' LIMIT 1",
            [$today]
        )->fetch();

        if (!$row) {
            return ['session' => null, 'date' => $today];
        }

        /* Ajouter les totaux en temps réel des ventes liées */
        $row = array_merge($row, $this->_recapVentes($row['id']));
        return ['session' => $row, 'date' => $today];
    }

    /* ----------------------------------------------------------------
       OUVERTURE — POST /api/sessions_caisse
       Crée une nouvelle session pour aujourd'hui.
       ---------------------------------------------------------------- */
    public function create(array $body): array {
        $today = $body['date'] ?? date('Y-m-d');

        /* Vérifier qu'aucune session ouverte n'existe pour cette date */
        $existing = $this->db->query(
            "SELECT id FROM sessions_caisse WHERE date = ? AND statut = 'ouverte' LIMIT 1",
            [$today]
        )->fetch();

        if ($existing) {
            http_response_code(409);
            throw new RuntimeException("Une session caisse est déjà ouverte pour le {$today}.");
        }

        $body['statut']       = 'ouverte';
        $body['fonds_initial'] = (float)($body['fonds_initial'] ?? 0);

        return parent::create($body);
    }

    /* ----------------------------------------------------------------
       FERMETURE (Z de caisse) — PUT /api/sessions_caisse/{id}/fermer
       Calcule les totaux, enregistre le fonds final, ferme la session.
       ---------------------------------------------------------------- */
    public function fermer(int $id, array $body): array {
        $session = $this->getOne($id);

        if ($session['statut'] !== 'ouverte') {
            http_response_code(400);
            throw new RuntimeException('Session déjà fermée.');
        }

        /* Totaux réels depuis ventes_caisse */
        $totaux = $this->_recapVentes($id);

        $fondsFinal  = (float)($body['fonds_final'] ?? 0);
        $fondsInit   = (float)($session['fonds_initial'] ?? 0);
        /* Écart = argent compté en caisse - (fonds initial + total espèces théorique) */
        $ecart = $fondsFinal - ($fondsInit + (float)($totaux['total_especes'] ?? 0));

        return $this->update($id, array_merge($totaux, [
            'statut'      => 'fermee',
            'fonds_final' => $fondsFinal,
            'ecart_caisse'=> round($ecart, 2),
            'notes'       => $body['notes'] ?? null,
        ]));
    }

    /* ----------------------------------------------------------------
       RÉCAPITULATIF VENTES D'UNE SESSION
       ---------------------------------------------------------------- */
    private function _recapVentes(int $sessionId): array {
        $pdo = $this->db->getPdo();

        $s = $pdo->prepare(
            "SELECT
                COUNT(*)                              AS nb_ventes,
                COALESCE(SUM(total_ht),0)             AS total_ht,
                COALESCE(SUM(total_tva),0)            AS total_tva,
                COALESCE(SUM(total_ttc),0)            AS total_ttc,
                COALESCE(SUM(CASE WHEN mode_paiement='Espèces'      AND annulee=0 THEN total_ttc ELSE 0 END),0) AS total_especes,
                COALESCE(SUM(CASE WHEN mode_paiement='Carte bancaire' AND annulee=0 THEN total_ttc ELSE 0 END),0) AS total_carte,
                COALESCE(SUM(CASE WHEN mode_paiement='Virement'     AND annulee=0 THEN total_ttc ELSE 0 END),0) AS total_virement,
                COALESCE(SUM(CASE WHEN mode_paiement='Chèque'       AND annulee=0 THEN total_ttc ELSE 0 END),0) AS total_cheque
             FROM ventes_caisse WHERE session_caisse_id = ? AND annulee = 0"
        );
        $s->execute([$sessionId]);
        $row = $s->fetch();

        /* Casting numérique */
        foreach (['nb_ventes','total_ht','total_tva','total_ttc',
                  'total_especes','total_carte','total_virement','total_cheque'] as $f) {
            $row[$f] = round((float)($row[$f] ?? 0), 2);
        }

        return $row;
    }
}
