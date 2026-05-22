<?php
/* ================================================================
   HCS ERP — api/controllers/triage_messages.php
   Gestion des messages triés par l'Agent 1 (Gmail + Messenger).
   ================================================================ */

class TriageMessagesController extends BaseController {

    protected string $table = 'triage_messages';
    protected array $searchFields = ['expediteur', 'message', 'categorie'];

    /* ----------------------------------------------------------------
       LISTE — GET /api/triage_messages
       Paramètres optionnels :
         today=1        → messages du jour uniquement
         days=N         → N derniers jours (défaut : tous)
         canal=gmail|messenger
         categorie=DEVIS|INFO_SERVICES|…
       ---------------------------------------------------------------- */
    public function getAll(array $params = []): array {
        $pdo   = $this->db->getPdo();
        $where = [];
        $bind  = [];

        if (!empty($params['today'])) {
            $where[] = 'DATE(created_at) = CURDATE()';
        } elseif (!empty($params['days'])) {
            $days    = max(1, min(90, (int)$params['days']));
            $where[] = 'created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)';
            $bind[]  = $days;
        }

        if (!empty($params['canal'])) {
            $where[] = 'canal = ?';
            $bind[]  = $params['canal'];
        }
        if (!empty($params['categorie'])) {
            $where[] = 'categorie = ?';
            $bind[]  = $params['categorie'];
        }

        $sql = "SELECT * FROM `triage_messages`";
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY created_at DESC LIMIT 200';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return ['items' => $rows, 'table' => $this->table, 'count' => count($rows)];
    }

    /* ----------------------------------------------------------------
       GET /api/triage_messages/today
       Raccourci : messages du jour courant
       ---------------------------------------------------------------- */
    public function today(): array {
        return $this->getAll(['today' => '1']);
    }

    /* ----------------------------------------------------------------
       GET /api/triage_messages/stats?days=7
       Retourne :
         - daily[]   : volume par jour (gmail / messenger / total)
         - categories[]: comptage par catégorie (aujourd'hui)
       ---------------------------------------------------------------- */
    public function stats(array $params = []): array {
        $days = max(1, min(90, (int)($params['days'] ?? 7)));
        return $this->weekStats($days);
    }

    /* ----------------------------------------------------------------
       Calcul interne des stats hebdo
       ---------------------------------------------------------------- */
    private function weekStats(int $days): array {
        $pdo = $this->db->getPdo();

        /* Volumes par jour */
        $stmt = $pdo->prepare(
            "SELECT DATE(created_at)            AS jour,
                    SUM(canal = 'gmail')        AS gmail,
                    SUM(canal = 'messenger')    AS messenger,
                    COUNT(*)                    AS total
             FROM triage_messages
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             GROUP BY DATE(created_at)
             ORDER BY jour ASC"
        );
        $stmt->execute([$days]);
        $daily = $stmt->fetchAll(PDO::FETCH_ASSOC);

        /* Catégories aujourd'hui */
        $stmt2 = $pdo->prepare(
            "SELECT categorie, COUNT(*) AS nb
             FROM triage_messages
             WHERE DATE(created_at) = CURDATE()
             GROUP BY categorie"
        );
        $stmt2->execute();
        $categories = $stmt2->fetchAll(PDO::FETCH_ASSOC);

        return [
            'days'       => $days,
            'daily'      => $daily,
            'categories' => $categories,
        ];
    }
}
