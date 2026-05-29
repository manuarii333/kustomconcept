<?php
/* HCS ERP — Email recap commande Deco Vehicule */

require_once __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, x-api-key');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST')    { http_response_code(405); echo json_encode(array('error'=>'Method not allowed')); exit; }

$apiKey = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
if (!$apiKey && function_exists('getallheaders')) {
    $h = getallheaders();
    $apiKey = isset($h['x-api-key']) ? $h['x-api-key'] : (isset($h['X-Api-Key']) ? $h['X-Api-Key'] : '');
}
if ($apiKey !== API_KEY) { http_response_code(401); echo json_encode(array('error'=>'Unauthorized')); exit; }

$raw = file_get_contents('php://input');
$o   = json_decode($raw, true);
if (!$o || empty($o['contact']['email'])) {
    http_response_code(400);
    echo json_encode(array('error'=>'Donnees invalides ou email manquant'));
    exit;
}

$contact  = $o['contact'];
$delivery = isset($o['delivery']) ? $o['delivery'] : array();
$logos    = isset($o['logos'])    ? $o['logos']    : array();
$texts    = isset($o['texts'])    ? $o['texts']    : array();
$orderId  = isset($o['order_id']) ? $o['order_id'] : '-';
$catName  = isset($o['cat_name']) ? $o['cat_name'] : '';
$catModel = isset($o['cat_model'])? $o['cat_model']: '';
$catIcon  = isset($o['cat_icon']) ? $o['cat_icon'] : '';
$totalXpf = (int)(isset($o['total_xpf']) ? $o['total_xpf'] : 0);

$clientEmail = filter_var($contact['email'], FILTER_VALIDATE_EMAIL);
if (!$clientEmail) { http_response_code(400); echo json_encode(array('error'=>'Email invalide')); exit; }

$clientName = htmlspecialchars(isset($contact['name']) ? $contact['name'] : 'Client', ENT_QUOTES, 'UTF-8');
$clientNote = htmlspecialchars(isset($contact['note']) ? $contact['note'] : '',        ENT_QUOTES, 'UTF-8');

/* Livraison */
$islandLabels = array('tahiti'=>'Tahiti','moorea'=>'Moorea','bora-bora'=>'Bora-Bora',
    'huahine'=>'Huahine','raiatea'=>'Raiatea','rangiroa'=>'Rangiroa','autre'=>'Autre ile');
$deliveryType = isset($delivery['type']) ? $delivery['type'] : 'pickup';
if ($deliveryType === 'pickup') {
    $deliveryLine = 'Retrait en boutique';
    $pickDate = isset($delivery['pickupDate']) ? $delivery['pickupDate'] : '';
    $slot     = isset($delivery['slot'])       ? $delivery['slot']       : '';
    if ($pickDate) $deliveryLine .= ' - ' . $pickDate;
    if ($slot)     $deliveryLine .= ' (' . str_replace('-', 'h-', $slot) . 'h)';
} else {
    $island      = isset($delivery['island'])      ? $delivery['island']      : '';
    $address     = isset($delivery['address'])     ? $delivery['address']     : '';
    $shippingFee = (int)(isset($delivery['shippingFee']) ? $delivery['shippingFee'] : 0);
    $islandLabel = isset($islandLabels[$island]) ? $islandLabels[$island] : $island;
    $deliveryLine = 'Livraison - ' . $islandLabel;
    if ($address)     $deliveryLine .= ' - ' . htmlspecialchars($address, ENT_QUOTES, 'UTF-8');
    if ($shippingFee) $deliveryLine .= ' (' . number_format($shippingFee, 0, ',', ' ') . ' XPF)';
}

/* Elements (logos + textes) */
$elRows = '';
foreach ($logos as $i => $l) {
    $w = isset($l['w_cm']) ? $l['w_cm'] : '?';
    $h = isset($l['h_cm']) ? $l['h_cm'] : '?';
    $elRows .= '<tr><td style="padding:5px 10px;font-size:13px;color:#333">Logo ' . ($i+1) . '</td>'
             . '<td style="padding:5px 10px;font-size:13px;color:#888;text-align:right">' . $w . ' x ' . $h . ' cm</td></tr>';
}
foreach ($texts as $i => $t) {
    $txt = htmlspecialchars(isset($t['text']) ? $t['text'] : '', ENT_QUOTES, 'UTF-8');
    $w   = isset($t['w_cm']) ? $t['w_cm'] : '?';
    $h   = isset($t['h_cm']) ? $t['h_cm'] : '?';
    $elRows .= '<tr><td style="padding:5px 10px;font-size:13px;color:#333">Texte &laquo;' . $txt . '&raquo;</td>'
             . '<td style="padding:5px 10px;font-size:13px;color:#888;text-align:right">' . $w . ' x ' . $h . ' cm</td></tr>';
}
if (!$elRows) {
    $elRows = '<tr><td colspan="2" style="padding:5px 10px;color:#888;font-size:13px">-</td></tr>';
}

$totalFmt = $totalXpf > 0 ? number_format($totalXpf, 0, ',', ' ') . ' XPF (paye en ligne)' : 'Devis a etablir en atelier';

