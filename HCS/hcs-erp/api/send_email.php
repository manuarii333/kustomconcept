<?php
/* ================================================================
   HCS ERP — api/send_email.php
   Envoi direct d'email depuis le planning (réservation fournisseur)
   POST JSON : { apiKey, to, subject, body, fromName? }
   ================================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, x-api-key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(['error' => 'Method not allowed']); exit; }

/* ── Clé API ─────────────────────────────────────────────── */
$API_KEY = 'hcs-erp-2026';
$key = $_SERVER['HTTP_X_API_KEY'] ?? '';
$body_raw = file_get_contents('php://input');
$data = json_decode($body_raw, true) ?: [];
if (isset($data['apiKey'])) $key = $data['apiKey'];

if ($key !== $API_KEY) {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

/* ── Paramètres ──────────────────────────────────────────── */
$to       = trim($data['to']      ?? '');
$subject  = trim($data['subject'] ?? '');
$bodyTxt  = trim($data['body']    ?? '');
$fromName = trim($data['fromName'] ?? 'High Coffee Shirt ERP');
$from     = 'erp@highcoffeeshirts.com';   // adresse serveur (passe le SPF)
$replyTo  = 'highcoffeeshirt@gmail.com';  // réponses redirigées vers Gmail HCS

if (!$to || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Adresse email invalide : ' . $to]);
    exit;
}
$bodyHtml_raw = trim($data['bodyHtml'] ?? '');   /* HTML pré-formaté optionnel */

if (!$subject || (!$bodyTxt && !$bodyHtml_raw)) {
    http_response_code(400);
    echo json_encode(['error' => 'Sujet et corps requis']);
    exit;
}

/* ── Corps HTML ──────────────────────────────────────────── */
$bodyContent = $bodyHtml_raw
    ? $bodyHtml_raw
    : nl2br(htmlspecialchars($bodyTxt, ENT_QUOTES, 'UTF-8'));
$html = <<<HTML
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:600px;margin:0 auto;padding:20px;">
  <div style="border-bottom:3px solid #FF6B00;padding-bottom:12px;margin-bottom:20px;">
    <strong style="font-size:18px;color:#FF6B00;">HCS — High Coffee Shirt</strong>
    <span style="display:block;font-size:12px;color:#666;">Papeete, Polynésie française</span>
  </div>
  <div style="line-height:1.7;">{$bodyContent}</div>
  <div style="margin-top:30px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#888;">
    High Coffee Shirt · Papeete, Tahiti · highcoffeeshirt@gmail.com
  </div>
</body></html>
HTML;

/* ── Envoi ───────────────────────────────────────────────── */
$headers  = "From: {$fromName} <{$from}>\r\n";
$headers .= "Reply-To: {$replyTo}\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "X-Mailer: HCS-ERP\r\n";

$subjectEncoded = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$ok = mail($to, $subjectEncoded, $html, $headers);

if ($ok) {
    echo json_encode(['success' => true, 'message' => "Email envoyé à {$to}"]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Échec envoi mail — vérifier config serveur PHP']);
}
