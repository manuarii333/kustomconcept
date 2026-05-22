<?php
/* ================================================================
   HCS ERP — api/controllers/sessions_comptables.php
   Table : sessions_comptables (périodes comptables)
   ================================================================ */

require_once __DIR__ . '/base.php';

class SessionsComptablesController extends BaseController {

    protected string $table = 'sessions_comptables';

    protected array $searchFields = [
        'nom', 'exercice', 'statut', 'description'
    ];

    /* ----------------------------------------------------------------
       SURCHARGE create : calcule les totaux à la volée depuis MySQL
       ---------------------------------------------------------------- */
    public function create(array $body): array {
        /* S'assurer que les dates sont présentes */
        if (empty($body['date_debut']) || empty($body['date_fin'])) {
            http_response_code(400);
            throw new RuntimeException('date_debut et date_fin sont obligatoires.');
        }
        if ($body['date_debut'] > $body['date_fin']) {
            http_response_code(400);
            throw new RuntimeException('date_debut doit être antérieure à date_fin.');
        }

        /* Exercice = année de début si non fourni */
        if (empty($body['exercice'])) {
            $body['exercice'] = substr($body['date_debut'], 0, 4);
        }

        /* Calculer les totaux sur la période */
        $totaux = $this->_calculerTotaux($body['date_debut'], $body['date_fin']);
        $body   = array_merge($body, $totaux);

        return parent::create($body);
    }

    /* ----------------------------------------------------------------
       ACTION SPÉCIALE : POST /api/sessions_comptables/{id}/calculer
       Recalcule les totaux d'une session depuis les données réelles.
       ---------------------------------------------------------------- */
    public function calculer(int $id): array {
        $session = $this->getOne($id);

        $totaux  = $this->_calculerTotaux($session['date_debut'], $session['date_fin']);
        $totaux['updated_at'] = date('Y-m-d H:i:s');

        return $this->update($id, $totaux);
    }

    /* ----------------------------------------------------------------
       ACTION SPÉCIALE : PUT /api/sessions_comptables/{id}/cloturer
       Clôture une session (statut → cloturee).
       ---------------------------------------------------------------- */
    public function cloturer(int $id, array $body): array {
        $session = $this->getOne($id);

        if ($session['statut'] === 'verrouillee') {
            http_response_code(400);
            throw new RuntimeException('Session verrouillée — impossible de la modifier.');
        }

        /* Recalcul final avant clôture */
        $totaux = $this->_calculerTotaux($session['date_debut'], $session['date_fin']);

        return $this->update($id, array_merge($totaux, [
            'statut'      => 'cloturee',
            'cloture_par' => $body['cloture_par'] ?? 'ERP',
            'cloture_at'  => date('Y-m-d H:i:s'),
        ]));
    }

    /* ----------------------------------------------------------------
       ACTION SPÉCIALE : PUT /api/sessions_comptables/{id}/verrouiller
       Verrouille une session (statut → verrouillee, irréversible).
       ---------------------------------------------------------------- */
    public function verrouiller(int $id, array $body): array {
        $session = $this->getOne($id);

        if ($session['statut'] === 'verrouillee') {
            http_response_code(400);
            throw new RuntimeException('Session déjà verrouillée.');
        }

        return $this->update($id, [
            'statut'      => 'verrouillee',
            'cloture_par' => $body['cloture_par'] ?? 'ERP',
            'cloture_at'  => date('Y-m-d H:i:s'),
        ]);
    }

    /* ----------------------------------------------------------------
       ACTION SPÉCIALE : GET /api/sessions_comptables/{id}/resume
       Retourne le résumé détaillé d'une session (documents par type).
       ---------------------------------------------------------------- */
    public function resume(int $id): array {
        $session = $this->getOne($id);
        $debut   = $session['date_debut'];
        $fin     = $session['date_fin'];
        $pdo     = $this->db->getPdo();

        /* Devis */
        $devis = $pdo->prepare(
            "SELECT statut, COUNT(*) AS nb, SUM(total_ttc) AS total
             FROM devis WHERE date BETWEEN ? AND ? GROUP BY statut"
        );
        $devis->execute([$debut, $fin]);
        $rowsDevis = $devis->fetchAll();

        /* Factures */
        $fac = $pdo->prepare(
            "SELECT statut, COUNT(*) AS nb, SUM(total_ttc) AS total
             FROM factures WHERE date BETWEEN ? AND ? GROUP BY statut"
        );
        $fac->execute([$debut, $fin]);
        $rowsFac = $fac->fetchAll();

        /* Charges */
        $charges = $pdo->prepare(
            "SELECT categorie, COUNT(*) AS nb, SUM(montant) AS total
             FROM finance_charges WHERE date BETWEEN ? AND ? GROUP BY categorie"
        );
        $charges->execute([$debut, $fin]);
        $rowsCharges = $charges->fetchAll();

        /* Transactions finance */
        $trans = $pdo->prepare(
            "SELECT canal, COUNT(*) AS nb, SUM(montant * nb) AS total
             FROM finance_transactions WHERE date BETWEEN ? AND ? GROUP BY canal"
        );
        $trans->execute([$debut, $fin]);
        $rowsTrans = $trans->fetchAll();

        return array_merge($session, [
            'resume' => [
                'devis'         => $rowsDevis,
                'factures'      => $rowsFac,
                'charges'       => $rowsCharges,
                'transactions'  => $rowsTrans,
            ]
        ]);
    }

