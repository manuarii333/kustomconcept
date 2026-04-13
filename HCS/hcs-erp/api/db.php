<?php
/* ================================================================
   HCS ERP — api/db.php
   Connexion PDO MySQL unique (singleton).
   Expose aussi une fonction query($sql, $params) pour simplifier.
   ================================================================ */

require_once __DIR__ . '/config.php';

class Database {

    /* Instance unique (pattern Singleton) */
    private static $instance = null;

    /* Objet PDO sous-jacent */
    private $pdo;

    /* Constructeur privé : seul getInstance() peut créer l'objet */
    private function __construct() {
        $dsn = 'mysql:host=' . DB_HOST
             . ';dbname='    . DB_NAME
             . ';charset=utf8mb4';

        $options = [
            /* Lever des exceptions PHP en cas d'erreur SQL */
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            /* Retourner les lignes comme tableaux associatifs */
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            /* Désactiver l'émulation des requêtes préparées
               pour une vraie protection contre l'injection SQL */
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            /* Erreur critique : on stoppe immédiatement */
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'error'  => 'Connexion base de données impossible',
                'detail' => $e->getMessage()
            ]);
            exit;
        }
    }

    /**
     * Retourne l'instance unique de Database.
     * Crée la connexion au premier appel, réutilise ensuite.
     */
    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Exécute une requête préparée et retourne le Statement PDO.
     *
     * Exemple :
     *   $stmt = $db->query("SELECT * FROM contacts WHERE id = ?", [42]);
     *   $row  = $stmt->fetch();
     *
     * @param  string $sql    Requête SQL avec placeholders ?
     * @param  array  $params Valeurs à lier (dans l'ordre)
     * @return PDOStatement
     */
    public function query(string $sql, array $params = []): PDOStatement {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    /**
     * Retourne l'ID auto-incrémenté du dernier INSERT.
     */
    public function lastInsertId(): string {
        return $this->pdo->lastInsertId();
    }

    /**
     * Accès direct à l'objet PDO si besoin de transactions
     * ou d'opérations avancées.
     */
    public function getPdo(): PDO {
        return $this->pdo;
    }
}
