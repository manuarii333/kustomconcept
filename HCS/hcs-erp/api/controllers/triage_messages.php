<?php
/* ================================================================
   HCS ERP — api/controllers/triage_messages.php
   Gestion des messages triés par l'Agent 1 (Gmail + Messenger).
   ================================================================ */

if (!class_exists('BaseController')) {
    require_once __DIR__ . '/base.php';
}

class TriageMessagesController extends BaseController {

    protected string $table = 'triage_messages';
    protected array $searchFields = ['expediteur', 'message', 'categorie'];

    /* Canaux valides */
    private const CANAUX_VALIDES    = ['gmail', 'messenger'];
    /* Catégories valides */
    private const CATEGORIES_VALIDES = ['DEVIS','INFO_SERVICES','INFO_PRODUITS','MOCKUP','TRAITEMENT_IMAGE'];

    /* ----------------------------------------------------------------
       LISTE — GET /api/triage_messages
       Paramètres optionnels :
         today=1        → messages du jour uniquement
         days=N         → N derniers jours (défaut : tous)
         canal=gmail|messenger
         categorie=DEVIS|INFO_SERVICES|…
         limit=N        → max lignes (défaut 200, max 500)
         offset=N       → pagination
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

        if (!empty($params['canal']) && in_array($params['canal'], self::CANAUX_VALIDES, true)) {
            $where[] = 'canal = ?';
            $bind[]  = $params['canal'];
        }
        if (!empty($params['categorie']) && in_array($params['categorie'], self::CATEGORIES_VALIDES, true)) {
            $where[] = 'categorie = ?';
            $bind[]  = $params['categorie'];
        }

        $limit  = min((int)($params['limit']  ?? 200), 500);
        $offset = max(0, (int)($params['offset'] ?? 0));

        $sql = "SELECT * FROM `triage_messages`";
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' ORDER BY created_at DESC LIMIT ' . $limit . ' OFFSET ' . $offset;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($bind);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return ['items' => $rows, 'table' => $this->table, 'count' => count($rows),
                'limit' => $limit, 'offset' => $offset];
    }

    /* ----------------------------------------------------------------
       CRÉATION — validation canal + catégorie avant insert
       ---------------------------------------------------------------- */
    public function create(array $data): array {
        if (isset($data['canal']) && !in_array($data['canal'], self::CANAUX_VALIDES, true)) {
            http_response_code(422);
            throw new RuntimeException('canal invalide — valeurs acceptées : ' . implode(', ', self::CANAUX_VALIDES));
        }
        if (isset($data['categorie']) && !in_array($data['categorie'], self::CATEGORIES_VALIDES, true)) {
            http_response_code(422);
            throw new RuntimeException('categorie invalide — valeurs acceptées : ' . implode(', ', self::CATEGORIES_VALIDES));
        }
        /* Tronquer le message à 500 chars pour éviter les abus */
        if (isset($data['message'])) {
            $data['message'] = mb_substr((string)$data['message'], 0, 500);
        }
        return parent::create($data);
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
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        /* Indexer par date pour remplissage des jours vides */
        $byDate = [];
        foreach ($rows as $r) {
            $byDate[$r['jour']] = $r;
        }

        /* Générer toutes les dates de la période (J-N … aujourd'hui) */
        $daily = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $daily[] = $byDate[$date] ?? [
                'jour'      => $date,
                'gmail'     => '0',
                'messenger' => '0',
                'total'     => '0',
            ];
        }

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
