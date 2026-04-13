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
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-api-key');

/* Réponse anticipée pour les requêtes préliminaires CORS (preflight) */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ----------------------------------------------------------------
   2. VÉRIFICATION CLÉ API
   Le front envoie le header : x-api-key: hcs-erp-2026
   ---------------------------------------------------------------- */
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

if ($apiKey !== API_KEY) {
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
$action = null;
$id     = null;
if ($segment2 === 'search') {
    $action = 'search';
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
    'employes',
    'conges',
    'logos',
    'commandes_atelier',
    'planning_atelier',
    'landing_pages',
    'assets',
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
    /* Erreur inattendue */
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur', 'detail' => $e->getMessage()]);
}
