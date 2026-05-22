<?php
/* ================================================================
   HCS ERP — api/index.php
   Router principal REST PHP.

   Toutes les requêtes sont redirigées ici par .htaccess.

   Sécurité :
     - Vérifie le header x-api-key
     - Requêtes préparées PDO dans tous les controllers
     - Noms de colonnes filtrés (anti-injection dynamique)

   Routes disponibles :
     GET    /api/{resource}              → liste (getAll)
     GET    /api/{resource}/{id}         → un enregistrement (getOne)
     GET    /api/{resource}/search?q=…  → recherche full-text
     POST   /api/{resource}              → création
     PUT    /api/{resource}/{id}         → mise à jour
     DELETE /api/{resource}/{id}         → suppression
   ================================================================ */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/controllers/base.php';

/* ----------------------------------------------------------------
   1. HEADERS CORS
   Autorise l'ERP front (hébergé sur n'importe quel domaine)
   à appeler cette API via fetch()
   ---------------------------------------------------------------- */
header('Content-Type: application/json; charset=utf-8');

$_origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$_allowed = ['https://highcoffeeshirts.com', 'https://www.highcoffeeshirts.com'];
if (in_array($_origin, $_allowed, true) || (defined('DEV_MODE') && DEV_MODE)) {
    header('Access-Control-Allow-Origin: ' . ($_origin ?: $_allowed[0]));
} elseif ($_origin === '' || strpos($_origin, 'localhost') !== false || strpos($_origin, '127.0.0.1') !== false) {
    header('Access-Control-Allow-Origin: ' . ($_origin ?: '*'));
} else {
    header('Access-Control-Allow-Origin: https://highcoffeeshirts.com');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-api-key');

/* Réponse anticipée pour les requêtes préliminaires CORS (preflight) */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ----------------------------------------------------------------
   1b. ROUTES SPÉCIALES : sans clé API admin
   Traitement avant la vérification de clé.
   ---------------------------------------------------------------- */

/* POST /api/token — authentification ERP */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $_tokenPath = trim(preg_replace('#^.*/api/?#', '', strtok($_SERVER['REQUEST_URI'], '?')), '/');
    if ($_tokenPath === 'token') {
        $rawBody = file_get_contents('php://input');
        $body    = json_decode($rawBody, true) ?? [];
        require_once __DIR__ . '/controllers/token.php';
        (new TokenController())->handle($body);
        exit;
    }
}

