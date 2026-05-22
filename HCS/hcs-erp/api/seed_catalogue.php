<?php
/* ================================================================
   HCS ERP — api/seed_catalogue.php
   ================================================================ */

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

/* Vérification clé */
$key = $_GET['key'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
if ($key !== API_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Clé API invalide']);
    exit;
}

$db  = Database::getInstance();
$pdo = $db->getPdo();
$log = [];
$ok  = 0;

/* ----------------------------------------------------------------
   Ajouter un index UNIQUE sur SKU (idempotent)
   ---------------------------------------------------------------- */
try {
    $pdo->exec("ALTER TABLE `produits` ADD UNIQUE INDEX `idx_sku` (`sku`)");
    $log[] = "Index UNIQUE sur sku créé.";
} catch (Exception $e) {
    $log[] = "Index sku déjà présent (OK).";
}

/* ----------------------------------------------------------------
   DÉFINITION DU CATALOGUE
   Chaque entrée :
     nom      → nom exact que l'IA utilise dans le workflow (17b)
     sku      → référence unique
     categorie
     prix     → prix unitaire de BASE en XPF (hors impression)
     tailles  → string CSV — généré en combinaisons par le workflow
     couleurs → string CSV
     coupe    → string CSV (genre OU modèle selon produit)
     variantes→ JSON array {label, prix} pour les services
     description
   ---------------------------------------------------------------- */
$produits = [

  /* ============================================================
     1. T-SHIRTS COTON
     ============================================================ */
  [
    'nom'         => 'tshirt unis coton',
    'sku'         => 'HCS-TEX-TC-001',
    'categorie'   => 'Textile',
    'prix'        => 1200,
    'cout'        => 550,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL, XXXXL, 5xl',
    'couleurs'    => 'blanc, noir, rouge, bleu, vert, jaune, rose, orange, gris fonce, mauve, bleu fonce, bleu ciel, bleu royal, bordeaux, kaki, beige, fushia, rosefluo, marron, bleu nav',
    'coupe'       => 'homme, femme, enfants',
    'description' => 'T-shirt col rond 100% coton 180g, impression DTF possible.',
  ],

  /* ============================================================
     2. T-SHIRTS POLYESTER (sport / dry-fit)
     ============================================================ */
  [
    'nom'         => 'tshirt polyester',
    'sku'         => 'HCS-TEX-TP-001',
    'categorie'   => 'Textile',
    'prix'        => 1100,
    'cout'        => 480,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL',
    'couleurs'    => 'blanc, noir, rouge, bleu, vert, jaune, rose, orange, gris fonce, mauve, bleu nav, bleu royal, kaki',
    'coupe'       => 'homme, femme, enfants',
    'description' => 'T-shirt polyester respirant 160g, dry-fit, sport.',
  ],

  /* ============================================================
     3. T-SHIRT GILDAN SOFTSTYLE 64000
     ============================================================ */
  [
    'nom'         => 'tshirt gildan 64000 softstyle',
    'sku'         => 'HCS-TEX-GLD-001',
    'categorie'   => 'Textile',
    'prix'        => 1400,
    'cout'        => 700,
    'tailles'     => 'S, M, L, XL, XXL',
    'couleurs'    => 'blanc, noir, rouge, bleu, gris fonce, mauve',
    'coupe'       => 'unisexe',
    'description' => 'Gildan SoftStyle 64000 — coton peigné ring-spun 153g.',
  ],

  /* ============================================================
     4. MANCHE LONGUE ST340LS Sport-Tek
     Ordre variante workflow : (TAILLE, COULEUR)
     ============================================================ */
  [
    'nom'         => 'ST340LS  Sport-Tek® PosiCharge® RacerMesh® Long Sleeve Tee',
    'sku'         => 'HCS-TEX-ST340LS',
    'categorie'   => 'Textile',
    'prix'        => 1800,
    'cout'        => 900,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL',
    'couleurs'    => 'blanc, noir, rouge, bleu royal, bleu nav, gris fonce, orange',
    'coupe'       => '',
    'description' => 'Manche longue polyester mesh Sport-Tek ST340LS, UPF50+.',
  ],

  /* ============================================================
     5. POLO COTON (pas de genre — règle 17b)
     ============================================================ */
  [
    'nom'         => 'Polo coton',
    'sku'         => 'HCS-TEX-PC-001',
    'categorie'   => 'Textile',
    'prix'        => 1600,
    'cout'        => 750,
    'tailles'     => 'S, M, L, XL, XXL, XXXL',
    'couleurs'    => 'blanc, noir, rouge, bleu, vert, gris fonce, orange, rose, marine',
    'coupe'       => '',
    'description' => 'Polo piqué 100% coton 220g, pas de variante genre.',
  ],

  /* ============================================================
     6. POLO POLYESTER
     ============================================================ */
  [
    'nom'         => 'Polo Polyester ta',
    'sku'         => 'HCS-TEX-PP-001',
    'categorie'   => 'Textile',
    'prix'        => 1400,
    'cout'        => 650,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL',
    'couleurs'    => 'blanc, noir, rouge, bleu, vert, gris fonce, orange, rose, marine',
    'coupe'       => 'homme, femme, enfants',
    'description' => 'Polo polyester sport 160g — hommes, femmes, enfants.',
  ],

  /* ============================================================
     7. HOODIE (taille seulement — règle 17b)
     ============================================================ */
  [
    'nom'         => 'hoodie pc 90 h',
    'sku'         => 'HCS-TEX-HD-001',
    'categorie'   => 'Textile',
    'prix'        => 2800,
    'cout'        => 1400,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Sweat à capuche PC90H — variante taille uniquement.',
  ],

  /* ============================================================
     8. PULL COTON (tailles EN — règle 17b)
     ============================================================ */
  [
    'nom'         => 'Pull coton',
    'sku'         => 'HCS-TEX-PL-001',
    'categorie'   => 'Textile',
    'prix'        => 2200,
    'cout'        => 1100,
    'tailles'     => 'small, medium, large, xlarge, xxlarge',
    'couleurs'    => 'blanc, noir, rouge, bleu, gris fonce, mauve',
    'coupe'       => '',
    'description' => 'Pull coton crewneck — tailles en anglais (small, medium…).',
  ],

  /* ============================================================
     9. SHORT POLYESTER (taille seulement — règle 17b)
     ============================================================ */
  [
    'nom'         => 'short polyester',
    'sku'         => 'HCS-TEX-SH-001',
    'categorie'   => 'Textile',
    'prix'        => 1200,
    'cout'        => 550,
    'tailles'     => 'XS, S, M, L, XL, XXL, XXXL',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Short polyester sport — variante taille uniquement.',
  ],

  /* ============================================================
     10. DÉBARDEUR POLYESTER
     ============================================================ */
  [
    'nom'         => 'Debardeur Polyester',
    'sku'         => 'HCS-TEX-DB-001',
    'categorie'   => 'Textile',
    'prix'        => 900,
    'cout'        => 400,
    'tailles'     => 'XS, S, M, L, XL, XXL',
    'couleurs'    => 'blanc, noir, rouge, bleu, gris fonce',
    'coupe'       => 'homme, femme',
    'description' => 'Débardeur polyester respirant.',
  ],

  /* ============================================================
     11. DÉBARDEUR GILDAN 2200
     ============================================================ */
  [
    'nom'         => 'debardeur gildan 2200',
    'sku'         => 'HCS-TEX-GDB-001',
    'categorie'   => 'Textile',
    'prix'        => 1100,
    'cout'        => 520,
    'tailles'     => 'S, M, L, XL, XXL',
    'couleurs'    => 'blanc, noir, gris fonce, rouge',
    'coupe'       => 'unisexe',
    'description' => 'Gildan 2200 — débardeur coton annelé.',
  ],

  /* ============================================================
     12. CROP TOP
     ============================================================ */
  [
    'nom'         => 'crop top',
    'sku'         => 'HCS-TEX-CT-001',
    'categorie'   => 'Textile',
    'prix'        => 1100,
    'cout'        => 500,
    'tailles'     => 'XS, S, M, L, XL',
    'couleurs'    => 'blanc, noir, rouge, bleu, rose, mauve',
    'coupe'       => 'femme',
    'description' => 'Crop top femme — court, ajusté.',
  ],

  /* ============================================================
     13. CASQUETTE COTON
     coupe = modèle (A1, A2, A4)
     ============================================================ */
  [
    'nom'         => 'Casquette Coton',
    'sku'         => 'HCS-CAP-CC-001',
    'categorie'   => 'Accessoires',
    'prix'        => 1500,
    'cout'        => 650,
    'tailles'     => '',
    'couleurs'    => 'noir, blanc, rouge, bleu, marine, gris fonce, vert, beige',
    'coupe'       => 'A1, A2, A4',
    'description' => 'Casquette coton 6 panneaux — modèles A1, A2, A4.',
  ],

  /* ============================================================
     14. CASQUETTE POLYESTER (couleur seulement — règle 17b)
     ============================================================ */
  [
    'nom'         => 'Casquette Polyester',
    'sku'         => 'HCS-CAP-CP-001',
    'categorie'   => 'Accessoires',
    'prix'        => 1200,
    'cout'        => 520,
    'tailles'     => '',
    'couleurs'    => 'blanc, noir, rouge, bleu, marine, gris fonce, orange, rose',
    'coupe'       => '',
    'description' => 'Casquette polyester snapback — variante couleur uniquement.',
  ],

  /* ============================================================
     15. CASQUETTE YUPPONG 6006 CLASSIC (couleurs EN)
     ============================================================ */
  [
    'nom'         => 'Casquette Yuppong 6006 classic',
    'sku'         => 'HCS-CAP-YP-001',
    'categorie'   => 'Accessoires',
    'prix'        => 2200,
    'cout'        => 1100,
    'tailles'     => '',
    'couleurs'    => 'black, white, red, pink, navy, grey',
    'coupe'       => '',
    'description' => 'Yuppong 6006 — couleurs en anglais.',
  ],

  /* ============================================================
     16. CASQUETTE YUPPONG 6006 T (bicolore)
     ============================================================ */
  [
    'nom'         => 'Casquette Yuppong 6006 T',
    'sku'         => 'HCS-CAP-YPT-001',
    'categorie'   => 'Accessoires',
    'prix'        => 2400,
    'cout'        => 1200,
    'tailles'     => '',
    'couleurs'    => 'royalwhite, redblack, silverblack',
    'coupe'       => '',
    'description' => 'Yuppong 6006 T — bicolore.',
  ],

  /* ============================================================
     17. CASQUETTE YUPPONG 6006MC (camo)
     ============================================================ */
  [
    'nom'         => 'Casquette Yuppong 6006MC',
    'sku'         => 'HCS-CAP-YPMC-001',
    'categorie'   => 'Accessoires',
    'prix'        => 2400,
    'cout'        => 1200,
    'tailles'     => '',
    'couleurs'    => 'camo',
    'coupe'       => '',
    'description' => 'Yuppong 6006MC — motif camouflage.',
  ],

  /* ============================================================
     18. IMPRESSION DTF
     variantes = emplacements avec prix individuels
     ============================================================ */
  [
    'nom'         => 'impression dtf transfert quadri',
    'sku'         => 'HCS-SRV-DTF-001',
    'categorie'   => 'Service Impression',
    'prix'        => 1200,
    'cout'        => 400,
    'tailles'     => '',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Impression DTF pleine couleur — tarif selon emplacement.',
    'variantes'   => json_encode([
      ['label' => 'coeur 8x8cm',              'prix' => 800],
      ['label' => 'poitrine 24 x24 cm',       'prix' => 1200],
      ['label' => 'poitrine 30x30cm',         'prix' => 1500],
      ['label' => 'grandpoitrine32x38cm',     'prix' => 1800],
      ['label' => 'dos24x24cm',               'prix' => 1500],
      ['label' => 'dos30x30cm',               'prix' => 1800],
      ['label' => 'grand dos 32x38cm',        'prix' => 2200],
      ['label' => 'bande poitrine 10x30cm',   'prix' => 1000],
      ['label' => 'bande dos 10x30cm',        'prix' => 1000],
      ['label' => 'manche 8x8 cm',            'prix' => 800],
    ], JSON_UNESCAPED_UNICODE),
  ],

  /* ============================================================
     19. FLOCAGE / VINYLE THERMOCOLLANT
     variantes = combinaisons format × couleur × type
     ============================================================ */
  [
    'nom'         => 'impression transfert vynil thermocollant flocage',
    'sku'         => 'HCS-SRV-FLOCAGE-001',
    'categorie'   => 'Service Impression',
    'prix'        => 900,
    'cout'        => 300,
    'tailles'     => '',
    'couleurs'    => 'noir, blanc, rouge, bleu, jaune, vert, orange, rose, mauve, dore, silver, flanc, vert neo, bleu neon, rose neon',
    'coupe'       => 'coeur, dos, poitrine, manche, nuque, casquette, coeurdosmanche',
    'description' => 'Flocage vinyle HTV thermocollant — formats et couleurs flex.',
    'variantes'   => json_encode([
      ['label' => 'flex normal',    'prix' => 0],
      ['label' => 'flex metal',     'prix' => 200],
      ['label' => 'flex miror',     'prix' => 200],
      ['label' => 'flex paillette', 'prix' => 300],
      ['label' => 'flex puff',      'prix' => 400],
    ], JSON_UNESCAPED_UNICODE),
  ],

  /* ============================================================
     20. CRÉATION LOGO
     ============================================================ */
  [
    'nom'         => 'Creation logo',
    'sku'         => 'HCS-SRV-LOGO-001',
    'categorie'   => 'Service Graphisme',
    'prix'        => 3500,
    'cout'        => 0,
    'tailles'     => '',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Création logo vectoriel — livrables Ai/PDF/PNG.',
  ],

  /* ============================================================
     21. CRÉATION VISUEL NUMÉRIQUE
     ============================================================ */
  [
    'nom'         => 'creation visuel numerique',
    'sku'         => 'HCS-SRV-VIS-001',
    'categorie'   => 'Service Graphisme',
    'prix'        => 5000,
    'cout'        => 0,
    'tailles'     => '',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Création graphique, illustration, artwork, affiche, flyer.',
  ],

  /* ============================================================
     22. FRAIS TECHNIQUE / VISUEL
     ============================================================ */
  [
    'nom'         => 'frais technique / visuel',
    'sku'         => 'HCS-SRV-FT-001',
    'categorie'   => 'Service Graphisme',
    'prix'        => 1800,
    'cout'        => 0,
    'tailles'     => '',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Adaptation fichier, vectorisation, retouche, préparation BAT.',
  ],

  /* ============================================================
     23. LIVRAISON FRET FAAA
     ============================================================ */
  [
    'nom'         => 'livraison fret faaa',
    'sku'         => 'HCS-SRV-LIV-001',
    'categorie'   => 'Service Logistique',
    'prix'        => 1500,
    'cout'        => 0,
    'tailles'     => '',
    'couleurs'    => '',
    'coupe'       => '',
    'description' => 'Livraison fret Papeete / Faa\'a — forfait.',
  ],

  /* ============================================================
     24. FRET ÎLES (variable — géré manuellement)
     ============================================================ */
  [
    'nom'         => 'Fret iles',
    'sku'         => 'HCS-SRV-FRET-001',
    'categorie'   => 'Service Logistique',
    'prix'        => 0,
    'cout'        => 0,
    'tailles'     => '',
    'couleurs'    => 'Moorea, Raiatea, Bora Bora, Huahine, Rangiroa, Nuku Hiva, Hiva Oa, Tubuai, Maupiti',
    'coupe'       => '',
    'description' => 'Fret inter-îles — tarif selon destination à préciser.',
  ],

];

/* ----------------------------------------------------------------
   INSERT — ON DUPLICATE KEY UPDATE (idempotent via SKU)
   ---------------------------------------------------------------- */
$sql = "INSERT INTO `produits`
    (`nom`, `sku`, `categorie`, `prix`, `cout`, `tailles`, `couleurs`, `coupe`,
     `description`, `variantes`, `tva`, `status`, `stock`, `stock_min`, `created_at`)
  VALUES
    (:nom, :sku, :categorie, :prix, :cout, :tailles, :couleurs, :coupe,
     :description, :variantes, :tva, 'active', 0, 0, NOW())
  ON DUPLICATE KEY UPDATE
    nom         = VALUES(nom),
    categorie   = VALUES(categorie),
    prix        = VALUES(prix),
    cout        = VALUES(cout),
    tailles     = VALUES(tailles),
    couleurs    = VALUES(couleurs),
    coupe       = VALUES(coupe),
    description = VALUES(description),
    variantes   = VALUES(variantes)";

$stmt = $pdo->prepare($sql);

foreach ($produits as $p) {
    try {
        $stmt->execute([
            ':nom'         => $p['nom'],
            ':sku'         => $p['sku'],
            ':categorie'   => $p['categorie'],
            ':prix'        => $p['prix'],
            ':cout'        => $p['cout'],
            ':tailles'     => $p['tailles']   ?? '',
            ':couleurs'    => $p['couleurs']  ?? '',
            ':coupe'       => $p['coupe']     ?? '',
            ':description' => $p['description'] ?? '',
            ':variantes'   => $p['variantes'] ?? null,
            ':tva'         => 16,
        ]);
        $ok++;
        $log[] = "OK — " . $p['nom'] . " (" . $p['sku'] . ")";
    } catch (Exception $e) {
        $log[] = "ERREUR — " . $p['nom'] . " : " . $e->getMessage();
    }
}

/* Résultat */
echo json_encode([
    'ok'       => true,
    'inseres'  => $ok,
    'total'    => count($produits),
    'message'  => $ok . '/' . count($produits) . ' produits insérés/mis à jour.',
    'log'      => $log,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
