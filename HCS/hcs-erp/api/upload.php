<?php
/* ================================================================
   HCS ERP — api/upload.php
   Endpoint upload d'images produits vers le serveur Planet Hoster.
   Accessible directement (bypass index.php grâce à RewriteCond !-f).

   POST multipart/form-data
     file          : fichier image (JPG/PNG/WebP/GIF, max 5 Mo)
     produit_id    : ID du produit ERP (ex: prod-019)
     variante_ref  : référence de la variante (optionnel, ex: "blanc-l")
     label         : libellé de l'image (optionnel, ex: "Vue de face")

   Réponse JSON : { ok, url, nom, produit_id, variante_ref, label, size, mime }
   ================================================================ */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-api-key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

/* ── Vérification clé API ─────────────────────────────────── */
if (($_SERVER['HTTP_X_API_KEY'] ?? '') !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Clé API invalide ou manquante']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée — POST requis']);
    exit;
}

/* ── Fichier ──────────────────────────────────────────────── */
$file = $_FILES['file'] ?? null;
if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    $errMsg = [
        UPLOAD_ERR_INI_SIZE   => 'Fichier dépasse upload_max_filesize PHP',
        UPLOAD_ERR_FORM_SIZE  => 'Fichier dépasse MAX_FILE_SIZE du formulaire',
        UPLOAD_ERR_PARTIAL    => 'Upload partiel',
        UPLOAD_ERR_NO_FILE    => 'Aucun fichier reçu',
        UPLOAD_ERR_NO_TMP_DIR => 'Dossier temporaire manquant',
        UPLOAD_ERR_CANT_WRITE => 'Impossible d\'écrire sur le disque',
        UPLOAD_ERR_EXTENSION  => 'Extension PHP a bloqué l\'upload',
    ];
    $code = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    http_response_code(400);
    echo json_encode(['error' => $errMsg[$code] ?? 'Erreur upload inconnue']);
    exit;
}

/* ── Validation type MIME ─────────────────────────────────── */
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime  = $finfo->file($file['tmp_name']);
if (!in_array($mime, $allowedTypes, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Type non autorisé. Formats acceptés : JPG, PNG, WebP, GIF']);
    exit;
}

/* ── Taille max 5 Mo ──────────────────────────────────────── */
if ($file['size'] > 5 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'Fichier trop volumineux (maximum 5 Mo)']);
    exit;
}

/* ── Paramètres POST ──────────────────────────────────────── */
$produitId   = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['produit_id']   ?? 'general');
$varianteRef = preg_replace('/[^a-zA-Z0-9_-]/', '', $_POST['variante_ref'] ?? '');
$label       = htmlspecialchars(trim(substr($_POST['label'] ?? '', 0, 100)));

/* ── Création du dossier destination ─────────────────────── */
$uploadDir = dirname(__DIR__) . '/uploads/produits/' . $produitId . '/';
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Impossible de créer le dossier uploads']);
        exit;
    }
}

/* ── Nom de fichier unique ────────────────────────────────── */
$extMap   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif'];
$ext      = $extMap[$mime];
$filename = 'img_' . uniqid('', true) . '.' . $ext;
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur lors de la sauvegarde du fichier sur le serveur']);
    exit;
}

/* ── URL publique ─────────────────────────────────────────── */
$scheme  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host    = $_SERVER['HTTP_HOST'];
$urlPath = '/erp/uploads/produits/' . $produitId . '/' . $filename;
$url     = $scheme . '://' . $host . $urlPath;

echo json_encode([
    'ok'          => true,
    'url'         => $url,
    'nom'         => $filename,
    'produit_id'  => $produitId,
    'variante_ref'=> $varianteRef,
    'label'       => $label ?: 'Photo produit',
    'size'        => $file['size'],
    'mime'        => $mime
]);