$noteBlock = '';
if ($clientNote) {
    $noteBlock = '<tr><td style="padding:0 32px 20px">'
        . '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 10px;border-bottom:1px solid #eee;padding-bottom:8px">Note</h2>'
        . '<p style="font-size:14px;color:#555;margin:0;font-style:italic">&ldquo;' . $clientNote . '&rdquo;</p>'
        . '</td></tr>';
}

$html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Recap commande HCS</title></head>'
. '<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">'
. '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0"><tr><td align="center">'
. '<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">'

/* En-tete */
. '<tr><td style="background:linear-gradient(135deg,#1a0e07,#3b1f0e);padding:28px 32px;text-align:center">'
. '<div style="display:inline-block;background:#c4813a;color:#1a0e07;font-weight:900;font-size:13px;padding:4px 12px;border-radius:4px;letter-spacing:1px;margin-bottom:12px">HCS</div>'
. '<h1 style="color:#f5ede0;margin:0;font-size:22px;font-weight:700">Deco Vehicule</h1>'
. '<p style="color:#c8b89a;margin:6px 0 0;font-size:13px">Confirmation de commande</p>'
. '</td></tr>'

/* Merci */
. '<tr><td style="padding:28px 32px 16px">'
. '<p style="font-size:16px;color:#1a0e07;margin:0 0 6px">Bonjour <strong>' . $clientName . '</strong>,</p>'
. '<p style="font-size:14px;color:#555;line-height:1.6;margin:0">Votre commande de decoration vehicule a bien ete enregistree. Voici le recapitulatif de votre personnalisation.</p>'
. '</td></tr>'

/* Ref commande */
. '<tr><td style="padding:0 32px 20px">'
. '<div style="background:#fff8f0;border:1px solid #f0d4a0;border-radius:8px;padding:12px 16px;text-align:center">'
. '<div style="font-size:11px;color:#c4813a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Reference commande</div>'
. '<div style="font-size:20px;font-weight:800;color:#1a0e07;font-family:monospace">' . $orderId . '</div>'
. '</div></td></tr>'

/* Vehicule */
. '<tr><td style="padding:0 32px 20px">'
. '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 10px;border-bottom:1px solid #eee;padding-bottom:8px">Vehicule</h2>'
. '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
. '<td style="font-size:28px;width:44px;vertical-align:top">' . $catIcon . '</td>'
. '<td style="padding-left:12px;vertical-align:top">'
. '<div style="font-size:16px;font-weight:700;color:#1a0e07">' . htmlspecialchars($catName, ENT_QUOTES, 'UTF-8') . '</div>'
. '<div style="font-size:13px;color:#888;margin-top:2px">' . htmlspecialchars($catModel, ENT_QUOTES, 'UTF-8') . '</div>'
. '</td></tr></table></td></tr>'

/* Elements */
. '<tr><td style="padding:0 32px 20px">'
. '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 10px;border-bottom:1px solid #eee;padding-bottom:8px">Elements a produire</h2>'
. '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:6px;overflow:hidden">'
. $elRows
. '</table></td></tr>'

/* Livraison */
. '<tr><td style="padding:0 32px 20px">'
. '<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#888;margin:0 0 10px;border-bottom:1px solid #eee;padding-bottom:8px">Livraison / Retrait</h2>'
. '<p style="font-size:14px;color:#333;margin:0">' . $deliveryLine . '</p>'
. '</td></tr>'

/* Total */
. '<tr><td style="padding:0 32px 20px">'
. '<div style="background:#1a0e07;border-radius:8px;padding:14px 18px">'
. '<table width="100%"><tr>'
. '<td style="font-size:14px;color:#c8b89a;font-weight:700">Total</td>'
. '<td style="font-size:16px;color:#f0a030;font-weight:900;text-align:right">' . $totalFmt . '</td>'
. '</tr></table></div></td></tr>'

. $noteBlock

/* Footer */
. '<tr><td style="background:#f8f4f0;padding:20px 32px;text-align:center;border-top:1px solid #ede0d0">'
. '<p style="font-size:12px;color:#999;margin:0 0 6px">High Coffee Shirt - Papeete, Polynesie francaise<br>'
. '<a href="mailto:highcoffeeshirt@gmail.com" style="color:#c4813a">highcoffeeshirt@gmail.com</a></p>'
. '<p style="font-size:11px;color:#bbb;margin:0">Notre atelier vous contactera pour finaliser les details.</p>'
. '</td></tr>'

. '</table></td></tr></table></body></html>';

/* Envoi */
$adminEmail  = 'highcoffeeshirt@gmail.com';
$fromEmail   = 'noreply@highcoffeeshirts.com';
$fromNameB64 = base64_encode('High Coffee Shirt');
$subjectB64  = base64_encode('Votre commande Deco Vehicule - ' . $orderId);

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: =?UTF-8?B?{$fromNameB64}?= <{$fromEmail}>\r\n";
$headers .= "Reply-To: {$adminEmail}\r\n";
$headers .= "Bcc: {$adminEmail}\r\n";
$headers .= "X-Mailer: HCS-ERP/1.0\r\n";

$sent = mail($clientEmail, '=?UTF-8?B?' . $subjectB64 . '?=', $html, $headers);

if ($sent) {
    echo json_encode(array('ok'=>true, 'to'=>$clientEmail, 'order_id'=>$orderId));
} else {
    http_response_code(500);
    echo json_encode(array('error'=>'mail() failed', 'to'=>$clientEmail));
}
