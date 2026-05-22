<?php
/* ================================================================
   HCS ERP — api/controllers/token.php
   Endpoint d'authentification : génère un jeton API signé (24h).

   Endpoint : POST /api/token  (sans x-api-key — c'est l'endpoint auth)
   Corps    : { "login": "grace", "mdpHash": "abc123..." }

   Configuration requise dans api/.env :
     API_TOKEN_SECRET=un-secret-long-et-aleatoire-min-32-chars
     AUTH_USERS=grace:HASH_ICI,admin:HASH_ICI

   Pour obtenir le mdpHash d'un mot de passe, ouvrir la console
   du navigateur sur l'ERP et taper :
     window._hashMdp('ton_mot_de_passe')

   Le jeton retourné remplace la clé statique 'hcs-erp-2026'
   dans window.MYSQL.apiKey pour la durée de la session.
   ================================================================ */

class TokenController {

    /** Durée de validité du jeton en secondes (24h) */
    private const TTL = 86400;

    /** login → mdpHash autorisés (chargés depuis .env AUTH_USERS) */
    private array $authorizedUsers = [];

    /** Clé HMAC pour signer les jetons */
    private string $secret;

    public function __construct() {
        /* Charger la liste des utilisateurs autorisés depuis l'env */
        $usersEnv     = getenv('AUTH_USERS') ?: '';
        $this->secret = getenv('API_TOKEN_SECRET') ?: getenv('API_KEY') ?: '';

        if ($this->secret === '') {
            /* Fallback : utiliser API_KEY comme secret si API_TOKEN_SECRET absent */
            error_log('[HCS Token] API_TOKEN_SECRET manquant dans .env — utilisation de API_KEY comme fallback');
        }

        foreach (explode(',', $usersEnv) as $pair) {
            $parts = explode(':', trim($pair), 2);
            if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
                $this->authorizedUsers[trim($parts[0])] = trim($parts[1]);
            }
        }
    }

    /**
     * Traite la requête POST /api/token.
     * @param array $body Corps JSON décodé
     */
    public function handle(array $body): void {
        $login   = trim($body['login']   ?? '');
        $mdpHash = trim($body['mdpHash'] ?? '');

        /* Validation des champs */
        if ($login === '' || $mdpHash === '') {
            http_response_code(400);
            echo json_encode(['error' => 'login et mdpHash sont requis']);
            return;
        }

        /* Vérification des identifiants */
        $expectedHash = $this->authorizedUsers[$login] ?? null;

        if ($expectedHash === null) {
            /* Utilisateur inconnu — même message qu'un mauvais mot de passe (pas d'énumération) */
            http_response_code(401);
            echo json_encode(['error' => 'Identifiants invalides']);
            return;
        }

        /* Comparaison en temps constant (anti timing-attack) */
        if (!hash_equals($expectedHash, $mdpHash)) {
            http_response_code(401);
            echo json_encode(['error' => 'Identifiants invalides']);
            return;
        }

        /* Si AUTH_USERS n'est pas configuré, log un avertissement et refuse */
        if (empty($this->authorizedUsers)) {
            http_response_code(503);
            echo json_encode([
                'error'  => 'AUTH_USERS non configuré dans api/.env',
                'detail' => 'Ajouter AUTH_USERS=login:hash dans .env et API_TOKEN_SECRET=secret'
            ]);
            return;
        }

        /* Générer le jeton signé */
        $expiry  = time() + self::TTL;
        $payload = $login . ':' . $expiry;
        $sig     = hash_hmac('sha256', $payload, $this->secret);
        $token   = base64_encode($payload . ':' . $sig);

        http_response_code(200);
        echo json_encode([
            'token'  => $token,
            'expiry' => $expiry,
            'ttl'    => self::TTL,
            'login'  => $login,
        ]);
    }

    /**
     * Vérifie qu'un jeton est valide (utilisable par d'autres endpoints si besoin).
     * @param string $token Jeton base64
     * @return string|null Login si valide, null sinon
     */
    public static function verify(string $token, string $secret): ?string {
        $decoded = base64_decode($token, true);
        if ($decoded === false) return null;

        /* Format attendu : login:expiry:signature */
        $parts = explode(':', $decoded, 3);
        if (count($parts) !== 3) return null;

        [$login, $expiry, $sig] = $parts;

        /* Vérifier expiration */
        if ((int) $expiry < time()) return null;

        /* Vérifier signature */
        $payload     = $login . ':' . $expiry;
        $expectedSig = hash_hmac('sha256', $payload, $secret);
        if (!hash_equals($expectedSig, $sig)) return null;

        return $login;
    }
}