    /* ----------------------------------------------------------------
       CALCUL INTERNE DES TOTAUX SUR UNE PÉRIODE
       Inclut : devis confirmés, factures ERP, ventes caisse, charges.
       ---------------------------------------------------------------- */
    private function _calculerTotaux(string $debut, string $fin): array {
        $pdo = $this->db->getPdo();

        /* Devis confirmés (hors caisse — la caisse crée ses propres ventes) */
        $s = $pdo->prepare(
            "SELECT COUNT(*) AS nb, COALESCE(SUM(total_ttc),0) AS total
             FROM devis WHERE date BETWEEN ? AND ? AND statut = 'Confirmé'"
        );
        $s->execute([$debut, $fin]);
        $d = $s->fetch();

        /* Factures ERP (source != caisse) */
        $s2 = $pdo->prepare(
            "SELECT COUNT(*) AS nb, COALESCE(SUM(total_ttc),0) AS total
             FROM factures WHERE date BETWEEN ? AND ?
             AND (source IS NULL OR source != 'caisse')"
        );
        $s2->execute([$debut, $fin]);
        $f = $s2->fetch();

        /* Factures ERP payées */
        $s3 = $pdo->prepare(
            "SELECT COALESCE(SUM(total_ttc),0) AS total
             FROM factures WHERE date BETWEEN ? AND ?
             AND statut IN ('Payé','Payé partiel')
             AND (source IS NULL OR source != 'caisse')"
        );
        $s3->execute([$debut, $fin]);
        $fp = $s3->fetch();

        /* Ventes caisse (table dédiée, hors annulations) */
        $s5 = $pdo->prepare(
            "SELECT COUNT(*) AS nb, COALESCE(SUM(total_ttc),0) AS total
             FROM ventes_caisse WHERE date BETWEEN ? AND ? AND annulee = 0"
        );
        $s5->execute([$debut, $fin]);
        $vc = $s5->fetch();

        /* Ventilation caisse par mode de paiement */
        $s6 = $pdo->prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN mode_paiement='Espèces'       THEN total_ttc ELSE 0 END),0) AS especes,
                COALESCE(SUM(CASE WHEN mode_paiement='Carte bancaire' THEN total_ttc ELSE 0 END),0) AS carte,
                COALESCE(SUM(CASE WHEN mode_paiement='Virement'      THEN total_ttc ELSE 0 END),0) AS virement,
                COALESCE(SUM(CASE WHEN mode_paiement='Chèque'        THEN total_ttc ELSE 0 END),0) AS cheque
             FROM ventes_caisse WHERE date BETWEEN ? AND ? AND annulee = 0"
        );
        $s6->execute([$debut, $fin]);
        $vcMode = $s6->fetch();

        /* Charges */
        $s4 = $pdo->prepare(
            "SELECT COALESCE(SUM(montant),0) AS total
             FROM finance_charges WHERE date BETWEEN ? AND ?"
        );
        $s4->execute([$debut, $fin]);
        $c = $s4->fetch();

        /* CA total = factures ERP + ventes caisse (la caisse est déjà encaissée) */
        $totalFacERP    = (float)($f['total'] ?? 0);
        $totalCaisse    = (float)($vc['total'] ?? 0);
        $totalFacPayERP = (float)($fp['total'] ?? 0);
        $totalCA        = $totalFacERP + $totalCaisse;
        $totalChg       = (float)($c['total'] ?? 0);
        $resultat       = round($totalCA - $totalChg, 2);
        $marge          = $totalCA > 0 ? round(($resultat / $totalCA) * 100, 2) : 0;

        return [
            /* Devis */
            'nb_devis'                  => (int)($d['nb'] ?? 0),
            'total_devis'               => round((float)($d['total'] ?? 0), 2),
            /* Factures ERP */
            'nb_factures'               => (int)($f['nb'] ?? 0),
            'total_factures_ttc'        => round($totalFacERP, 2),
            'total_factures_payees'     => round($totalFacPayERP, 2),
            /* Caisse */
            'nb_ventes_caisse'          => (int)($vc['nb'] ?? 0),
            'total_caisse_ttc'          => round($totalCaisse, 2),
            'caisse_especes'            => round((float)($vcMode['especes']  ?? 0), 2),
            'caisse_carte'              => round((float)($vcMode['carte']    ?? 0), 2),
            'caisse_virement'           => round((float)($vcMode['virement'] ?? 0), 2),
            'caisse_cheque'             => round((float)($vcMode['cheque']   ?? 0), 2),
            /* Charges */
            'total_charges'             => round($totalChg, 2),
            /* Résultat */
            'resultat_net'              => $resultat,
            'marge_nette'               => $marge,
        ];
    }
}