/* GET|POST /api/compte_client — portail client public (magic link, login, données fidélité) */
$_ccUri  = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
$_ccSeg  = trim(preg_replace('#^.*/api/?#', '', $_ccUri), '/');
if ($_ccSeg === 'compte_client') {
    $rawBody = file_get_contents('php://input');
    $body    = json_decode($rawBody, true) ?? [];
    try {
        require_once __DIR__ . '/controllers/compte_client.php';
        $pdo = Database::getInstance()->getPdo();
        (new CompteClientController($pdo))->handle($_SERVER['REQUEST_METHOD'], $body);
    } catch (Throwable $e) {
        http_response_code(500);
        error_log('[HCS-API] compte_client error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        echo json_encode(['error' => 'Erreur serveur']);
    }
    exit;
}

/* ----------------------------------------------------------------
   2. VÉRIFICATION CLÉ API
   Accepte : clé statique (hcs-erp-2026) OU token HMAC valide
   généré par /api/token après authentification.
   ---------------------------------------------------------------- */
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

$_isStaticKey = ($apiKey === API_KEY);
$_isValidToken = false;

if (!$_isStaticKey && $apiKey !== '') {
    require_once __DIR__ . '/controllers/token.php';
    $_tokenSecret = getenv('API_TOKEN_SECRET') ?: API_KEY;
    $_isValidToken = (TokenController::verify($apiKey, $_tokenSecret) !== null);
}

if (!$_isStaticKey && !$_isValidToken) {
    http_response_code(401);
    echo json_encode(['error' => 'Clé API invalide ou manquante']);
    exit;
}

/* ----------------------------------------------------------------
   3. PARSAGE DE L'URL
   REQUEST_URI peut ressembler à : /erp/api/contacts/42
   On supprime la query string puis le préfixe jusqu'à /api/
   ---------------------------------------------------------------- */
$requestUri = $_SERVER['REQUEST_URI'];

/* Supprimer la query string (?q=...) */
$path = strtok($requestUri, '?');

/* Supprimer tout ce qui précède "api/" (préfixe variable selon hébergement) */
$path = preg_replace('#^.*/api/?#', '', $path);
$path = trim($path, '/');

/* Segments : ['contacts', '42'] ou ['contacts', 'search'] */
$segments = ($path !== '') ? explode('/', $path) : [];

$resource = $segments[0] ?? null;  /* Nom de la table */
$segment2 = $segments[1] ?? null;  /* ID ou action */

/* Différencier action spéciale "search" d'un ID numérique */
$action   = null;
$id       = null;
$segment3 = $segments[2] ?? null;  /* action sous-ressource ex: /sessions_caisse/5/fermer */

if ($segment2 === 'search') {
    $action = 'search';
} elseif ($segment2 === 'stats') {
    $action = 'stats';            /* GET /api/ventes_caisse/stats */
} elseif ($segment2 === 'today') {
    $action = 'today';            /* GET /api/sessions_caisse/today */
} elseif ($segment2 !== null && $segment3 !== null) {
    /* ex: PUT /api/sessions_caisse/5/fermer */
    $id     = $segment2;
    $action = $segment3;
} elseif ($segment2 !== null) {
    $id = $segment2;
}

/* ----------------------------------------------------------------
   4. TABLES AUTORISÉES
   Seules ces tables sont exposées via l'API.
   Un nom de table absent ici retourne une 404.
   ---------------------------------------------------------------- */
$allowedTables = [
    'contacts',
    'produits',
    'fournisseurs',
    'devis',
    'commandes',
    'factures',
    'bonsAchat',
    'employes',
    'conges',
    'logos',
    'commandes_atelier',
    'planning_atelier',
    'landing_pages',
    'assets',
    'taches_agents',
    'images_source_client',
    /* Finance Dashboard */
    'finance_transactions',
    'finance_charges',
    /* Rapport P&L */
    'pl_rapports',
    /* Sessions comptables (périodes comptables) */
    'sessions_comptables',
    /* Caisse POS */
    'ventes_caisse',
    'sessions_caisse',
    /* Planning Production */
    'planning_commandes',
    'planning_fournisseurs',
    'planning_achats',
    /* Andromeda Campaign */
    'lp_publiees',
    'lp_commandes',
    /* Déco Véhicule — config admin + commandes */
    'vdec_config',
    'vdec_commandes',
    /* Programme Fidélité */
    'fidelite_clients',
    'fidelite_historique',
    /* Triage & Réception (Agent 1) */
    'triage_messages',
];

if (!$resource || !in_array($resource, $allowedTables, true)) {
    http_response_code(404);
    echo json_encode([
        'error'       => "Ressource inconnue : " . ($resource ?? '(vide)'),
        'disponibles' => $allowedTables,
    ]);
    exit;
}

/* ----------------------------------------------------------------
   5. CHARGEMENT DU CONTROLLER
   Chaque table a son fichier dans controllers/{table}.php.
   Le nom de classe suit la convention : ContactsController,
   CommandesAtelierController, etc.
   ---------------------------------------------------------------- */
$controllerFile = __DIR__ . "/controllers/{$resource}.php";

if (!file_exists($controllerFile)) {
    http_response_code(500);
    echo json_encode(['error' => "Controller manquant pour `{$resource}`"]);
    exit;
}

require_once $controllerFile;

/* CamelCase : commandes_atelier → CommandesAtelier + Controller */
$className = str_replace('_', '', ucwords($resource, '_')) . 'Controller';

if (!class_exists($className)) {
    http_response_code(500);
    echo json_encode(['error' => "Classe PHP `{$className}` introuvable"]);
    exit;
}

/* ----------------------------------------------------------------
   6. INSTANCIATION + CORPS JSON
   ---------------------------------------------------------------- */
$db   = Database::getInstance();
$ctrl = new $className($db);

/* Corps de la requête (POST / PUT) */
$rawBody = file_get_contents('php://input');
$body    = json_decode($rawBody, true) ?? [];

/* ----------------------------------------------------------------
   7. DISPATCH vers la bonne méthode du controller
   ---------------------------------------------------------------- */
$method = $_SERVER['REQUEST_METHOD'];

try {

    if ($method === 'GET' && $action === 'search') {
        /* GET /api/contacts/search?q=dupont */
        $q      = trim($_GET['q'] ?? '');
        $result = $ctrl->search($q);

    } elseif ($method === 'GET' && $action === 'stats') {
        /* GET /api/ventes_caisse/stats?date_debut=&date_fin= */
        $result = method_exists($ctrl, 'stats') ? $ctrl->stats($_GET) : ['error' => 'Non supporté'];

    } elseif ($method === 'GET' && $action === 'today') {
        /* GET /api/sessions_caisse/today */
        $result = method_exists($ctrl, 'today') ? $ctrl->today() : ['error' => 'Non supporté'];

    } elseif ($method === 'PUT' && $id !== null && $action === 'fermer') {
        /* PUT /api/sessions_caisse/{id}/fermer */
        $result = method_exists($ctrl, 'fermer') ? $ctrl->fermer((int)$id, $body) : ['error' => 'Non supporté'];

    } elseif ($method === 'PUT' && $id !== null && $action === 'annuler') {
        /* PUT /api/ventes_caisse/{id}/annuler */
        $result = method_exists($ctrl, 'annuler') ? $ctrl->annuler((int)$id, $body) : ['error' => 'Non supporté'];

    } elseif ($method === 'GET' && $id !== null) {
        /* GET /api/contacts/42 */
        $result = $ctrl->getOne($id);

    } elseif ($method === 'GET') {
        /* GET /api/contacts?sort=nom&order=asc&limit=50 */
        $result = $ctrl->getAll($_GET);

    } elseif ($method === 'POST') {
        /* POST /api/contacts  { "nom": "Dupont", ... } */
        $result = $ctrl->create($body);
        http_response_code(201);

    } elseif ($method === 'PUT' && $id !== null) {
        /* PUT /api/contacts/42  { "email": "nouveau@mail.pf" } */
        $result = $ctrl->update($id, $body);

    } elseif ($method === 'DELETE' && $id !== null) {
        /* DELETE /api/contacts/42 */
        $ctrl->delete($id);
        http_response_code(204);
        exit;   /* 204 : corps vide */

    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode HTTP non autorisée pour cette route']);
        exit;
    }

    echo json_encode($result);

} catch (RuntimeException $e) {
    /* Erreur métier connue (ex : enregistrement introuvable → 404 déjà posé) */
    $code = http_response_code();
    if ($code === 200) http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);

} catch (Exception $e) {
    http_response_code(500);
    error_log('[HCS-API] Unexpected error: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    echo json_encode(['error' => 'Erreur serveur']);
}
