<?php
/* ================================================================
   HCS ERP — api/controllers/compte_client.php
   Compatibilité PHP 7.4+
   Portail client public : magic link, mot de passe, données fidélité.
   Routes publiques (pas de clé API admin requise).
   Actions POST : request_link | verify | set_password | login
   ================================================================ */

class CompteClientController {

    private PDO $pdo;

    public function __construct(PDO $pdo) {
        $this->pdo = $pdo;
    }

    public function handle(string $method, array $body): void {
        if ($method === 'GET') {
            $this->getByToken($_GET['token'] ?? '');
        } else {
            $action = $body['action'] ?? '';
            switch ($action) {
                case 'request_link':  $this->requestLink($body);  break;
                case 'verify':        $this->verify($body);        break;
                case 'set_password':  $this->setPassword($body);   break;
                case 'login':         $this->login($body);         break;
                default: $this->json(['error' => 'Action inconnue'], 400);
            }
        }
    }

    /* ── Générer un lien magique ─────────────────────────────── */
    private function requestLink(array $body): void {
        $email = strtolower(trim($body['email'] ?? ''));
        if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->json(['error' => 'Email invalide'], 400);
            return;
        }

        $token  = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $stmt = $this->pdo->prepare("SELECT id, name FROM fidelite_clients WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $upd = $this->pdo->prepare("UPDATE fidelite_clients SET token = ?, token_expiry = ?, updated_at = NOW() WHERE email = ?");
            $upd->execute([$token, $expiry, $email]);
        } else {
            $ins = $this->pdo->prepare("INSERT INTO fidelite_clients (email, token, token_expiry, tier, points, total_xpf, password_set, updated_at) VALUES (?, ?, ?, 'Rookie', 0, 0, 0, NOW())");
            $ins->execute([$email, $token, $expiry]);
        }

        $this->json([
            'ok'     => true,
            'token'  => $token,
            'expiry' => $expiry,
            'name'   => $existing['name'] ?? null,
        ]);
    }

    /* ── Vérifier un token (lien magique ou session) ─────────── */
    private function verify(array $body): void {
        $client = $this->clientByToken($body['token'] ?? '');
        if (!$client) {
            $this->json(['error' => 'Lien invalide ou expiré'], 401);
            return;
        }
        $this->json(['ok' => true, 'client' => $this->sanitize($client), 'history' => $this->history($client['email'])]);
    }

    /* ── Définir / modifier le mot de passe ─────────────────── */
    private function setPassword(array $body): void {
        $token    = $body['token'] ?? '';
        $password = $body['password'] ?? '';

        if (mb_strlen($password) < 6) {
            $this->json(['error' => 'Mot de passe trop court (6 caractères minimum)'], 400);
            return;
        }

        $client = $this->clientByToken($token);
        if (!$client) {
            $this->json(['error' => 'Lien invalide ou expiré'], 401);
            return;
        }

        $hash     = password_hash($password, PASSWORD_BCRYPT);
        $newToken = bin2hex(random_bytes(32));
        $expiry   = date('Y-m-d H:i:s', strtotime('+30 days'));

        $this->pdo->prepare("UPDATE fidelite_clients SET password_hash = ?, password_set = 1, token = ?, token_expiry = ?, updated_at = NOW() WHERE email = ?")
             ->execute([$hash, $newToken, $expiry, $client['email']]);

        $updated = $client;
        $updated['password_set'] = 1;
        $this->json(['ok' => true, 'token' => $newToken, 'client' => $this->sanitize($updated), 'history' => $this->history($client['email'])]);
    }

    /* ── Connexion email + mot de passe ─────────────────────── */
    private function login(array $body): void {
        $email    = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        $stmt = $this->pdo->prepare("SELECT * FROM fidelite_clients WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        $client = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$client || !$client['password_hash'] || !password_verify($password, $client['password_hash'])) {
            $this->json(['error' => 'Email ou mot de passe incorrect'], 401);
            return;
        }

        $token  = bin2hex(random_bytes(32));
        $expiry = date('Y-m-d H:i:s', strtotime('+30 days'));
        $this->pdo->prepare("UPDATE fidelite_clients SET token = ?, token_expiry = ?, updated_at = NOW() WHERE email = ?")
             ->execute([$token, $expiry, $email]);

        $this->json(['ok' => true, 'token' => $token, 'client' => $this->sanitize($client), 'history' => $this->history($email)]);
    }

    /* ── GET avec token en param ─────────────────────────────── */
    private function getByToken(string $token): void {
        $client = $this->clientByToken($token);
        if (!$client) {
            $this->json(['error' => 'Token invalide'], 401);
            return;
        }
        $this->json(['ok' => true, 'client' => $this->sanitize($client), 'history' => $this->history($client['email'])]);
    }

    /* ── Helpers ─────────────────────────────────────────────── */
    private function clientByToken(string $token) {
        if (!$token || strlen($token) < 10) return false;
        $stmt = $this->pdo->prepare("SELECT * FROM fidelite_clients WHERE token = ? AND (token_expiry IS NULL OR token_expiry > NOW()) LIMIT 1");
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function history(string $email): array {
        $stmt = $this->pdo->prepare("SELECT * FROM fidelite_historique WHERE client_email = ? ORDER BY updated_at DESC LIMIT 30");
        $stmt->execute([$email]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function sanitize(array $client): array {
        /* Ne jamais retourner le hash du mot de passe au front */
        unset($client['password_hash']);
        return $client;
    }

    private function json(mixed $data, int $code = 200): void {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    }
}
