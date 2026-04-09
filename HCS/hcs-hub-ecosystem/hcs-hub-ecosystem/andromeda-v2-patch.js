/* ═══════════════════════════════════════════════════════════════
   ANDROMEDA v2 PATCH — Upgrade 8 Verticales
   ═══════════════════════════════════════════════════════════════
   Inclure APRÈS andromeda-campaign.html :
     <script src="andromeda-v2-patch.js"></script>
   
   Optionnel (si hub activé) :
     <script src="hcs-hub.js"></script>
     <script src="hcs-hub-distribution.js"></script>
     <script src="andromeda-v2-patch.js"></script>

   Ce patch :
   1. Met à jour CAMPS[] avec les nouveaux noms, contextes, ltype
   2. Remplace renderLP() pour gérer les 8 parcours client
   3. Remplace exportLP() pour router vers les fonctions spécifiques
   4. Ajoute les fonctions d'export LP par verticale (V0→V7)
   5. Ajoute le cross-sell systématique
   6. Ajoute le concept Pass HCS transversal
   7. Ne casse RIEN — tous les originaux sont sauvegardés
   ═══════════════════════════════════════════════════════════════ */

(function() {
'use strict';

if (typeof CAMPS === 'undefined') {
  console.warn('[Andromeda v2] CAMPS non trouvé — patch désactivé');
  return;
}

/* ═══════════════════════════════════════════════════════════
   1. MISE À JOUR DES DONNÉES CAMPS
   ═══════════════════════════════════════════════════════════ */

// V0 — Stickers & Decals (élargissement)
if (CAMPS[0]) {
  CAMPS[0].name = 'Stickers & Decals';
  CAMPS[0].tag = 'Véhicules · Vitrines · Custom';
  CAMPS[0].tags = ['Sticker', 'Decal', 'Véhicule', 'Vitrine', 'B2B'];
  CAMPS[0].headline = 'STICKERS & DECALS SUR MESURE';
  CAMPS[0].subline = 'Véhicules · Vitrines commerce · Casques · Toutes surfaces';
  CAMPS[0].badge = '🔥 PROMO — COMMANDEZ LE 2e À -20%';
  CAMPS[0].features = [
    {i:'📐',t:'Sur mesure — toutes dimensions'},
    {i:'🎨',t:'Impression HD résistante UV'},
    {i:'🏪',t:'Vitrines & enseignes commerce'},
    {i:'🚗',t:'Véhicules · Casques · Va\'a'}
  ];
  CAMPS[0].products = [
    {e:'🚗',n:'Sticker Pare-brise',p:'2 500 XPF'},
    {e:'🏪',n:'Sticker Vitrine Commerce',p:'3 500 XPF'},
    {e:'✨',n:'Decal Custom (toutes surfaces)',p:'Sur devis'}
  ];
  CAMPS[0]._v2 = {
    upsell2nd: true,
    discount2nd: 0.2,
    crossSell: [1, 2],  // vers V1 et V2
    hasPreview: true     // aperçu sur surface
  };
}

// V1 — T-Shirt Perso (repositionnement)
if (CAMPS[1]) {
  CAMPS[1].name = 'T-Shirt Perso — Votre Logo';
  CAMPS[1].tag = 'Service personnalisé';
  CAMPS[1].tags = ['T-shirt', 'Personnalisé', 'Votre Logo'];
  CAMPS[1].headline = 'VOTRE LOGO SUR T-SHIRT';
  CAMPS[1].subline = 'Envoyez votre logo, choisissez votre t-shirt, on imprime';
  CAMPS[1].badge = '👕 SERVICE PERSONNALISÉ';
  CAMPS[1].cta = 'Personnaliser mon t-shirt';
  CAMPS[1].features = [
    {i:'🎨',t:'Impression DTF HD'},
    {i:'✂️',t:'Détourage IA inclus'},
    {i:'👕',t:'Coton premium'},
    {i:'📦',t:'Livraison rapide Polynésie'}
  ];
  CAMPS[1].products = [
    {e:'⬜',n:'T-Shirt Blanc + Logo',p:'3 500 XPF'},
    {e:'⬛',n:'T-Shirt Noir + Logo',p:'3 500 XPF'},
    {e:'🧥',n:'Hoodie + Logo',p:'5 500 XPF'}
  ];
  CAMPS[1]._v2 = {
    autoPicWish: true,
    noLogoPath: true,    // chemin "pas de logo" → texte / V3 / V7
    packEquipe: true,    // 5 t-shirts -15%
    crossSellCasquette: true,
    accessoires: true
  };
}

// V2 — Casquette (guide broderie/DTF)
if (CAMPS[2]) {
  CAMPS[2].name = 'Casquette — Broderie & DTF';
  CAMPS[2].tag = 'Guide technique + total look';
  CAMPS[2].tags = ['Casquette', 'Broderie', 'DTF', 'Total Look'];
  CAMPS[2].headline = 'CASQUETTES PERSONNALISÉES';
  CAMPS[2].subline = 'Broderie ou DTF — choisissez la finition qui vous correspond';
  CAMPS[2].features = [
    {i:'🧢',t:'Guide broderie vs DTF'},
    {i:'🎯',t:'5 zones de placement'},
    {i:'👕',t:'Pack total look casquette + t-shirt'},
    {i:'⚡',t:'Stock disponible'}
  ];
  CAMPS[2].products = [
    {e:'🧢',n:'Dad Hat DTF',p:'3 000 XPF'},
    {e:'🏷️',n:'Snapback DTF',p:'3 500 XPF'},
    {e:'✨',n:'Casquette Brodée',p:'4 500 XPF'}
  ];
  CAMPS[2]._v2 = {
    guideChoix: true,     // étape broderie vs DTF
    zones: ['face','gauche','droit','arriere','visiere'],
    zoneSupp: 500,        // +500 XPF/zone
    packTotalLook: true,  // + t-shirt -10%
    originals: true       // casquettes collection mensuelle
  };
}

// V3 — DTF Originals (nouveau parcours complet)
if (CAMPS[3]) {
  CAMPS[3].name = 'DTF Originals — Collections';
  CAMPS[3].tag = 'T-shirts premium exclusifs';
  CAMPS[3].tags = ['DTF', 'Originals', 'Collection', 'Polynésie'];
  CAMPS[3].headline = 'DTF ORIGINALS — COLLECTION DU MOIS';
  CAMPS[3].subline = 'Logos exclusifs · Édition limitée · Culture polynésienne';
  CAMPS[3].badge = '🏄 ÉDITION AUTHENTIQUE';
  CAMPS[3].ltype = 'originals';
  CAMPS[3].features = [
    {i:'🌺',t:'Design polynésien exclusif'},
    {i:'👕',t:'T-shirt qualité supérieure'},
    {i:'🎨',t:'3 variantes collector'},
    {i:'📅',t:'Édition limitée mensuelle'}
  ];
  CAMPS[3].products = [
    {e:'🏄',n:'Variante 1',p:'3 900 XPF'},
    {e:'🚣',n:'Variante 2',p:'3 900 XPF'},
    {e:'🏉',n:'Variante 3',p:'3 900 XPF'}
  ];
  CAMPS[3]._v2 = {
    packTrio: true,
    packTrioPrice: 9900,
    packTrioDiscount: 0.15,
    colorisduMois: true,
    teaserNextMonth: true,
    captureEmail: true,
    themes: {
      1:'Matahiti Api',2:'Aroha',3:'Taure\'a',4:'Tautai',
      5:'Mama',6:'Va\'a',7:'Heiva',8:'Surf',
      9:'Tupuna',10:'Taata Tahiti',11:'Rugby Māohi',12:'Noera'
    }
  };
}

// V4 — Pack Collector DTF + Atelier (nouveau)
if (CAMPS[4]) {
  CAMPS[4].name = 'Pack Collector DTF + Atelier';
  CAMPS[4].tag = 'Gang sheet + pressage libre-service';
  CAMPS[4].tags = ['DTF', 'Pack', 'Atelier', 'Collector'];
  CAMPS[4].headline = 'PACK COLLECTOR DTF + ATELIER CLIENT';
  CAMPS[4].subline = 'Composez votre planche DTF — Pressez vos t-shirts en boutique';
  CAMPS[4].badge = '📋 PACK COLLECTOR';
  CAMPS[4].ltype = 'pack-atelier';
  CAMPS[4].features = [
    {i:'📐',t:'Gang sheet 22" × 1 yard'},
    {i:'🏭',t:'Accès atelier client HCS'},
    {i:'✨',t:'Accessoires thermocollants'},
    {i:'💳',t:'Pass HCS accepté'}
  ];
  CAMPS[4].products = [
    {e:'📋',n:'À la carte (1 feuille)',p:'20 000 XPF'},
    {e:'🖨️',n:'Pack Atelier (feuille + 1h)',p:'23 000 XPF'},
    {e:'⭐',n:'Pack Premium (feuille + 2h + extras)',p:'28 000 XPF'}
  ];
  CAMPS[4]._v2 = {
    atelierHourly: 1500,
    atelierHourlySansPack: 2200,
    passHCS: true,
    accessoires: [
      {name:'Patchs brodés',price:300,unit:'pièce'},
      {name:'Lettres 3D flocage',price:200,unit:'pièce'},
      {name:'Strass motifs',price:500,unit:'planche'},
      {name:'Transferts déco HCS',price:400,unit:'pièce'}
    ],
    textiles: [
      {name:'T-shirt basique',price:1200},
      {name:'T-shirt premium',price:2000},
      {name:'Hoodie',price:3500},
      {name:'Tote bag',price:1800}
    ],
    reservation: true,
    appDTFPlaques: true
  };
}

// V5 — Formation 3h + Pack Machines (nouveau)
if (CAMPS[5]) {
  CAMPS[5].name = 'Formation 3h + Pack Machines';
  CAMPS[5].tag = 'Accompagnement + vente équipement';
  CAMPS[5].tags = ['Formation', 'Machines', 'DTF Pro'];
  CAMPS[5].headline = 'FORMATION DTF — 3H EN BOUTIQUE';
  CAMPS[5].subline = 'Apprenez à créer et presser vos t-shirts — Repartez équipé';
  CAMPS[5].badge = '🎓 38 000 XPF TOUT INCLUS';
  CAMPS[5].ltype = 'formation';
  CAMPS[5].features = [
    {i:'🎓',t:'3h accompagnement intensif'},
    {i:'🛠️',t:'Pratique sur machines pro'},
    {i:'👕',t:'Repartez avec vos créations'},
    {i:'📦',t:'Packs machines dès 400 000 XPF'}
  ];
  CAMPS[5].products = [
    {e:'🎓',n:'Formation 3h',p:'38 000 XPF'},
    {e:'📦',n:'Pack Passion',p:'à partir de 400 000 XPF'},
    {e:'🏆',n:'Pack Pro / Studio',p:'à partir de 500 000 XPF'}
  ];
  CAMPS[5]._v2 = {
    formationPrice: 38000,
    packs: [
      {name:'Pack Passion',price:400000,desc:'Presse A3 + stock initial DTF + consommables + 1h support + accès apps 1 mois'},
      {name:'Pack Pro',price:500000,desc:'Presse grand format + massicot + stock 3 mois + 3h support + accès apps 3 mois'},
      {name:'Pack Studio',price:600000,desc:'Imprimante DTF A3+ + presse + massicot + four + stock 6 mois + 6h formation + apps 6 mois'}
    ],
    paiement3x: true,
    acompte: 0.3,
    passHCS: true,
    reservation: true
  };
}

// V6 — Abonnements HCS (nouveau)
if (CAMPS[6]) {
  CAMPS[6].name = 'Abonnements HCS';
  CAMPS[6].tag = 'Fidélisation · Revenu récurrent';
  CAMPS[6].tags = ['Abonnement', 'Fidélité', 'Premium'];
  CAMPS[6].headline = 'ABONNEMENTS HCS';
  CAMPS[6].subline = 'Accès privilège · Collections en avant-première · Atelier · Apps';
  CAMPS[6].badge = '🎊 DÈS 1 800 XPF/MOIS';
  CAMPS[6].ltype = 'subscription';
  CAMPS[6].features = [
    {i:'⭐',t:'Avant-première collections'},
    {i:'🏭',t:'Atelier à tarif réduit'},
    {i:'📱',t:'Accès apps HCS'},
    {i:'🎁',t:'T-shirt offert/mois (Premium)'}
  ];
  CAMPS[6].products = [
    {e:'🌱',n:'Starter',p:'1 800 XPF/mois'},
    {e:'⚡',n:'Pro',p:'3 500 XPF/mois'},
    {e:'👑',n:'Premium',p:'5 500 XPF/mois'}
  ];
  CAMPS[6]._v2 = {
    tiers: [
      {id:'starter',name:'Starter',price:1800,avantages:['Avant-première collections','-10% sur tout','1 logo offert/mois','Newsletter exclusive']},
      {id:'pro',name:'Pro ⭐',price:3500,popular:true,avantages:['Tout Starter','1h atelier offerte/mois','-20% accessoires','Apps HCS illimité','Badge Membre Pro']},
      {id:'premium',name:'Premium 👑',price:5500,avantages:['Tout Pro','1 t-shirt collection/mois','2h atelier','Accès prioritaire','-30% accessoires','Événements HCS']}
    ],
    engagements: [
      {mois:1,label:'Mensuel',discount:0},
      {mois:3,label:'3 mois',discount:0.05},
      {mois:6,label:'6 mois',discount:0.10},
      {mois:12,label:'12 mois',discount:0.15}
    ],
    parrainage: true,
    carteMembreQR: true
  };
}

// V7 — Services Numériques IA (nouveau)
if (CAMPS[7]) {
  CAMPS[7].name = 'Services Numériques IA';
  CAMPS[7].tag = 'Détourage · Vecto · Logo IA · Apps';
  CAMPS[7].tags = ['Services', 'IA', 'Graphisme', 'Apps'];
  CAMPS[7].headline = 'SERVICES NUMÉRIQUES IA';
  CAMPS[7].subline = 'Détourage · Vectorisation · Création logo IA · Accès apps HCS';
  CAMPS[7].badge = '✏️ RÉSULTATS IMMÉDIATS';
  CAMPS[7].ltype = 'service';
  CAMPS[7].features = [
    {i:'✂️',t:'Détourage IA instantané'},
    {i:'🔄',t:'Vectorisation HD'},
    {i:'🎨',t:'Création logo IA sur mesure'},
    {i:'📱',t:'Accès apps HCS autonome'}
  ];
  CAMPS[7].products = [
    {e:'✂️',n:'Détourage IA',p:'1 500 XPF'},
    {e:'🎨',n:'Création Logo IA',p:'8 000 XPF'},
    {e:'📱',n:'Accès Apps HCS (1 jour)',p:'2 000 XPF'}
  ];
  CAMPS[7]._v2 = {
    services: [
      {id:'detourage1',name:'Détourage IA (1 image)',price:1500},
      {id:'detourage5',name:'Détourage IA (5 images)',price:5000},
      {id:'detourage10',name:'Détourage IA (10 images)',price:8000},
      {id:'vecto',name:'Vectorisation simple',price:2500},
      {id:'logo',name:'Création Logo IA (3 propositions + 2 révisions)',price:8000},
      {id:'pack',name:'Pack Graphique complet',price:12000},
      {id:'apps1j',name:'Accès Apps HCS — 1 jour',price:2000},
      {id:'apps1s',name:'Accès Apps HCS — 1 semaine',price:5000},
      {id:'apps1m',name:'Accès Apps HCS — 1 mois',price:12000}
    ],
    freemium: true,
    crossSellV4: true
  };
}

/* ═══════════════════════════════════════════════════════════
   2. MISE À JOUR DU ROUTEUR renderLP
   ═══════════════════════════════════════════════════════════ */
const _origRenderLP = window.renderLP;

window.renderLP = function(c) {
  const v2 = c._v2 || {};

  // V3 Originals — parcours collection
  if (c.ltype === 'originals') return renderLP_Originals(c, v2);

  // V4 Pack Atelier
  if (c.ltype === 'pack-atelier') return renderLP_PackAtelier(c, v2);

  // V5 Formation
  if (c.ltype === 'formation') return renderLP_Formation(c, v2);

  // V6 Subscription — enrichi
  if (c.ltype === 'subscription') return renderLP_Subscription(c, v2);

  // V7 Service — enrichi
  if (c.ltype === 'service') return renderLP_Service(c, v2);

  // V0, V1, V2 et autres → original avec enhancements
  let html = _origRenderLP(c);

  // Injecter cross-sell si V0
  if (c.id === 0 && v2.upsell2nd) {
    html += renderCrossSellBanner(c, '💡 2e sticker à -20% !', 'Ajoutez un 2e sticker dans la même commande');
  }

  // Injecter "pas de logo" si V1
  if (c.id === 1 && v2.noLogoPath) {
    html += renderNoLogoOptions(c);
  }

  // Injecter guide broderie/DTF si V2
  if (c.id === 2 && v2.guideChoix) {
    html += renderGuideChoix(c);
  }

  return html;
};

/* ═══════════════════════════════════════════════════════════
   3. MISE À JOUR DU ROUTEUR exportLP
   ═══════════════════════════════════════════════════════════ */
const _origExportLP = window.exportLP;

window.exportLP = function(id) {
  const c = CAMPS[id];
  if (!c) return;

  // V1, V2 → tshirt export (existant)
  if (c.id === 1 || c.id === 2) { 
    if (typeof exportLPTshirt === 'function') exportLPTshirt(id);
    return;
  }

  // V3 Originals
  if (c.ltype === 'originals') { exportLP_Originals(id); return; }

  // V4 Pack Atelier
  if (c.ltype === 'pack-atelier') { exportLP_PackAtelier(id); return; }

  // V5 Formation
  if (c.ltype === 'formation') { exportLP_Formation(id); return; }

  // V6 Abonnements
  if (c.ltype === 'subscription') { exportLP_Subscription(id); return; }

  // V7 Services IA
  if (c.ltype === 'service') { exportLP_Service(id); return; }

  // V0 → generic amélioré
  _origExportLP(id);
};

/* ═══════════════════════════════════════════════════════════
   4. RENDERERS LP IN-APP (preview dans Andromeda)
   ═══════════════════════════════════════════════════════════ */

function _heroHtml(c) {
  return `
    <div class="lp-hero" id="lp-hero-${c.id}" style="position:relative">
      <div class="lp-hero-bg" id="lp-hero-bg-${c.id}" style="background:${c.heroGrad}"></div>
      <div class="lp-hero-content">
        <div style="display:inline-block;background:${c.colors.badge};color:white;padding:6px 16px;border-radius:16px;font-size:.7rem;font-weight:700;margin-bottom:10px">${c.badge}</div>
        <h2>${c.headline}</h2>
        <p>${c.subline}</p>
        <button class="lp-cta" style="color:${c.colors.primary}">${c.cta}</button>
      </div>
    </div>`;
}

function _featsHtml(c) {
  return `<div class="lp-feats">${c.features.map(f=>`
    <div class="lp-feat"><div class="lp-feat-icon">${f.i}</div><div class="lp-feat-text">${f.t}</div></div>
  `).join('')}</div>`;
}

function _prodsHtml(c) {
  return `<div class="lp-prods" id="prods-grid-${c.id}">${c.products.map((p,i)=>`
    <div class="lp-prod" id="lprod-${c.id}-${i}" onclick="selectProd(${c.id},${i})">
      <div class="prod-check">✓</div>
      <div class="lp-prod-img" id="lpimg-${c.id}-${i}">${p.e}</div>
      <div class="lp-prod-info">
        <div class="lp-prod-name">${p.n}</div>
        <div class="lp-prod-price" style="color:${c.colors.primary}">${p.p}</div>
      </div>
    </div>`).join('')}</div>
    <div class="prod-cta-bar" id="prod-cta-${c.id}">
      <button class="btn-add-cart" onclick="goToCheckout(${c.id})">🛒 Commander &amp; Payer</button>
    </div>`;
}

// ── V3 Originals ──
function renderLP_Originals(c, v2) {
  const month = new Date().getMonth() + 1;
  const theme = v2.themes?.[month] || 'Collection';
  return _heroHtml(c) + `
    <div style="text-align:center;padding:10px;font-size:.7rem;color:${c.colors.primary};font-weight:700;letter-spacing:1px">
      🌺 THÈME DU MOIS : ${theme.toUpperCase()} · ÉDITION LIMITÉE
    </div>
    <div style="font-size:.78rem;font-weight:700;margin:8px 0 6px;text-align:center">Choisissez votre variante</div>
  ` + _prodsHtml(c) + `
    <div style="background:rgba(${_hexToRgb(c.colors.primary)},.08);border:1px solid rgba(${_hexToRgb(c.colors.primary)},.2);border-radius:10px;padding:12px;margin:10px 0;text-align:center">
      <div style="font-size:.78rem;font-weight:700;margin-bottom:4px">🎁 Pack Trio — Les 3 variantes</div>
      <div style="font-size:.85rem;font-weight:800;color:${c.colors.primary}">${_fmt(v2.packTrioPrice || 9900)} XPF <span style="font-size:.7rem;color:#888;text-decoration:line-through">${_fmt(3900*3)} XPF</span></div>
      <div style="font-size:.62rem;color:#888;margin-top:2px">Soit -${Math.round((v2.packTrioDiscount||0.15)*100)}% — La collection complète</div>
    </div>
  ` + _featsHtml(c) + `
    <div style="text-align:center;padding:10px;font-size:.62rem;color:#888">
      📧 Prochain mois : ${v2.themes?.[(month % 12) + 1] || '?'} — <span style="color:${c.colors.primary};cursor:pointer">Me prévenir →</span>
    </div>`;
}

// ── V4 Pack Atelier ──
function renderLP_PackAtelier(c, v2) {
  return _heroHtml(c) + `
    <div style="font-size:.72rem;font-weight:700;margin:8px 0 6px;text-align:center">ÉTAPE 1 — Choisissez votre pack</div>
  ` + _prodsHtml(c) + `
    <div style="border-top:1px solid rgba(255,255,255,.08);padding-top:10px;margin-top:8px">
      <div style="font-size:.72rem;font-weight:700;margin-bottom:6px;text-align:center">ÉTAPE 2 — Réserver l'atelier client</div>
      <div style="font-size:.65rem;color:#888;text-align:center;margin-bottom:8px">
        Pressez vos t-shirts vous-même en boutique HCS Papeete
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:1rem">🏭</div>
          <div style="font-size:.68rem;font-weight:700;margin-top:4px">Atelier (pack)</div>
          <div style="font-size:.72rem;font-weight:800;color:${c.colors.primary}">${_fmt(v2.atelierHourly||1500)} XPF/h</div>
        </div>
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:1rem">✨</div>
          <div style="font-size:.68rem;font-weight:700;margin-top:4px">Accessoires</div>
          <div style="font-size:.72rem;font-weight:800;color:${c.colors.primary}">dès 200 XPF</div>
        </div>
      </div>
    </div>
  ` + _featsHtml(c) + `
    <div style="text-align:center;padding:8px;font-size:.62rem;color:#888">
      💳 Paiement PayZen ou Pass HCS · 📱 App DTF Plaques Transfert pour composer votre planche
    </div>`;
}

// ── V5 Formation ──
function renderLP_Formation(c, v2) {
  return _heroHtml(c) + `
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;margin:8px 0">
      <div style="font-size:.78rem;font-weight:700;margin-bottom:8px;text-align:center">📋 Programme 3h</div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:.68rem;color:#aaa">
        <div><span style="color:${c.colors.primary};font-weight:700">0h—0h30</span> Tour de l'atelier + machines</div>
        <div><span style="color:${c.colors.primary};font-weight:700">0h30—1h15</span> Création numérique (PicWish + MockupForge)</div>
        <div><span style="color:${c.colors.primary};font-weight:700">1h15—1h45</span> Préparation fichier impression</div>
        <div><span style="color:${c.colors.primary};font-weight:700">1h45—2h30</span> Pressage t-shirts + accessoires</div>
        <div><span style="color:${c.colors.primary};font-weight:700">2h30—3h00</span> Bilan + conseil équipement</div>
      </div>
      <div style="text-align:center;margin-top:10px;font-size:.65rem;color:#888">
        Inclus : 1 planche DTF + 2 t-shirts + accessoires demo — Vous repartez avec tout
      </div>
    </div>
    <div style="font-size:.72rem;font-weight:700;margin:10px 0 6px;text-align:center">Packs machines sur mesure</div>
  ` + (v2.packs||[]).map(p => `
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;margin-bottom:6px">
      <div style="font-size:.76rem;font-weight:700">${p.name}</div>
      <div style="font-size:.65rem;color:#888;margin:3px 0">${p.desc}</div>
      <div style="font-size:.82rem;font-weight:800;color:${c.colors.primary}">${_fmt(p.price)} XPF</div>
    </div>
  `).join('') + _featsHtml(c);
}

// ── V6 Subscription (enrichi) ──
function renderLP_Subscription(c, v2) {
  const tiers = v2.tiers || [];
  return _heroHtml(c) + `
    <div class="lp-plans">${tiers.map(t => `
      <div class="lp-plan${t.popular?' feat':''}">
        <div class="lp-plan-name">${t.name}${t.popular?' (le + populaire)':''}</div>
        <div class="lp-plan-price">${_fmt(t.price)} XPF</div>
        <div class="lp-plan-per">/mois</div>
        <ul>${(t.avantages||[]).map(a => `<li>${a}</li>`).join('')}</ul>
      </div>
    `).join('')}</div>
    <div style="text-align:center;margin:10px 0;font-size:.65rem;color:#888">
      Engagement 3 mois -5% · 6 mois -10% · 12 mois -15%<br>
      🎁 Parrainage : -10% pour vous et votre filleul
    </div>
  ` + _featsHtml(c);
}

// ── V7 Service ──
function renderLP_Service(c, v2) {
  const services = v2.services || [];
  const cats = {
    'Détourage': services.filter(s => s.id.startsWith('detourage')),
    'Création': services.filter(s => s.id === 'vecto' || s.id === 'logo' || s.id === 'pack'),
    'Accès Apps': services.filter(s => s.id.startsWith('apps'))
  };
  return _heroHtml(c) + Object.entries(cats).map(([catName, items]) => `
    <div style="margin:8px 0">
      <div style="font-size:.72rem;font-weight:700;margin-bottom:6px">${catName}</div>
      ${items.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.72rem">
          <span style="color:#ccc">${s.name}</span>
          <span style="font-weight:700;color:${c.colors.primary}">${_fmt(s.price)} XPF</span>
        </div>
      `).join('')}
    </div>
  `).join('') + `
    <div style="text-align:center;padding:8px;font-size:.62rem;color:#888">
      ✨ 1er détourage gratuit pour tester · 💳 PayZen ou Pass HCS · ↗ Logos créés → imprimez-les via V4
    </div>
  ` + _featsHtml(c);
}

/* ═══════════════════════════════════════════════════════════
   5. CROSS-SELL COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function renderCrossSellBanner(c, title, desc) {
  return `<div style="background:rgba(${_hexToRgb(c.colors.primary)},.06);border:1px dashed rgba(${_hexToRgb(c.colors.primary)},.3);border-radius:8px;padding:10px;margin:8px 0;text-align:center">
    <div style="font-size:.72rem;font-weight:700;color:${c.colors.primary}">${title}</div>
    <div style="font-size:.62rem;color:#888;margin-top:2px">${desc}</div>
  </div>`;
}

function renderNoLogoOptions(_c) {
  return `<div style="margin:8px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.02)">
    <div style="font-size:.72rem;font-weight:700;margin-bottom:6px">Pas de logo ? 3 options :</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:.62rem">
      <div style="text-align:center;padding:8px;border:1px solid rgba(255,255,255,.08);border-radius:6px;cursor:pointer">
        <div style="font-size:1.1rem;margin-bottom:4px">✏️</div>
        <div style="font-weight:600">Texte perso</div>
        <div style="color:#888;margin-top:2px">Nom, phrase, chiffre</div>
      </div>
      <div style="text-align:center;padding:8px;border:1px solid rgba(250,112,154,.2);border-radius:6px;cursor:pointer">
        <div style="font-size:1.1rem;margin-bottom:4px">🌺</div>
        <div style="font-weight:600;color:#fa709a">Logo HCS Original</div>
        <div style="color:#888;margin-top:2px">Collections exclusives</div>
      </div>
      <div style="text-align:center;padding:8px;border:1px solid rgba(246,211,101,.2);border-radius:6px;cursor:pointer">
        <div style="font-size:1.1rem;margin-bottom:4px">🎨</div>
        <div style="font-weight:600;color:#f6d365">Logo IA sur mesure</div>
        <div style="color:#888;margin-top:2px">8 000 XPF</div>
      </div>
    </div>
  </div>`;
}

function renderGuideChoix(_c) {
  return `<div style="margin:8px 0;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:8px">
    <div style="font-size:.72rem;font-weight:700;margin-bottom:6px;text-align:center">Comment voulez-vous votre logo ?</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.65rem">
      <div style="text-align:center;padding:10px;border:2px solid rgba(67,233,123,.3);border-radius:8px;cursor:pointer;background:rgba(67,233,123,.04)">
        <div style="font-size:1.2rem;margin-bottom:4px">🖨️</div>
        <div style="font-weight:700;color:#43e97b">DTF</div>
        <div style="color:#888;margin-top:4px;font-size:.6rem">Multicolore · Détails fins · Rendu lisse · Dès 3 000 XPF</div>
      </div>
      <div style="text-align:center;padding:10px;border:2px solid rgba(246,211,101,.3);border-radius:8px;cursor:pointer;background:rgba(246,211,101,.04)">
        <div style="font-size:1.2rem;margin-bottom:4px">🧵</div>
        <div style="font-weight:700;color:#f6d365">Broderie</div>
        <div style="color:#888;margin-top:4px;font-size:.6rem">Texture 3D · Ultra-durable · Premium · Dès 4 500 XPF</div>
      </div>
    </div>
    <div style="font-size:.58rem;color:#666;text-align:center;margin-top:6px">
      💡 Logo > 6 couleurs → DTF recommandé · Logo simple < 4 couleurs → Broderie idéale
    </div>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   6. EXPORT LP FONCTIONS SPÉCIFIQUES
   ═══════════════════════════════════════════════════════════ */

function _getCommonExportVars(id) {
  const c = CAMPS[id];
  const g = el => document.getElementById(el);
  return {
    c,
    headline:  g('hl-'+id)?.textContent || c.headline,
    subline:   g('sl-'+id)?.textContent || c.subline,
    badge:     g('bd-'+id)?.textContent || c.badge,
    cta:       g('ct-'+id)?.textContent || c.cta,
    domain:    g('dm-'+id)?.textContent || c.domain,
    primary:   c.colors.primary,
    badge2:    c.colors.badge,
    cv:        g('cv-'+id),
    workerUrl:    g('pz-worker-'+id)?.value?.trim() || 'https://payzen-hcs.highcoffeeshirt.workers.dev/payzen-token',
    workerSecret: g('pz-secret-'+id)?.value?.trim() || 'hcs-payzen-2026',
    workerMode:   g('pz-mode-'+id)?.value || 'TEST'
  };
}

function _getHeroBg(v) {
  const cvBg = v.cv?.style.background || '';
  return cvBg.includes('url(') ? cvBg : (cvBg || v.c.heroGrad);
}

function _getProdImgs(id) {
  const c = CAMPS[id];
  return c.products.map((_,i) => {
    const img = document.getElementById('lpimg-'+id+'-'+i)?.querySelector('img');
    return img ? img.src : '';
  });
}


// ── V3 Export ──
function exportLP_Originals(id) {
  const v = _getCommonExportVars(id);
  const v2 = v.c._v2 || {};
  const heroBg = _getHeroBg(v);
  const prodImgs = _getProdImgs(id);
  const month = new Date().getMonth() + 1;
  const theme = v2.themes?.[month] || 'Collection';
  const prodsJson = JSON.stringify(v.c.products.map((p,i)=>({
    e:p.e, n:p.n, p:p.p,
    price: parseInt(p.p.replace(/[^\d]/g,''))||0,
    img: prodImgs[i]||''
  })));

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${v.headline} — HCS Tahiti</title>
<meta name="description" content="${v.subline}">
<link rel="stylesheet" href="https://static.osb.pf/static/js/krypton-client/V4.0/ext/classic-reset.css">
<script src="https://static.osb.pf/static/js/krypton-client/V4.0/ext/classic.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e8e8f0}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:${heroBg};background-size:cover;background-position:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:${v.c.colors.overlay}}
.hero-content{max-width:600px;position:relative;z-index:2}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:900;margin-bottom:14px;line-height:1.1;color:white}
.sub{font-size:1rem;opacity:.9;margin-bottom:20px;color:rgba(255,255,255,.85)}
.badge-hp{display:inline-block;background:${v.badge2};color:white;padding:8px 24px;border-radius:24px;font-weight:700;margin-bottom:20px}
.cta-hero{display:inline-block;background:white;color:${v.primary};padding:14px 36px;border-radius:30px;font-weight:700;font-size:1rem;text-decoration:none;cursor:pointer;border:none;transition:transform .15s;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.cta-hero:hover{transform:translateY(-2px)}
.section{padding:40px 20px;max-width:960px;margin:0 auto}
.section-title{font-size:1.1rem;font-weight:800;margin-bottom:8px;text-align:center}
.section-sub{font-size:.85rem;color:rgba(255,255,255,.6);text-align:center;margin-bottom:20px}
.theme-badge{text-align:center;padding:10px;font-size:.82rem;color:${v.primary};font-weight:700;letter-spacing:1px}
.prods{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px}
.prod{background:rgba(255,255,255,.05);border-radius:14px;overflow:hidden;border:2px solid rgba(255,255,255,.1);cursor:pointer;transition:all .2s;position:relative}
.prod:hover{border-color:${v.primary};transform:translateY(-3px)}
.prod.selected{border-color:${v.primary};box-shadow:0 0 0 4px ${v.primary}33}
.prod-check{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:${v.primary};display:none;align-items:center;justify-content:center;font-size:.7rem;color:white;font-weight:900}
.prod.selected .prod-check{display:flex}
.prod-img{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:48px;background:rgba(255,255,255,.04);overflow:hidden}
.prod-img img{width:100%;height:100%;object-fit:cover}
.prod-info{padding:14px}.prod-name{font-weight:600;margin-bottom:6px;font-size:.9rem}
.prod-price{color:${v.primary};font-weight:800;font-size:1.1rem}
.pack-trio{background:rgba(${_hexToRgb(v.primary)},.1);border:2px solid ${v.primary}44;border-radius:14px;padding:20px;margin:20px 0;text-align:center;cursor:pointer;transition:all .2s}
.pack-trio:hover{border-color:${v.primary};transform:translateY(-2px)}
.pack-trio.selected{border-color:${v.primary};box-shadow:0 0 0 4px ${v.primary}33}
.feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-top:28px}
.feat{background:rgba(255,255,255,.05);border-radius:10px;padding:18px;text-align:center;border:1px solid rgba(255,255,255,.1)}
.feat-icon{font-size:28px;margin-bottom:8px}.feat-txt{font-size:.82rem;color:rgba(255,255,255,.7)}
.btn-order{width:100%;padding:16px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:12px;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 6px 20px ${v.primary}66;transition:all .2s;display:none;margin-top:14px}
.btn-order.show{display:block}
.btn-order:hover{transform:translateY(-2px)}
.teaser{text-align:center;padding:24px;border-top:1px solid rgba(255,255,255,.08);margin-top:24px}
.teaser-title{font-size:.85rem;font-weight:700;margin-bottom:6px}
.teaser-next{font-size:.9rem;color:${v.primary};font-weight:800}
.email-capture{display:flex;gap:8px;max-width:360px;margin:12px auto 0}
.email-capture input{flex:1;padding:10px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:white;font-size:.85rem}
.email-capture button{padding:10px 18px;border-radius:8px;border:none;background:${v.primary};color:white;font-weight:700;cursor:pointer}
footer{text-align:center;padding:28px;color:rgba(255,255,255,.4);font-size:.82rem;border-top:1px solid rgba(255,255,255,.1)}
/* ── Checkout ── */
.ck-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:950;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.ck-overlay.open{display:flex}
@media(min-width:600px){.ck-overlay.open{align-items:center}}
.ck-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.ck-box{border-radius:20px}}
.ck-head{padding:16px 20px;border-bottom:1px solid #2a2a4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ck-head-title{font-size:.95rem;font-weight:800}
.ck-close{background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer;padding:4px}
.ck-steps{display:flex;padding:12px 20px;border-bottom:1px solid #2a2a4a;flex-shrink:0}
.ck-step{flex:1;text-align:center;position:relative}
.ck-step::after{content:'';position:absolute;top:13px;left:50%;width:100%;height:2px;background:#2a2a4a;z-index:0}
.ck-step:last-child::after{display:none}
.ck-dot2{width:26px;height:26px;border-radius:50%;border:2px solid #2a2a4a;background:#1e1e3a;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;margin:0 auto 4px;position:relative;z-index:1;color:#9090b0;transition:all .2s}
.ck-step.done .ck-dot2{background:#43e97b;border-color:#43e97b;color:#0f0f1a}
.ck-step.done::after{background:#43e97b}
.ck-step.active .ck-dot2{background:${v.primary};border-color:${v.primary};color:white;box-shadow:0 0 12px ${v.primary}66}
.ck-lbl{font-size:.58rem;color:#9090b0;font-weight:600}
.ck-step.active .ck-lbl{color:${v.primary}}
.ck-step.done .ck-lbl{color:#43e97b}
.ck-body{flex:1;overflow-y:auto;padding:20px}
.ck-foot{padding:14px 20px;border-top:1px solid #2a2a4a;display:flex;gap:8px;flex-shrink:0}
.ck-field{margin-bottom:12px}
.ck-field label{display:block;font-size:.7rem;color:#9090b0;margin-bottom:4px}
.ck-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .2s}
.ck-input:focus{border-color:${v.primary}}
.ck-textarea{resize:vertical;min-height:60px}
.dlv-opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.dlv-opt{padding:14px 10px;border-radius:10px;border:2px solid #2a2a4a;background:#1e1e3a;cursor:pointer;text-align:center;transition:all .2s}
.dlv-opt:hover,.dlv-opt.sel{border-color:${v.primary};background:${v.primary}1a}
.recap-box{background:#16213e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.recap-row{display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid #2a2a4a22}
.recap-row:last-child{border:none;padding-top:8px;border-top:1px solid #2a2a4a}
.recap-row span:first-child{color:#9090b0}
.btn-next{flex:1;padding:12px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer;transition:opacity .2s}
.btn-next:hover{opacity:.9}
.btn-prev{padding:12px 16px;background:#1e1e3a;border:1px solid #2a2a4a;color:#9090b0;border-radius:8px;font-size:.85rem;cursor:pointer}
.pz-loading{text-align:center;color:#9090b0;font-size:.85rem;padding:24px}
.pz-error{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:8px;padding:12px;color:#ff6b6b;font-size:.8rem;margin-top:10px;display:none}
.pz-ok{background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b;display:none}
.kr-embedded{background:#fff!important;border-radius:14px!important;padding:16px 14px!important;margin-top:4px!important;box-shadow:0 2px 16px rgba(0,0,0,.18)!important}
.kr-embedded .kr-payment-button{background:linear-gradient(135deg,${v.primary},#ff6584)!important;border-radius:10px!important;font-weight:800!important;font-size:.9rem!important;padding:13px!important;width:100%!important;border:none!important;color:#fff!important;cursor:pointer!important;margin-top:4px!important}
</style></head><body>

<div class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="badge-hp">${v.badge}</div>
    <h1>${v.headline}</h1>
    <p class="sub">${v.subline}</p>
    <a href="#collection" class="cta-hero">${v.cta}</a>
  </div>
</div>

<div class="theme-badge">🌺 THÈME DU MOIS : ${theme.toUpperCase()} · ÉDITION LIMITÉE</div>

<div class="section" id="collection">
  <div class="section-title">Choisissez votre variante</div>
  <div class="section-sub">3 interprétations exclusives du thème ${theme}</div>
  <div class="prods" id="prods-grid"></div>

  <div class="pack-trio" id="pack-trio" onclick="selectTrio()">
    <div style="font-size:1.2rem;margin-bottom:6px">🎁</div>
    <div style="font-size:1rem;font-weight:800">Pack Trio — Les 3 variantes</div>
    <div style="font-size:1.2rem;font-weight:900;color:${v.primary};margin:6px 0">${_fmt(v2.packTrioPrice||9900)} XPF</div>
    <div style="font-size:.8rem;color:rgba(255,255,255,.5)"><s>${_fmt(3900*3)} XPF</s> · Économisez ${_fmt(3900*3-(v2.packTrioPrice||9900))} XPF</div>
  </div>

  <button class="btn-order" id="btn-order" onclick="openCheckout()">🛒 Commander — <span id="total-display">0</span> XPF</button>
</div>

<div class="section">
  <div class="feats">${v.c.features.map(f=>`<div class="feat"><div class="feat-icon">${f.i}</div><div class="feat-txt">${f.t}</div></div>`).join('')}</div>
</div>

<div class="teaser">
  <div class="teaser-title">📅 Prochain mois</div>
  <div class="teaser-next">${v2.themes?.[(month%12)+1] || 'Prochaine collection'}</div>
  <div style="font-size:.82rem;color:rgba(255,255,255,.5);margin-top:4px">Soyez prévenu en avant-première</div>
  <div class="email-capture">
    <input type="email" placeholder="votre@email.com" id="teaser-email">
    <button onclick="captureEmail()">Me prévenir</button>
  </div>
</div>

<footer>© ${new Date().getFullYear()} High Coffee Shirt — Papeete, Polynésie Française</footer>

<!-- Checkout Modal -->
<div class="ck-overlay" id="ck-overlay" onclick="if(event.target===this)closeCk()">
<div class="ck-box">
  <div class="ck-head">
    <div class="ck-head-title" id="ck-title">🛒 Commander</div>
    <button class="ck-close" onclick="closeCk()">✕</button>
  </div>
  <div class="ck-steps">
    <div class="ck-step active" id="cks1"><div class="ck-dot2">1</div><div class="ck-lbl">Récap</div></div>
    <div class="ck-step" id="cks2"><div class="ck-dot2">2</div><div class="ck-lbl">Contact</div></div>
    <div class="ck-step" id="cks3"><div class="ck-dot2">3</div><div class="ck-lbl">Paiement</div></div>
  </div>
  <div class="ck-body" id="ck-body"></div>
  <div class="ck-foot" id="ck-foot"></div>
</div>
</div>

<script>
const WORKER_URL = '${v.workerUrl}';
const WORKER_SECRET = '${v.workerSecret}';
const WORKER_MODE = '${v.workerMode}';
const CAMP_NAME = '${v.headline}';
const ACCENT = '${v.primary}';
const PRODS = ${prodsJson};
const PACK_TRIO_PRICE = ${v2.packTrioPrice||9900};
let selected = null;
let total = 0;
let ckStep = 1;
let ckContact = {};
let ckDelivery = {type:'pickup'};

function init() {
  const grid = document.getElementById('prods-grid');
  grid.innerHTML = PRODS.map((p,i) => \`
    <div class="prod" id="prod-\${i}" onclick="selectProd(\${i})">
      <div class="prod-check">✓</div>
      <div class="prod-img">\${p.img ? '<img src="'+p.img+'">' : '<span>'+p.e+'</span>'}</div>
      <div class="prod-info">
        <div class="prod-name">\${p.n}</div>
        <div class="prod-price">\${p.p}</div>
      </div>
    </div>\`).join('');
}

function selectProd(i) {
  document.querySelectorAll('.prod').forEach(p=>p.classList.remove('selected'));
  document.getElementById('pack-trio').classList.remove('selected');
  document.getElementById('prod-'+i).classList.add('selected');
  selected = i; total = PRODS[i].price;
  updateTotal();
}

function selectTrio() {
  document.querySelectorAll('.prod').forEach(p=>p.classList.remove('selected'));
  document.getElementById('pack-trio').classList.toggle('selected');
  if (document.getElementById('pack-trio').classList.contains('selected')) {
    selected = 'trio'; total = PACK_TRIO_PRICE;
  } else { selected = null; total = 0; }
  updateTotal();
}

function updateTotal() {
  const btn = document.getElementById('btn-order');
  const display = document.getElementById('total-display');
  if (total > 0) { btn.classList.add('show'); display.textContent = total.toLocaleString('fr-FR'); }
  else btn.classList.remove('show');
}

function openCheckout() {
  if (!selected && selected !== 0) return;
  ckStep = 1; ckContact = {}; ckDelivery = {type:'pickup'};
  document.getElementById('ck-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  ckRender();
}

function closeCk() {
  document.getElementById('ck-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function ckRender() {
  const titles = {1:'📦 Votre commande',2:'👤 Coordonnées',3:'💳 Paiement sécurisé'};
  document.getElementById('ck-title').textContent = titles[ckStep];
  for(let i=1;i<=3;i++){const el=document.getElementById('cks'+i);el.className='ck-step'+(i<ckStep?' done':i===ckStep?' active':'');}
  if (ckStep===1) ckRecap();
  else if (ckStep===2) ckContact1();
  else ckPayment();
}

function ckRecap() {
  const name = selected === 'trio' ? 'Pack Trio (3 variantes)' : PRODS[selected].n;
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Produit</span><span>\${name}</span></div>
      <div class="recap-row"><span>Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${total.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    <div style="font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.7;margin-top:8px">
      Livraison en boutique HCS Papeete ou en ligne sur Polynésie.
    </div>\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-next" onclick="ckStep=2;ckRender()">Continuer — Coordonnées →</button>\`;
}

function ckContact1() {
  const s = ckContact;
  document.getElementById('ck-body').innerHTML = \`
    <div class="ck-field"><label>Prénom & Nom *</label><input class="ck-input" id="ck-name" placeholder="Jean Dupont" value="\${s.name||''}"></div>
    <div class="ck-field"><label>Email *</label><input class="ck-input" id="ck-email" type="email" placeholder="jean@mail.com" value="\${s.email||''}"></div>
    <div class="ck-field"><label>Téléphone</label><input class="ck-input" id="ck-phone" type="tel" placeholder="87 00 00 00" value="\${s.phone||''}"></div>
    <div style="font-size:.72rem;color:#9090b0;margin:10px 0 4px">Mode de récupération</div>
    <div class="dlv-opts">
      <div class="dlv-opt \${ckDelivery.type==='pickup'?'sel':''}" onclick="swDlv('pickup')"><div style="font-size:24px;margin-bottom:6px">🏪</div><div style="font-size:.82rem;font-weight:700">Retrait boutique</div><div style="font-size:.65rem;color:#9090b0">HCS — Papeete</div></div>
      <div class="dlv-opt \${ckDelivery.type==='delivery'?'sel':''}" onclick="swDlv('delivery')"><div style="font-size:24px;margin-bottom:6px">🚚</div><div style="font-size:.82rem;font-weight:700">Livraison</div><div style="font-size:.65rem;color:#9090b0">3–5 jours ouvrés</div></div>
    </div>
    <div id="f-pickup" style="\${ckDelivery.type==='pickup'?'':'display:none'}">
      <div class="ck-field"><label>Date retrait</label><input class="ck-input" id="ck-date" type="date" min="\${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div id="f-delivery" style="\${ckDelivery.type==='delivery'?'':'display:none'}">
      <div class="ck-field"><label>Adresse *</label><input class="ck-input" id="ck-addr" placeholder="Rue, quartier, commune"></div>
    </div>\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" onclick="ckStep=1;ckRender()">← Retour</button><button class="btn-next" onclick="ckSaveContact()">Continuer — Paiement →</button>\`;
}

function swDlv(t) {
  ckDelivery.type=t;
  document.querySelectorAll('.dlv-opt').forEach((el,i)=>el.classList.toggle('sel',i===(t==='pickup'?0:1)));
  document.getElementById('f-pickup').style.display=t==='pickup'?'':'none';
  document.getElementById('f-delivery').style.display=t==='delivery'?'':'none';
}

function ckSaveContact() {
  const name=document.getElementById('ck-name')?.value.trim(), email=document.getElementById('ck-email')?.value.trim();
  if(!name){alert('Saisissez votre nom.');return;}
  if(!email||!email.includes('@')){alert('Email invalide.');return;}
  const isPick=ckDelivery.type==='pickup';
  if(!isPick){const addr=document.getElementById('ck-addr')?.value.trim();if(!addr){alert('Saisissez votre adresse.');return;}ckDelivery.address=addr;}
  else{ckDelivery.pickupDate=document.getElementById('ck-date')?.value;}
  ckContact={name,email,phone:document.getElementById('ck-phone')?.value.trim()||''};
  ckStep=3;ckRender();
}

async function ckPayment() {
  const productName = selected === 'trio' ? 'Pack Trio (3 variantes)' : PRODS[selected].n;
  const orderId = 'HCS-ORIG-' + Date.now();
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Produit</span><span>\${productName}</span></div>
      <div class="recap-row"><span>Client</span><span>\${ckContact.name}</span></div>
      <div class="recap-row"><span>Livraison</span><span>\${ckDelivery.type==='pickup'?'🏪 Retrait':'🚚 Domicile'}</span></div>
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${total.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${location.protocol==='file:'?\`<div style="background:rgba(246,211,101,.12);border:2px solid #f6d365;border-radius:12px;padding:20px;text-align:center"><div style="font-size:1.8rem;margin-bottom:8px">⚠️</div><div style="font-weight:800;color:#f6d365;margin-bottom:8px">Fichier ouvert en local</div><div style="font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.8">Le paiement OSB nécessite une URL https://.<br>Publie cette LP via le bouton <strong>🌐 Publier</strong>.</div></div>\`:\`<div id="pz-loading" class="pz-loading">🔒 Connexion sécurisée à OSB Polynésie…</div>
    <div class="kr-embedded" id="pz-kr-form" style="display:none"></div>
    <div class="pz-error" id="pz-error"></div>
    <div class="pz-ok" id="pz-ok"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Paiement accepté !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Merci <strong>\${ckContact.name}</strong>.<br>Commande <strong>\${orderId}</strong> confirmée.<br>Vous recevrez un email à \${ckContact.email}.</p></div>\`}\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" id="pz-back" onclick="ckStep=2;ckRender()">← Retour</button>\`;
  if(location.protocol==='file:') return;
  const oldSdk=document.getElementById('pz-sdk'); if(oldSdk) oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const res = await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount:total,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:ckContact.email})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Erreur serveur');}
    const {formToken,publicKey} = await res.json();
    if(!document.getElementById('pz-css1')){
      const c1=document.createElement('link');c1.id='pz-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);
      const c2=document.createElement('link');c2.id='pz-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);
    }
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK OSB indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pz-loading').style.display='none';
    document.getElementById('pz-kr-form').style.display='block';
    function showSuccess() {
      document.getElementById('pz-kr-form').style.display='none';
      const ok=document.getElementById('pz-ok'); if(ok){ok.removeAttribute('style');ok.style.cssText='display:block!important';}
      const bk=document.getElementById('pz-back'); if(bk) bk.style.display='none';
      fetch(WORKER_URL.replace('/payzen-token','/order/save'),{
        method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
        body:JSON.stringify({orderId,status:'paid',amount:total,currency:'XPF',campaignName:CAMP_NAME,product:productName,
          client:{name:ckContact.name,email:ckContact.email,phone:ckContact.phone||''},
          delivery:{type:ckDelivery.type,address:ckDelivery.address||'',pickupDate:ckDelivery.pickupDate||'',deliveryDelay:3},
          note:'Collection DTF Originals | '+productName})
      }).catch(e=>console.warn('Ordre non sauvegardé:',e));
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){showSuccess();}return false;});
    const krForm=document.querySelector('.kr-embedded');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList.contains('kr-payment-success')){done=true;showSuccess();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e) {
    document.getElementById('pz-loading').style.display='none';
    const err=document.getElementById('pz-error'); err.style.display='block'; err.textContent='❌ '+e.message;
  }
}

function captureEmail() {
  const email = document.getElementById('teaser-email').value;
  if (email) alert('✓ Merci ! Vous serez prévenu de la prochaine collection à ' + email);
}

document.addEventListener('keydown', e => { if(e.key==='Escape') closeCk(); });
init();
<\/script>
</body></html>`;

  _downloadHtml(html, `hcs-originals-${_slug(v.headline)}.html`);
}

// ── V4 Export ──
function exportLP_PackAtelier(id) {
  const v = _getCommonExportVars(id);
  const heroBg = _getHeroBg(v);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${v.headline} — HCS Tahiti</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e8e8f0}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:${heroBg};background-size:cover;background-position:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:${v.c.colors.overlay}}
.hero-content{max-width:600px;position:relative;z-index:2}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:900;margin-bottom:14px;line-height:1.1;color:white}
.sub{font-size:1rem;opacity:.9;margin-bottom:20px;color:rgba(255,255,255,.85)}
.badge-hp{display:inline-block;background:${v.badge2};color:white;padding:8px 24px;border-radius:24px;font-weight:700;margin-bottom:20px}
.cta-hero{display:inline-block;background:white;color:${v.primary};padding:14px 36px;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;border:none;transition:transform .15s;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.cta-hero:hover{transform:translateY(-2px)}
.section{padding:40px 20px;max-width:960px;margin:0 auto}
.section-title{font-size:1.2rem;font-weight:800;margin-bottom:8px;text-align:center}
.section-sub{font-size:.85rem;color:rgba(255,255,255,.6);text-align:center;margin-bottom:28px}
/* Parcours cards */
.parcours{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:32px}
.parcours-card{background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);border-radius:18px;padding:28px;cursor:pointer;transition:all .2s;position:relative}
.parcours-card:hover{border-color:${v.primary};transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.parcours-card.sel{border-color:${v.primary};background:rgba(${_hexToRgb(v.primary)},.08);box-shadow:0 0 0 4px ${v.primary}33}
.parcours-icon{font-size:40px;margin-bottom:14px}
.parcours-title{font-size:1rem;font-weight:800;margin-bottom:8px}
.parcours-desc{font-size:.82rem;color:rgba(255,255,255,.7);line-height:1.6;margin-bottom:14px}
.parcours-price{font-size:1.3rem;font-weight:900;color:${v.primary}}
.parcours-check{position:absolute;top:14px;right:14px;width:24px;height:24px;border-radius:50%;background:${v.primary};color:white;display:none;align-items:center;justify-content:center;font-size:.7rem;font-weight:900}
.parcours-card.sel .parcours-check{display:flex}
/* Accessories grid */
.accs{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0}
.acc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:all .15s}
.acc:hover,.acc.sel{border-color:${v.primary};background:${v.primary}12}
.acc-icon{font-size:24px;margin-bottom:6px}
.acc-name{font-size:.75rem;font-weight:700;margin-bottom:4px}
.acc-price{font-size:.8rem;color:${v.primary};font-weight:800}
/* Features */
.feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin:28px 0}
.feat{background:rgba(255,255,255,.05);border-radius:10px;padding:18px;text-align:center;border:1px solid rgba(255,255,255,.08)}
.feat-icon{font-size:28px;margin-bottom:8px}.feat-txt{font-size:.82rem;color:rgba(255,255,255,.7)}
/* CTA section */
.cta-section{text-align:center;padding:40px 20px;background:rgba(${_hexToRgb(v.primary)},.06);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.btn-order{display:inline-block;padding:16px 48px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:30px;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 6px 24px ${v.primary}66;transition:all .2s;opacity:.5;pointer-events:none}
.btn-order.enabled{opacity:1;pointer-events:auto}
.btn-order:hover{transform:translateY(-2px)}
.total-display{font-size:.9rem;color:rgba(255,255,255,.6);margin-top:10px}
/* Checkout */
.ck-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:950;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.ck-overlay.open{display:flex}
@media(min-width:600px){.ck-overlay.open{align-items:center}}
.ck-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.ck-box{border-radius:20px}}
.ck-head{padding:16px 20px;border-bottom:1px solid #2a2a4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ck-head-title{font-size:.95rem;font-weight:800}
.ck-close{background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer}
.ck-steps{display:flex;padding:12px 20px;border-bottom:1px solid #2a2a4a;flex-shrink:0}
.ck-step{flex:1;text-align:center;position:relative}
.ck-step::after{content:'';position:absolute;top:13px;left:50%;width:100%;height:2px;background:#2a2a4a;z-index:0}
.ck-step:last-child::after{display:none}
.ck-dot2{width:26px;height:26px;border-radius:50%;border:2px solid #2a2a4a;background:#1e1e3a;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;margin:0 auto 4px;position:relative;z-index:1;color:#9090b0;transition:all .2s}
.ck-step.done .ck-dot2{background:#43e97b;border-color:#43e97b;color:#0f0f1a}
.ck-step.done::after{background:#43e97b}
.ck-step.active .ck-dot2{background:${v.primary};border-color:${v.primary};color:white}
.ck-lbl{font-size:.58rem;color:#9090b0;font-weight:600}
.ck-step.active .ck-lbl{color:${v.primary}}
.ck-step.done .ck-lbl{color:#43e97b}
.ck-body{flex:1;overflow-y:auto;padding:20px}
.ck-foot{padding:14px 20px;border-top:1px solid #2a2a4a;display:flex;gap:8px;flex-shrink:0}
.ck-field{margin-bottom:12px}
.ck-field label{display:block;font-size:.7rem;color:#9090b0;margin-bottom:4px}
.ck-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .2s}
.ck-input:focus{border-color:${v.primary}}
.ck-textarea{resize:vertical;min-height:60px}
.recap-box{background:#16213e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.recap-row{display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid #2a2a4a22}
.recap-row:last-child{border:none;padding-top:8px;border-top:1px solid #2a2a4a}
.recap-row span:first-child{color:#9090b0}
.btn-next{flex:1;padding:12px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}
.btn-prev{padding:12px 16px;background:#1e1e3a;border:1px solid #2a2a4a;color:#9090b0;border-radius:8px;font-size:.85rem;cursor:pointer}
.pz-loading{text-align:center;color:#9090b0;font-size:.85rem;padding:24px}
.pz-error{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:8px;padding:12px;color:#ff6b6b;font-size:.8rem;margin-top:10px;display:none}
.pz-ok{background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b;display:none}
.kr-embedded{background:#fff!important;border-radius:14px!important;padding:16px 14px!important;margin-top:4px!important}
.kr-embedded .kr-payment-button{background:linear-gradient(135deg,${v.primary},#ff6584)!important;border-radius:10px!important;font-weight:800!important;font-size:.9rem!important;padding:13px!important;width:100%!important;border:none!important;color:#fff!important;cursor:pointer!important;margin-top:4px!important}
footer{text-align:center;padding:28px;color:rgba(255,255,255,.4);font-size:.82rem;border-top:1px solid rgba(255,255,255,.1)}
</style></head><body>

<div class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="badge-hp">${v.badge}</div>
    <h1>${v.headline}</h1>
    <p class="sub">${v.subline}</p>
    <a href="#parcours" class="cta-hero">${v.cta}</a>
  </div>
</div>

<div class="section" id="parcours">
  <div class="section-title">Choisissez votre parcours</div>
  <div class="section-sub">Gang Sheet à imprimer chez vous ou session en atelier HCS</div>
  <div class="parcours">
    <div class="parcours-card" id="pc-a" onclick="selectParcours('a')">
      <div class="parcours-check">✓</div>
      <div class="parcours-icon">🖨️</div>
      <div class="parcours-title">Parcours A — Gang Sheet Collector</div>
      <div class="parcours-desc">Composez votre planche DTF (22" × 1 yard) avec l'app DTF Plaques Transfert. Vous recevez le fichier prêt à presser.</div>
      <div class="parcours-price">20 000 XPF</div>
    </div>
    <div class="parcours-card" id="pc-b" onclick="selectParcours('b')">
      <div class="parcours-check">✓</div>
      <div class="parcours-icon">🏪</div>
      <div class="parcours-title">Parcours B — Session Atelier HCS</div>
      <div class="parcours-desc">Réservez un créneau de 1h ou plus en boutique. On presse ensemble vos transferts sur vos textiles.</div>
      <div class="parcours-price">1 500 XPF / heure</div>
    </div>
  </div>

  <!-- Parcours A : options gang sheet -->
  <div id="section-a" style="display:none">
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px;margin-bottom:20px">
      <div style="font-size:.95rem;font-weight:800;margin-bottom:12px">🖨️ Votre commande Gang Sheet</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.6);line-height:1.7;margin-bottom:16px">
        Format : 22" × 1 yard (55 × 91 cm) · Résolution 300 DPI · Impression DTF<br>
        Fichier prêt à presser livré sous 48h (lundi–vendredi)
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="font-size:.72rem;color:#9090b0;margin-bottom:6px">Quantité de planches</div>
          <div style="display:flex;align-items:center;gap:10px">
            <button onclick="changeQtyA(-1)" style="width:34px;height:34px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:1rem;cursor:pointer">−</button>
            <span id="qty-a-val" style="font-size:1.1rem;font-weight:800;min-width:24px;text-align:center">1</span>
            <button onclick="changeQtyA(1)" style="width:34px;height:34px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:1rem;cursor:pointer">+</button>
            <span style="font-size:.78rem;color:#9090b0">× 20 000 XPF = <strong id="price-a" style="color:${v.primary}">20 000</strong> XPF</span>
          </div>
        </div>
      </div>
    </div>
    <div style="font-size:.78rem;color:rgba(255,255,255,.5);text-align:center;margin-bottom:16px">
      ✓ Accès aux apps HCS (DTF Plaques Transfert, MockupForge) inclus pendant la commande<br>
      ✓ Révision du fichier par notre équipe avant impression
    </div>
  </div>

  <!-- Parcours B : réservation atelier -->
  <div id="section-b" style="display:none">
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:24px;margin-bottom:20px">
      <div style="font-size:.95rem;font-weight:800;margin-bottom:12px">📅 Réserver votre session atelier</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <div style="font-size:.7rem;color:#9090b0;margin-bottom:4px">Date souhaitée</div>
          <input type="date" id="atelier-date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none" oninput="updateTotalB()">
        </div>
        <div>
          <div style="font-size:.7rem;color:#9090b0;margin-bottom:4px">Créneau</div>
          <select id="atelier-slot" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none" oninput="updateTotalB()">
            <option value="08-10">08h00 – 10h00</option>
            <option value="10-12">10h00 – 12h00</option>
            <option value="13-15">13h00 – 15h00</option>
            <option value="15-17">15h00 – 17h00</option>
          </select>
        </div>
        <div>
          <div style="font-size:.7rem;color:#9090b0;margin-bottom:4px">Durée</div>
          <select id="atelier-duration" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none" oninput="updateTotalB()">
            <option value="1">1 heure — 1 500 XPF</option>
            <option value="2">2 heures — 3 000 XPF</option>
            <option value="3">3 heures — 4 500 XPF</option>
          </select>
        </div>
        <div>
          <div style="font-size:.7rem;color:#9090b0;margin-bottom:4px">Textiles</div>
          <select id="atelier-textile" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none" oninput="updateTotalB()">
            <option value="0">J'apporte mes textiles</option>
            <option value="1">1 t-shirt HCS (+3 500 XPF)</option>
            <option value="2">2 t-shirts HCS (+7 000 XPF)</option>
          </select>
        </div>
      </div>
      <div style="font-size:.82rem;margin-bottom:8px;font-weight:700">Accessoires thermocollants (optionnel)</div>
      <div class="accs">
        <div class="acc" id="acc-patch" onclick="toggleAcc('patch',300)"><div class="acc-icon">🔴</div><div class="acc-name">Patch personnalisé</div><div class="acc-price">+300 XPF</div></div>
        <div class="acc" id="acc-lettres" onclick="toggleAcc('lettres',200)"><div class="acc-icon">🔤</div><div class="acc-name">Lettres 3D</div><div class="acc-price">+200 XPF</div></div>
        <div class="acc" id="acc-strass" onclick="toggleAcc('strass',500)"><div class="acc-icon">✨</div><div class="acc-name">Strass</div><div class="acc-price">+500 XPF</div></div>
        <div class="acc" id="acc-deco" onclick="toggleAcc('deco',400)"><div class="acc-icon">🎀</div><div class="acc-name">Transfert déco</div><div class="acc-price">+400 XPF</div></div>
      </div>
      <div style="margin-top:14px;padding:10px 14px;background:${v.primary}12;border-radius:8px;font-size:.78rem">
        ✓ Accès aux apps HCS pendant votre session (DTF Plaques Transfert, MockupForge, PicWish)<br>
        ✓ Accompagnement par notre équipe inclus
      </div>
    </div>
  </div>

  <!-- Feats -->
  <div class="feats">${v.c.features.map(f=>`<div class="feat"><div class="feat-icon">${f.i}</div><div class="feat-txt">${f.t}</div></div>`).join('')}</div>
</div>

<div class="cta-section">
  <button class="btn-order" id="btn-order" onclick="openCheckout()">
    🛒 Commander — <span id="total-display">Choisissez un parcours</span>
  </button>
</div>

<footer>© ${new Date().getFullYear()} High Coffee Shirt — Papeete, Polynésie Française</footer>

<!-- Checkout Modal -->
<div class="ck-overlay" id="ck-overlay" onclick="if(event.target===this)closeCk()">
<div class="ck-box">
  <div class="ck-head">
    <div class="ck-head-title" id="ck-title">🛒 Commander</div>
    <button class="ck-close" onclick="closeCk()">✕</button>
  </div>
  <div class="ck-steps">
    <div class="ck-step active" id="cks1"><div class="ck-dot2">1</div><div class="ck-lbl">Récap</div></div>
    <div class="ck-step" id="cks2"><div class="ck-dot2">2</div><div class="ck-lbl">Contact</div></div>
    <div class="ck-step" id="cks3"><div class="ck-dot2">3</div><div class="ck-lbl">Paiement</div></div>
  </div>
  <div class="ck-body" id="ck-body"></div>
  <div class="ck-foot" id="ck-foot"></div>
</div>
</div>

<script>
const WORKER_URL = '${v.workerUrl}';
const WORKER_SECRET = '${v.workerSecret}';
const WORKER_MODE = '${v.workerMode}';
const CAMP_NAME = '${v.headline}';
const ACCENT = '${v.primary}';

let parcours = null; // 'a' or 'b'
let qtyA = 1;
let accExtras = {};
let ckStep = 1, ckContact = {}, ckTotal = 0, ckProductName = '';

function selectParcours(p) {
  parcours = p;
  document.getElementById('pc-a').classList.toggle('sel', p==='a');
  document.getElementById('pc-b').classList.toggle('sel', p==='b');
  document.getElementById('section-a').style.display = p==='a' ? '' : 'none';
  document.getElementById('section-b').style.display = p==='b' ? '' : 'none';
  updateTotal();
}

function changeQtyA(d) {
  qtyA = Math.max(1, qtyA + d);
  document.getElementById('qty-a-val').textContent = qtyA;
  document.getElementById('price-a').textContent = (qtyA * 20000).toLocaleString('fr-FR');
  updateTotal();
}

function toggleAcc(key, price) {
  accExtras[key] = accExtras[key] ? null : price;
  document.getElementById('acc-'+key).classList.toggle('sel', !!accExtras[key]);
  updateTotalB();
}

function updateTotalB() { if(parcours==='b') updateTotal(); }

function calcTotal() {
  if (!parcours) return {total:0, name:''};
  if (parcours === 'a') {
    return {total: qtyA * 20000, name: \`Gang Sheet × \${qtyA} planche\${qtyA>1?'s':''}\`};
  }
  const dur = parseInt(document.getElementById('atelier-duration')?.value||1);
  const txtSel = document.getElementById('atelier-textile')?.value||'0';
  const txtPrice = [0,3500,7000][parseInt(txtSel)];
  const extras = Object.values(accExtras).reduce((s,v)=>s+(v||0),0);
  return {
    total: dur * 1500 + txtPrice + extras,
    name: \`Session atelier \${dur}h + accessoires\`
  };
}

function updateTotal() {
  const {total, name} = calcTotal();
  const btn = document.getElementById('btn-order');
  const disp = document.getElementById('total-display');
  if (total > 0 && parcours) {
    btn.classList.add('enabled');
    disp.textContent = name + ' — ' + total.toLocaleString('fr-FR') + ' XPF';
  } else {
    btn.classList.remove('enabled');
    disp.textContent = 'Choisissez un parcours';
  }
}

function openCheckout() {
  if (!parcours) return;
  const {total, name} = calcTotal();
  if (total === 0) return;
  ckTotal = total; ckProductName = name; ckStep = 1; ckContact = {};
  document.getElementById('ck-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  ckRender();
}

function closeCk() {
  document.getElementById('ck-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function ckRender() {
  const titles = {1:'📋 Récapitulatif',2:'👤 Coordonnées',3:'💳 Paiement sécurisé'};
  document.getElementById('ck-title').textContent = titles[ckStep];
  for(let i=1;i<=3;i++){const el=document.getElementById('cks'+i);el.className='ck-step'+(i<ckStep?' done':i===ckStep?' active':'');}
  if (ckStep===1) ckRecap1();
  else if (ckStep===2) ckContactForm();
  else ckPayment();
}

function ckRecap1() {
  const atelierInfo = parcours==='b' ? (() => {
    const date = document.getElementById('atelier-date')?.value || '—';
    const slot = document.getElementById('atelier-slot')?.value || '';
    const dur = document.getElementById('atelier-duration')?.value || '1';
    return \`\${date} · \${slot.replace('-','h–')}h · \${dur}h\`;
  })() : '';
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Parcours</span><span>\${parcours==='a'?'🖨️ Gang Sheet':'🏪 Atelier HCS'}</span></div>
      <div class="recap-row"><span>Détail</span><span>\${ckProductName}</span></div>
      \${atelierInfo?'<div class="recap-row"><span>Session</span><span>'+atelierInfo+'</span></div>':''}
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${ckTotal.toLocaleString('fr-FR')} XPF</span></div>
    </div>\`;
  const _pwBtn=HCSPass.canPay(ckTotal)?\`<button class="btn-pass" style="margin-top:8px;width:100%" onclick="pwPayCheckout(ckTotal,ckProductName,'HCS-ATL-'+Date.now(),{type:'atelier',deliveryDelay:0},'')">🎫 Payer avec Pass · \${HCSPass.getBalance().toLocaleString('fr-FR')} XPF</button>\`:'';
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-next" onclick="ckStep=2;ckRender()">Continuer →</button>\`+_pwBtn;
}

function ckContactForm() {
  const s = ckContact;
  document.getElementById('ck-body').innerHTML = \`
    <div class="ck-field"><label>Prénom & Nom *</label><input class="ck-input" id="ck-name" value="\${s.name||''}" placeholder="Jean Dupont"></div>
    <div class="ck-field"><label>Email *</label><input class="ck-input" id="ck-email" type="email" value="\${s.email||''}" placeholder="jean@mail.com"></div>
    <div class="ck-field"><label>Téléphone</label><input class="ck-input" id="ck-phone" type="tel" value="\${s.phone||''}" placeholder="87 00 00 00"></div>
    <div class="ck-field"><label>Message / demande spéciale</label><textarea class="ck-input ck-textarea" id="ck-note">\${s.note||''}</textarea></div>\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" onclick="ckStep=1;ckRender()">← Retour</button><button class="btn-next" onclick="ckSaveContact()">Paiement →</button>\`;
}

function ckSaveContact() {
  const name=document.getElementById('ck-name')?.value.trim(), email=document.getElementById('ck-email')?.value.trim();
  if(!name){alert('Saisissez votre nom.');return;}
  if(!email||!email.includes('@')){alert('Email invalide.');return;}
  ckContact={name,email,phone:document.getElementById('ck-phone')?.value.trim()||'',note:document.getElementById('ck-note')?.value.trim()||''};
  ckStep=3;ckRender();
}

async function ckPayment() {
  const orderId = 'HCS-ATELIER-' + Date.now();
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Commande</span><span>\${ckProductName}</span></div>
      <div class="recap-row"><span>Client</span><span>\${ckContact.name}</span></div>
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${ckTotal.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${location.protocol==='file:'?\`<div style="background:rgba(246,211,101,.12);border:2px solid #f6d365;border-radius:12px;padding:20px;text-align:center"><div style="font-size:1.8rem;margin-bottom:8px">⚠️</div><div style="font-weight:800;color:#f6d365;margin-bottom:8px">Fichier ouvert en local</div><div style="font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.8">Le paiement OSB nécessite une URL https://.<br>Publie cette LP via le bouton <strong>🌐 Publier</strong>.</div></div>\`:\`<div id="pz-loading" class="pz-loading">🔒 Connexion sécurisée à OSB Polynésie…</div>
    <div class="kr-embedded" id="pz-kr-form" style="display:none"></div>
    <div class="pz-error" id="pz-error"></div>
    <div class="pz-ok" id="pz-ok"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Paiement accepté !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Merci <strong>\${ckContact.name}</strong> !<br>Commande <strong>\${orderId}</strong> confirmée.<br>\${parcours==='b'?'Notre équipe vous contactera pour confirmer votre créneau.':'Votre fichier sera prêt sous 48h.'}</p></div>\`}\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" id="pz-back" onclick="ckStep=2;ckRender()">← Retour</button>\`;
  if(location.protocol==='file:') return;
  const oldSdk=document.getElementById('pz-sdk'); if(oldSdk) oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const res = await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount:ckTotal,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:ckContact.email})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Erreur serveur');}
    const {formToken,publicKey} = await res.json();
    if(!document.getElementById('pz-css1')){const c1=document.createElement('link');c1.id='pz-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);const c2=document.createElement('link');c2.id='pz-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);}
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK OSB indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pz-loading').style.display='none';
    document.getElementById('pz-kr-form').style.display='block';
    function showSuccess() {
      document.getElementById('pz-kr-form').style.display='none';
      const ok=document.getElementById('pz-ok');if(ok){ok.removeAttribute('style');ok.style.cssText='display:block!important';}
      const bk=document.getElementById('pz-back');if(bk)bk.style.display='none';
      const atelierDate=document.getElementById('atelier-date')?.value||'';
      const atelierSlot=document.getElementById('atelier-slot')?.value||'';
      fetch(WORKER_URL.replace('/payzen-token','/order/save'),{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
        body:JSON.stringify({orderId,status:'paid',amount:ckTotal,currency:'XPF',campaignName:CAMP_NAME,product:ckProductName,
          client:{name:ckContact.name,email:ckContact.email,phone:ckContact.phone||''},
          delivery:{type:'pickup',pickupDate:atelierDate,deliveryDelay:0},
          note:[ckContact.note,'Parcours:'+parcours,'Créneau:'+atelierDate+' '+atelierSlot].filter(Boolean).join(' | ')})
      }).catch(e=>console.warn('Ordre non sauvegardé:',e));
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){showSuccess();}return false;});
    const krForm=document.querySelector('.kr-embedded');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList.contains('kr-payment-success')){done=true;showSuccess();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e) {
    document.getElementById('pz-loading').style.display='none';
    const err=document.getElementById('pz-error');err.style.display='block';err.textContent='❌ '+e.message;
  }
}

document.addEventListener('keydown', e => { if(e.key==='Escape') closeCk(); });
_pwRefreshWidget();
<\/script>
${_passBlock(v)}
</body></html>`;

  _downloadHtml(html, `hcs-atelier-${_slug(v.headline)}.html`);
}

// ── V5 Export ──
function exportLP_Formation(id) {
  const v = _getCommonExportVars(id);
  const heroBg = _getHeroBg(v);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${v.headline} — HCS Tahiti</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e8e8f0}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:${heroBg};background-size:cover;background-position:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:${v.c.colors.overlay}}
.hero-content{max-width:640px;position:relative;z-index:2}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:900;margin-bottom:14px;line-height:1.1;color:white}
.sub{font-size:1rem;opacity:.9;margin-bottom:20px;color:rgba(255,255,255,.85)}
.badge-hp{display:inline-block;background:${v.badge2};color:white;padding:8px 24px;border-radius:24px;font-weight:700;margin-bottom:20px}
.price-hero{font-size:2rem;font-weight:900;color:white;margin-bottom:6px}
.price-hero small{font-size:.9rem;font-weight:400;color:rgba(255,255,255,.7)}
.cta-hero{display:inline-block;background:white;color:${v.primary};padding:14px 36px;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;border:none;transition:transform .15s;box-shadow:0 8px 30px rgba(0,0,0,.3);text-decoration:none}
.cta-hero:hover{transform:translateY(-2px)}
.section{padding:40px 20px;max-width:960px;margin:0 auto}
.section-title{font-size:1.2rem;font-weight:800;margin-bottom:8px;text-align:center}
.section-sub{font-size:.85rem;color:rgba(255,255,255,.6);text-align:center;margin-bottom:28px}
/* Programme */
.programme{display:flex;flex-direction:column;gap:0;max-width:680px;margin:0 auto 32px}
.prog-step{display:flex;gap:16px;align-items:flex-start;position:relative;padding-bottom:20px}
.prog-step::before{content:'';position:absolute;left:20px;top:44px;width:2px;bottom:0;background:linear-gradient(${v.primary},transparent)}
.prog-step:last-child::before{display:none}
.prog-num{width:40px;height:40px;border-radius:50%;background:${v.primary};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.88rem;flex-shrink:0;box-shadow:0 4px 16px ${v.primary}66;z-index:1}
.prog-content{flex:1;padding-top:8px}
.prog-title{font-size:.92rem;font-weight:800;margin-bottom:4px}
.prog-desc{font-size:.8rem;color:rgba(255,255,255,.65);line-height:1.6}
/* Inclus */
.inclus-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}
.inclus-item{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:16px;text-align:center}
.inclus-icon{font-size:24px;margin-bottom:8px}
.inclus-txt{font-size:.78rem;color:rgba(255,255,255,.75);line-height:1.5}
/* Packs machines */
.packs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin:20px 0}
.pack{background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;cursor:pointer;transition:all .2s;position:relative}
.pack:hover{border-color:${v.primary};transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.pack.sel{border-color:${v.primary};background:rgba(${_hexToRgb(v.primary)},.08)}
.pack.popular::after{content:'⭐ Populaire';position:absolute;top:-10px;right:16px;background:${v.primary};color:white;padding:3px 10px;border-radius:12px;font-size:.65rem;font-weight:800}
.pack-check{position:absolute;top:14px;left:14px;width:22px;height:22px;border-radius:50%;background:${v.primary};color:white;display:none;align-items:center;justify-content:center;font-size:.65rem;font-weight:900}
.pack.sel .pack-check{display:flex}
.pack-icon{font-size:36px;margin-bottom:12px}
.pack-title{font-size:1rem;font-weight:800;margin-bottom:6px}
.pack-price{font-size:1.4rem;font-weight:900;color:${v.primary};margin-bottom:12px}
.pack-features{list-style:none;font-size:.78rem;color:rgba(255,255,255,.7);line-height:2}
.pack-features li::before{content:'✓ ';color:${v.primary};font-weight:700}
/* Payment options */
.pay-opts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:20px 0}
.pay-opt{padding:10px 18px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);font-size:.78rem;font-weight:700;color:rgba(255,255,255,.7)}
/* CTA section */
.cta-section{text-align:center;padding:48px 20px;background:rgba(${_hexToRgb(v.primary)},.06);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.btn-order{display:inline-block;padding:18px 56px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:30px;font-size:1.05rem;font-weight:800;cursor:pointer;box-shadow:0 6px 24px ${v.primary}66;transition:all .2s}
.btn-order:hover{transform:translateY(-2px)}
/* Checkout */
.ck-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:950;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.ck-overlay.open{display:flex}
@media(min-width:600px){.ck-overlay.open{align-items:center}}
.ck-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.ck-box{border-radius:20px}}
.ck-head{padding:16px 20px;border-bottom:1px solid #2a2a4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ck-head-title{font-size:.95rem;font-weight:800}
.ck-close{background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer}
.ck-steps{display:flex;padding:12px 20px;border-bottom:1px solid #2a2a4a;flex-shrink:0}
.ck-step{flex:1;text-align:center;position:relative}
.ck-step::after{content:'';position:absolute;top:13px;left:50%;width:100%;height:2px;background:#2a2a4a;z-index:0}
.ck-step:last-child::after{display:none}
.ck-dot2{width:26px;height:26px;border-radius:50%;border:2px solid #2a2a4a;background:#1e1e3a;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;margin:0 auto 4px;position:relative;z-index:1;color:#9090b0;transition:all .2s}
.ck-step.done .ck-dot2{background:#43e97b;border-color:#43e97b;color:#0f0f1a}
.ck-step.done::after{background:#43e97b}
.ck-step.active .ck-dot2{background:${v.primary};border-color:${v.primary};color:white}
.ck-lbl{font-size:.58rem;color:#9090b0;font-weight:600}
.ck-step.active .ck-lbl{color:${v.primary}}
.ck-step.done .ck-lbl{color:#43e97b}
.ck-body{flex:1;overflow-y:auto;padding:20px}
.ck-foot{padding:14px 20px;border-top:1px solid #2a2a4a;display:flex;gap:8px;flex-shrink:0}
.ck-field{margin-bottom:12px}
.ck-field label{display:block;font-size:.7rem;color:#9090b0;margin-bottom:4px}
.ck-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .2s}
.ck-input:focus{border-color:${v.primary}}
.ck-textarea{resize:vertical;min-height:60px}
.recap-box{background:#16213e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.recap-row{display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid #2a2a4a22}
.recap-row:last-child{border:none;padding-top:8px;border-top:1px solid #2a2a4a}
.recap-row span:first-child{color:#9090b0}
.btn-next{flex:1;padding:12px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}
.btn-prev{padding:12px 16px;background:#1e1e3a;border:1px solid #2a2a4a;color:#9090b0;border-radius:8px;font-size:.85rem;cursor:pointer}
.pz-loading{text-align:center;color:#9090b0;font-size:.85rem;padding:24px}
.pz-error{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:8px;padding:12px;color:#ff6b6b;font-size:.8rem;margin-top:10px;display:none}
.pz-ok{background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b;display:none}
.kr-embedded{background:#fff!important;border-radius:14px!important;padding:16px 14px!important;margin-top:4px!important}
.kr-embedded .kr-payment-button{background:linear-gradient(135deg,${v.primary},#ff6584)!important;border-radius:10px!important;font-weight:800!important;font-size:.9rem!important;padding:13px!important;width:100%!important;border:none!important;color:#fff!important;cursor:pointer!important;margin-top:4px!important}
footer{text-align:center;padding:28px;color:rgba(255,255,255,.4);font-size:.82rem;border-top:1px solid rgba(255,255,255,.1)}
</style></head><body>

<div class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="badge-hp">${v.badge}</div>
    <h1>${v.headline}</h1>
    <p class="sub">${v.subline}</p>
    <div class="price-hero">38 000 XPF <small>· formation complète 3h en boutique</small></div>
    <a href="#programme" class="cta-hero" style="margin-top:20px">${v.cta}</a>
  </div>
</div>

<!-- Programme -->
<div class="section" id="programme">
  <div class="section-title">Programme de formation</div>
  <div class="section-sub">3 heures en boutique HCS Papeete — accompagnement personnalisé</div>
  <div class="programme">
    <div class="prog-step">
      <div class="prog-num">1</div>
      <div class="prog-content">
        <div class="prog-title">Tour de l'atelier (30 min)</div>
        <div class="prog-desc">Découvrez les machines : imprimante DTF, presse à chaud, massicot. Comprendre le processus complet du fichier à la pièce finie.</div>
      </div>
    </div>
    <div class="prog-step">
      <div class="prog-num">2</div>
      <div class="prog-content">
        <div class="prog-title">Création numérique avec les apps HCS (45 min)</div>
        <div class="prog-desc">Initiation à PicWish (détourage IA), MockupForge (placement logo) et DTF Plaques Transfert (composition gang sheet). Vous créez votre premier fichier.</div>
      </div>
    </div>
    <div class="prog-step">
      <div class="prog-num">3</div>
      <div class="prog-content">
        <div class="prog-title">Préparation fichier & impression (30 min)</div>
        <div class="prog-desc">Vérification DPI, séparation couleurs, nesting optimal. Lancement de votre première impression DTF.</div>
      </div>
    </div>
    <div class="prog-step">
      <div class="prog-num">4</div>
      <div class="prog-content">
        <div class="prog-title">Pressage sur textile (45 min)</div>
        <div class="prog-desc">Découpage des planches, réglage température et pression, pressage sur vos 2 t-shirts inclus. Gestes techniques et conseils durabilité.</div>
      </div>
    </div>
    <div class="prog-step">
      <div class="prog-num">5</div>
      <div class="prog-content">
        <div class="prog-title">Bilan & conseils personnalisés (30 min)</div>
        <div class="prog-desc">Questions-réponses, recommandations d'équipement selon votre projet, tarifs consommables et accès aux apps HCS.</div>
      </div>
    </div>
  </div>

  <!-- Inclus -->
  <div style="font-size:.95rem;font-weight:800;text-align:center;margin-bottom:16px">Inclus dans la formation</div>
  <div class="inclus-grid">
    <div class="inclus-item"><div class="inclus-icon">👕</div><div class="inclus-txt">2 t-shirts coton premium pour la pratique</div></div>
    <div class="inclus-item"><div class="inclus-icon">🎨</div><div class="inclus-txt">1 planche DTF 22" × 1 yard avec vos logos</div></div>
    <div class="inclus-item"><div class="inclus-icon">📱</div><div class="inclus-txt">Accès 30 jours aux apps HCS post-formation</div></div>
    <div class="inclus-item"><div class="inclus-icon">🧰</div><div class="inclus-txt">Kit d'accessoires demo (patchs, strass, lettres 3D)</div></div>
    <div class="inclus-item"><div class="inclus-icon">📋</div><div class="inclus-txt">Guide technique imprimé + accès ressources en ligne</div></div>
    <div class="inclus-item"><div class="inclus-icon">☕</div><div class="inclus-txt">Café & accompagnement by High Coffee Shirt</div></div>
  </div>
</div>

<!-- Réservation -->
<div class="section" id="reservation">
  <div class="section-title">Réserver votre formation</div>
  <div class="section-sub">Choisissez votre date et créneau</div>
  <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px;max-width:560px;margin:0 auto">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div>
        <div style="font-size:.72rem;color:#9090b0;margin-bottom:6px">Date souhaitée</div>
        <input type="date" id="form-date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none">
      </div>
      <div>
        <div style="font-size:.72rem;color:#9090b0;margin-bottom:6px">Créneau</div>
        <select id="form-slot" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none">
          <option value="09-12">09h00 – 12h00</option>
          <option value="13-16">13h00 – 16h00</option>
        </select>
      </div>
    </div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:14px">
      📍 HCS Atelier · Papeete, Tahiti<br>
      ℹ️ Notre équipe vous contactera sous 24h pour confirmer la disponibilité.
    </div>
  </div>
</div>

<!-- Packs Machines -->
<div class="section" id="packs">
  <div class="section-title">Passez à l'étape suivante</div>
  <div class="section-sub">Après la formation — équipez votre propre atelier DTF (optionnel)</div>
  <div class="packs">
    <div class="pack" id="pack-none" onclick="selectPack('none')">
      <div class="pack-check">✓</div>
      <div class="pack-icon">✅</div>
      <div class="pack-title">Formation seule</div>
      <div class="pack-price">38 000 XPF</div>
      <ul class="pack-features">
        <li>Programme complet 3h</li>
        <li>Inclus : 2 t-shirts + 1 planche</li>
        <li>Accès apps 30 jours</li>
      </ul>
    </div>
    <div class="pack" id="pack-passion" onclick="selectPack('passion')">
      <div class="pack-check">✓</div>
      <div class="pack-icon">🔥</div>
      <div class="pack-title">Pack Passion</div>
      <div class="pack-price">400 000 XPF</div>
      <ul class="pack-features">
        <li>Formation incluse</li>
        <li>Presse à chaud A3</li>
        <li>Stock consommables 1 mois</li>
        <li>Suivi 3 mois par HCS</li>
      </ul>
    </div>
    <div class="pack popular" id="pack-pro" onclick="selectPack('pro')">
      <div class="pack-check">✓</div>
      <div class="pack-icon">⚡</div>
      <div class="pack-title">Pack Pro</div>
      <div class="pack-price">500 000 XPF</div>
      <ul class="pack-features">
        <li>Formation incluse</li>
        <li>Presse grand format + massicot</li>
        <li>Stock consommables 3 mois</li>
        <li>Accès apps HCS 1 an</li>
        <li>Suivi mensuel HCS</li>
      </ul>
    </div>
    <div class="pack" id="pack-studio" onclick="selectPack('studio')">
      <div class="pack-check">✓</div>
      <div class="pack-icon">🏭</div>
      <div class="pack-title">Pack Studio</div>
      <div class="pack-price">600 000 XPF</div>
      <ul class="pack-features">
        <li>Formation incluse</li>
        <li>Imprimante DTF + presse + four</li>
        <li>Stock consommables 6 mois</li>
        <li>Accès apps HCS illimité</li>
        <li>Accompagnement 6 mois HCS</li>
      </ul>
    </div>
  </div>
  <div class="pay-opts">
    <div class="pay-opt">💳 Paiement en 3× ou 4× sans frais</div>
    <div class="pay-opt">🏦 Acompte 30% à la commande</div>
    <div class="pay-opt">🤝 Financement professionnel possible</div>
  </div>
</div>

<div class="cta-section">
  <div style="font-size:1rem;font-weight:700;margin-bottom:6px" id="order-label">Formation — 38 000 XPF</div>
  <button class="btn-order" onclick="openCheckout()">📅 Réserver ma formation</button>
</div>

<footer>© ${new Date().getFullYear()} High Coffee Shirt — Papeete, Polynésie Française</footer>

<!-- Checkout Modal -->
<div class="ck-overlay" id="ck-overlay" onclick="if(event.target===this)closeCk()">
<div class="ck-box">
  <div class="ck-head">
    <div class="ck-head-title" id="ck-title">📅 Réserver ma formation</div>
    <button class="ck-close" onclick="closeCk()">✕</button>
  </div>
  <div class="ck-steps">
    <div class="ck-step active" id="cks1"><div class="ck-dot2">1</div><div class="ck-lbl">Récap</div></div>
    <div class="ck-step" id="cks2"><div class="ck-dot2">2</div><div class="ck-lbl">Contact</div></div>
    <div class="ck-step" id="cks3"><div class="ck-dot2">3</div><div class="ck-lbl">Paiement</div></div>
  </div>
  <div class="ck-body" id="ck-body"></div>
  <div class="ck-foot" id="ck-foot"></div>
</div>
</div>

<script>
const WORKER_URL = '${v.workerUrl}';
const WORKER_SECRET = '${v.workerSecret}';
const WORKER_MODE = '${v.workerMode}';
const CAMP_NAME = '${v.headline}';
const ACCENT = '${v.primary}';

const PACKS = {
  none:    {name:'Formation seule',       price:38000},
  passion: {name:'Formation + Pack Passion', price:400000},
  pro:     {name:'Formation + Pack Pro',     price:500000},
  studio:  {name:'Formation + Pack Studio',  price:600000}
};

let selectedPack = 'none';
let ckStep = 1, ckContact = {};

function selectPack(key) {
  selectedPack = key;
  Object.keys(PACKS).forEach(k => document.getElementById('pack-'+k).classList.toggle('sel', k===key));
  const {name, price} = PACKS[key];
  document.getElementById('order-label').textContent = name + ' — ' + price.toLocaleString('fr-FR') + ' XPF';
}

function openCheckout() {
  ckStep = 1; ckContact = {};
  document.getElementById('ck-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  ckRender();
}

function closeCk() {
  document.getElementById('ck-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function ckRender() {
  const titles = {1:'📋 Récapitulatif',2:'👤 Coordonnées',3:'💳 Paiement sécurisé'};
  document.getElementById('ck-title').textContent = titles[ckStep];
  for(let i=1;i<=3;i++){const el=document.getElementById('cks'+i);el.className='ck-step'+(i<ckStep?' done':i===ckStep?' active':'');}
  if (ckStep===1) ckRecap1();
  else if (ckStep===2) ckContactForm();
  else ckPayment();
}

function ckRecap1() {
  const pack = PACKS[selectedPack];
  const date = document.getElementById('form-date')?.value || '—';
  const slot = document.getElementById('form-slot')?.value || '';
  const slotLabel = slot==='09-12'?'09h00–12h00':'13h00–16h00';
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Formule</span><span>\${pack.name}</span></div>
      <div class="recap-row"><span>Date souhaitée</span><span>\${date}</span></div>
      <div class="recap-row"><span>Créneau</span><span>\${slotLabel}</span></div>
      <div class="recap-row"><span>Inclus</span><span style="text-align:right;font-size:.72rem">2 t-shirts · 1 planche DTF<br>Kit accessoires · Guide</span></div>
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${pack.price.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${pack.price >= 400000 ? '<div style="background:rgba(67,233,123,.1);border:1px solid rgba(67,233,123,.25);border-radius:8px;padding:10px 14px;font-size:.75rem;color:#43e97b;line-height:1.6">✓ Paiement en 3× ou 4× sans frais disponible<br>✓ Acompte 30% à la commande · Solde à la livraison</div>' : ''}\`;
  const _pwAmt=pack.price>=400000?Math.round(pack.price*0.3):pack.price;
  const _pwBtn=HCSPass.canPay(_pwAmt)?\`<button class="btn-pass" style="margin-top:8px;width:100%" onclick="pwPayCheckout(\${_pwAmt},'\${pack.name}','HCS-FORM-'+Date.now(),{type:'pickup',deliveryDelay:0},'Pack:\${pack.name}')">🎫 Payer avec Pass · \${HCSPass.getBalance().toLocaleString('fr-FR')} XPF</button>\`:'';
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-next" onclick="ckStep=2;ckRender()">Continuer →</button>\`+_pwBtn;
}

function ckContactForm() {
  const s = ckContact;
  document.getElementById('ck-body').innerHTML = \`
    <div class="ck-field"><label>Prénom & Nom *</label><input class="ck-input" id="ck-name" value="\${s.name||''}" placeholder="Jean Dupont"></div>
    <div class="ck-field"><label>Email *</label><input class="ck-input" id="ck-email" type="email" value="\${s.email||''}" placeholder="jean@mail.com"></div>
    <div class="ck-field"><label>Téléphone *</label><input class="ck-input" id="ck-phone" type="tel" value="\${s.phone||''}" placeholder="87 00 00 00"></div>
    <div class="ck-field"><label>Votre projet (optionnel)</label><textarea class="ck-input ck-textarea" id="ck-note" placeholder="Ex: Je veux créer des t-shirts pour mon équipe...">\${s.note||''}</textarea></div>\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" onclick="ckStep=1;ckRender()">← Retour</button><button class="btn-next" onclick="ckSaveContact()">Paiement →</button>\`;
}

function ckSaveContact() {
  const name=document.getElementById('ck-name')?.value.trim(), email=document.getElementById('ck-email')?.value.trim(), phone=document.getElementById('ck-phone')?.value.trim();
  if(!name){alert('Saisissez votre nom.');return;}
  if(!email||!email.includes('@')){alert('Email invalide.');return;}
  if(!phone){alert('Indiquez votre numéro de téléphone.');return;}
  ckContact={name,email,phone,note:document.getElementById('ck-note')?.value.trim()||''};
  ckStep=3;ckRender();
}

async function ckPayment() {
  const pack = PACKS[selectedPack];
  const orderId = 'HCS-FORM-' + Date.now();
  const isLarge = pack.price >= 400000;
  const acompte = isLarge ? Math.round(pack.price * 0.3) : pack.price;
  const payAmount = acompte;
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Formule</span><span>\${pack.name}</span></div>
      <div class="recap-row"><span>Client</span><span>\${ckContact.name}</span></div>
      \${isLarge?'<div class="recap-row"><span>Total</span><span>'+pack.price.toLocaleString('fr-FR')+' XPF</span></div><div class="recap-row"><span style="color:#43e97b;font-weight:700">Acompte 30%</span><span style="color:#43e97b;font-weight:900">'+acompte.toLocaleString('fr-FR')+' XPF</span></div>':''}
      <div class="recap-row"><span style="font-weight:700">À payer</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${payAmount.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${location.protocol==='file:'?\`<div style="background:rgba(246,211,101,.12);border:2px solid #f6d365;border-radius:12px;padding:20px;text-align:center"><div style="font-size:1.8rem;margin-bottom:8px">⚠️</div><div style="font-weight:800;color:#f6d365;margin-bottom:8px">Fichier ouvert en local</div><div style="font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.8">Le paiement OSB nécessite une URL https://.<br>Publie cette LP via le bouton <strong>🌐 Publier</strong>.</div></div>\`:\`<div id="pz-loading" class="pz-loading">🔒 Connexion sécurisée à OSB Polynésie…</div>
    <div class="kr-embedded" id="pz-kr-form" style="display:none"></div>
    <div class="pz-error" id="pz-error"></div>
    <div class="pz-ok" id="pz-ok"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Réservation confirmée !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Merci <strong>\${ckContact.name}</strong> !<br>Notre équipe vous contactera sous 24h pour confirmer votre créneau.<br>Référence : <strong>\${orderId}</strong></p></div>\`}\`;
  document.getElementById('ck-foot').innerHTML = \`<button class="btn-prev" id="pz-back" onclick="ckStep=2;ckRender()">← Retour</button>\`;
  if(location.protocol==='file:') return;
  const oldSdk=document.getElementById('pz-sdk'); if(oldSdk) oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const res = await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount:payAmount,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:ckContact.email})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Erreur serveur');}
    const {formToken,publicKey} = await res.json();
    if(!document.getElementById('pz-css1')){const c1=document.createElement('link');c1.id='pz-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);const c2=document.createElement('link');c2.id='pz-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);}
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK OSB indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pz-loading').style.display='none';
    document.getElementById('pz-kr-form').style.display='block';
    function showSuccess() {
      document.getElementById('pz-kr-form').style.display='none';
      const ok=document.getElementById('pz-ok');if(ok){ok.removeAttribute('style');ok.style.cssText='display:block!important';}
      const bk=document.getElementById('pz-back');if(bk)bk.style.display='none';
      const formDate=document.getElementById('form-date')?.value||'';
      const formSlot=document.getElementById('form-slot')?.value||'';
      fetch(WORKER_URL.replace('/payzen-token','/order/save'),{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
        body:JSON.stringify({orderId,status:'paid',amount:payAmount,currency:'XPF',campaignName:CAMP_NAME,product:pack.name,
          client:{name:ckContact.name,email:ckContact.email,phone:ckContact.phone||''},
          delivery:{type:'pickup',pickupDate:formDate,deliveryDelay:0},
          note:[ckContact.note,'Pack:'+selectedPack,'Créneau:'+formDate+' '+formSlot,isLarge?'Acompte 30%':'Paiement complet'].filter(Boolean).join(' | ')})
      }).catch(e=>console.warn('Ordre non sauvegardé:',e));
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){showSuccess();}return false;});
    const krForm=document.querySelector('.kr-embedded');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList.contains('kr-payment-success')){done=true;showSuccess();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e) {
    document.getElementById('pz-loading').style.display='none';
    const err=document.getElementById('pz-error');err.style.display='block';err.textContent='❌ '+e.message;
  }
}

// Init : sélectionner "Formation seule" par défaut
selectPack('none');
document.addEventListener('keydown', e => { if(e.key==='Escape') closeCk(); });
_pwRefreshWidget();
<\/script>
${_passBlock(v)}
</body></html>`;

  _downloadHtml(html, `hcs-formation-${_slug(v.headline)}.html`);
}

// ── V6 Export ──
function exportLP_Subscription(id) {
  const v = _getCommonExportVars(id);
  const heroBg = _getHeroBg(v);
  const v2 = v.c._v2 || {};
  const tiers = v2.tiers || [
    {id:'starter',name:'Starter',price:1800,avantages:['Avant-première collections','-10% sur tout','1 logo offert/mois']},
    {id:'pro',name:'Pro ⭐',price:3500,popular:true,avantages:['Tout Starter','1h atelier offerte/mois','-20% accessoires','Apps HCS illimité']},
    {id:'premium',name:'Premium 👑',price:5500,avantages:['Tout Pro','1 t-shirt/mois','2h atelier','-30% accessoires']}
  ];
  const engagements = v2.engagements || [
    {mois:1,label:'Mensuel',discount:0},
    {mois:3,label:'3 mois',discount:0.05},
    {mois:6,label:'6 mois',discount:0.10},
    {mois:12,label:'12 mois',discount:0.15}
  ];

  const tiersJson = JSON.stringify(tiers);
  const engagementsJson = JSON.stringify(engagements);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${v.headline} — HCS Tahiti</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e8e8f0}
.hero{min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:${heroBg};background-size:cover;background-position:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:${v.c.colors.overlay}}
.hero-content{max-width:640px;position:relative;z-index:2}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:900;margin-bottom:14px;line-height:1.1;color:white}
.sub{font-size:1rem;opacity:.9;margin-bottom:20px;color:rgba(255,255,255,.85)}
.badge-hp{display:inline-block;background:${v.badge2};color:white;padding:8px 24px;border-radius:24px;font-weight:700;margin-bottom:20px}
.cta-hero{display:inline-block;background:white;color:${v.primary};padding:14px 36px;border-radius:30px;font-weight:700;font-size:1rem;cursor:pointer;border:none;transition:transform .15s;box-shadow:0 8px 30px rgba(0,0,0,.3)}
.cta-hero:hover{transform:translateY(-2px)}
.section{padding:40px 20px;max-width:960px;margin:0 auto}
.section-title{font-size:1.2rem;font-weight:800;margin-bottom:8px;text-align:center}
.section-sub{font-size:.85rem;color:rgba(255,255,255,.6);text-align:center;margin-bottom:28px}
/* Engagements */
.eng-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.eng-tab{padding:8px 18px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.7)}
.eng-tab:hover,.eng-tab.active{border-color:${v.primary};background:${v.primary}22;color:white}
.eng-tab.active .eng-discount{color:#43e97b}
.eng-discount{font-size:.65rem;font-weight:800;color:transparent}
/* Tiers */
.tiers{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-bottom:28px}
.tier{background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);border-radius:18px;padding:24px;cursor:pointer;transition:all .2s;position:relative}
.tier:hover{border-color:${v.primary};transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4)}
.tier.sel{border-color:${v.primary};background:rgba(${_hexToRgb(v.primary)},.08)}
.tier.popular::before{content:'⭐ Populaire';position:absolute;top:-10px;right:16px;background:${v.primary};color:white;padding:3px 10px;border-radius:12px;font-size:.65rem;font-weight:800}
.tier-check{position:absolute;top:14px;left:14px;width:22px;height:22px;border-radius:50%;background:${v.primary};color:white;display:none;align-items:center;justify-content:center;font-size:.65rem;font-weight:900}
.tier.sel .tier-check{display:flex}
.tier-name{font-size:1.1rem;font-weight:800;margin-bottom:4px}
.tier-price{font-size:1.6rem;font-weight:900;color:${v.primary};margin:10px 0}
.tier-price small{font-size:.75rem;font-weight:400;color:rgba(255,255,255,.5)}
.tier-avantages{list-style:none;font-size:.78rem;color:rgba(255,255,255,.7);line-height:2}
.tier-avantages li::before{content:'✓ ';color:${v.primary};font-weight:700}
/* Parrainage */
.parrainage{background:rgba(67,233,123,.06);border:1px solid rgba(67,233,123,.2);border-radius:12px;padding:20px;text-align:center;margin:20px 0}
/* CTA */
.cta-section{text-align:center;padding:48px 20px;background:rgba(${_hexToRgb(v.primary)},.06);border-top:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06)}
.btn-order{display:inline-block;padding:16px 48px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:30px;font-size:1rem;font-weight:800;cursor:pointer;box-shadow:0 6px 24px ${v.primary}66;transition:all .2s}
.btn-order:hover{transform:translateY(-2px)}
/* Checkout */
.ck-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:950;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.ck-overlay.open{display:flex}
@media(min-width:600px){.ck-overlay.open{align-items:center}}
.ck-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.ck-box{border-radius:20px}}
.ck-head{padding:16px 20px;border-bottom:1px solid #2a2a4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ck-head-title{font-size:.95rem;font-weight:800}
.ck-close{background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer}
.ck-steps{display:flex;padding:12px 20px;border-bottom:1px solid #2a2a4a;flex-shrink:0}
.ck-step{flex:1;text-align:center;position:relative}
.ck-step::after{content:'';position:absolute;top:13px;left:50%;width:100%;height:2px;background:#2a2a4a;z-index:0}
.ck-step:last-child::after{display:none}
.ck-dot2{width:26px;height:26px;border-radius:50%;border:2px solid #2a2a4a;background:#1e1e3a;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;margin:0 auto 4px;position:relative;z-index:1;color:#9090b0;transition:all .2s}
.ck-step.done .ck-dot2{background:#43e97b;border-color:#43e97b;color:#0f0f1a}
.ck-step.done::after{background:#43e97b}
.ck-step.active .ck-dot2{background:${v.primary};border-color:${v.primary};color:white}
.ck-lbl{font-size:.58rem;color:#9090b0;font-weight:600}
.ck-step.active .ck-lbl{color:${v.primary}}
.ck-step.done .ck-lbl{color:#43e97b}
.ck-body{flex:1;overflow-y:auto;padding:20px}
.ck-foot{padding:14px 20px;border-top:1px solid #2a2a4a;display:flex;gap:8px;flex-shrink:0}
.ck-field{margin-bottom:12px}
.ck-field label{display:block;font-size:.7rem;color:#9090b0;margin-bottom:4px}
.ck-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .2s}
.ck-input:focus{border-color:${v.primary}}
.ck-textarea{resize:vertical;min-height:60px}
.recap-box{background:#16213e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.recap-row{display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid #2a2a4a22}
.recap-row:last-child{border:none;padding-top:8px;border-top:1px solid #2a2a4a}
.recap-row span:first-child{color:#9090b0}
.btn-next{flex:1;padding:12px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}
.btn-prev{padding:12px 16px;background:#1e1e3a;border:1px solid #2a2a4a;color:#9090b0;border-radius:8px;font-size:.85rem;cursor:pointer}
.pz-loading{text-align:center;color:#9090b0;font-size:.85rem;padding:24px}
.pz-error{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:8px;padding:12px;color:#ff6b6b;font-size:.8rem;margin-top:10px;display:none}
.pz-ok{background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b;display:none}
.kr-embedded{background:#fff!important;border-radius:14px!important;padding:16px 14px!important;margin-top:4px!important}
.kr-embedded .kr-payment-button{background:linear-gradient(135deg,${v.primary},#ff6584)!important;border-radius:10px!important;font-weight:800!important;font-size:.9rem!important;padding:13px!important;width:100%!important;border:none!important;color:#fff!important;cursor:pointer!important;margin-top:4px!important}
footer{text-align:center;padding:28px;color:rgba(255,255,255,.4);font-size:.82rem;border-top:1px solid rgba(255,255,255,.1)}
</style></head><body>

<div class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="badge-hp">${v.badge}</div>
    <h1>${v.headline}</h1>
    <p class="sub">${v.subline}</p>
    <a href="#tiers" class="cta-hero">${v.cta || 'Choisir mon abonnement'}</a>
  </div>
</div>

<div class="section" id="tiers">
  <div class="section-title">Choisissez votre formule</div>
  <div class="section-sub">Résiliable à tout moment · Sans engagement minimum</div>

  <!-- Engagements -->
  <div class="eng-tabs" id="eng-tabs"></div>

  <!-- Tiers -->
  <div class="tiers" id="tiers-grid"></div>

  <!-- Avantages communs -->
  <div class="feats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin:28px 0">
    ${v.c.features.map(f=>`<div style="background:rgba(255,255,255,.05);border-radius:10px;padding:18px;text-align:center;border:1px solid rgba(255,255,255,.08)"><div style="font-size:28px;margin-bottom:8px">${f.i}</div><div style="font-size:.82rem;color:rgba(255,255,255,.7)">${f.t}</div></div>`).join('')}
  </div>
</div>

<!-- Parrainage -->
<div class="section">
  <div class="parrainage">
    <div style="font-size:1.5rem;margin-bottom:8px">🤝</div>
    <div style="font-size:.95rem;font-weight:800;margin-bottom:6px">Parrainez un ami — 10% pour vous deux</div>
    <div style="font-size:.82rem;color:rgba(255,255,255,.6)">Pour chaque ami qui s'abonne sur votre recommandation, vous recevez chacun −10% sur votre prochain mois.</div>
  </div>
</div>

<div class="cta-section">
  <div style="font-size:.85rem;color:rgba(255,255,255,.6);margin-bottom:10px" id="order-label">Sélectionnez une formule</div>
  <button class="btn-order" id="btn-order" onclick="openCheckout()" style="opacity:.5;pointer-events:none">⭐ S'abonner maintenant</button>
</div>

<footer>© ${new Date().getFullYear()} High Coffee Shirt — Papeete, Polynésie Française</footer>

<!-- Checkout Modal -->
<div class="ck-overlay" id="ck-overlay" onclick="if(event.target===this)closeCk()">
<div class="ck-box">
  <div class="ck-head">
    <div class="ck-head-title" id="ck-title">⭐ S'abonner</div>
    <button class="ck-close" onclick="closeCk()">✕</button>
  </div>
  <div class="ck-steps">
    <div class="ck-step active" id="cks1"><div class="ck-dot2">1</div><div class="ck-lbl">Formule</div></div>
    <div class="ck-step" id="cks2"><div class="ck-dot2">2</div><div class="ck-lbl">Contact</div></div>
    <div class="ck-step" id="cks3"><div class="ck-dot2">3</div><div class="ck-lbl">Paiement</div></div>
  </div>
  <div class="ck-body" id="ck-body"></div>
  <div class="ck-foot" id="ck-foot"></div>
</div>
</div>

<script>
const WORKER_URL = '${v.workerUrl}';
const WORKER_SECRET = '${v.workerSecret}';
const WORKER_MODE = '${v.workerMode}';
const CAMP_NAME = '${v.headline}';
const ACCENT = '${v.primary}';
const TIERS = ${tiersJson};
const ENGAGEMENTS = ${engagementsJson};

let selectedTier = null;
let selectedEng = 0; // index in ENGAGEMENTS
let ckStep = 1, ckContact = {};

function calcPrice(tier, engIdx) {
  const eng = ENGAGEMENTS[engIdx];
  return Math.round(tier.price * (1 - (eng.discount || 0)));
}

function initPage() {
  // Tabs engagement
  const tabs = document.getElementById('eng-tabs');
  tabs.innerHTML = ENGAGEMENTS.map((e,i) => \`
    <div class="eng-tab \${i===0?'active':''}" id="eng-tab-\${i}" onclick="selectEng(\${i})">
      \${e.label}\${e.discount?\`<span class="eng-discount"> −\${Math.round(e.discount*100)}%</span>\`:''}
    </div>\`).join('');
  renderTiers();
}

function selectEng(i) {
  selectedEng = i;
  document.querySelectorAll('.eng-tab').forEach((t,j)=>t.classList.toggle('active',j===i));
  renderTiers();
}

function renderTiers() {
  const grid = document.getElementById('tiers-grid');
  const eng = ENGAGEMENTS[selectedEng];
  grid.innerHTML = TIERS.map(t => {
    const price = calcPrice(t, selectedEng);
    return \`<div class="tier\${t.popular?' popular':''}\${selectedTier===t.id?' sel':''}" id="tier-\${t.id}" onclick="selectTier('\${t.id}')">
      <div class="tier-check">✓</div>
      <div class="tier-name">\${t.name}</div>
      <div class="tier-price">\${price.toLocaleString('fr-FR')} XPF <small>/ mois</small>\${eng.discount?\`<div style="font-size:.7rem;color:#43e97b;font-weight:700;margin-top:2px">−\${Math.round(eng.discount*100)}% · engagement \${eng.label}</div>\`:''}
      </div>
      <ul class="tier-avantages">\${t.avantages.map(a=>\`<li>\${a}</li>\`).join('')}</ul>
    </div>\`;
  }).join('');
}

function selectTier(id) {
  selectedTier = id;
  renderTiers();
  const tier = TIERS.find(t=>t.id===id);
  const price = calcPrice(tier, selectedEng);
  const eng = ENGAGEMENTS[selectedEng];
  const lbl = tier.name + ' — ' + price.toLocaleString('fr-FR') + ' XPF/mois' + (eng.discount ? ' (−'+Math.round(eng.discount*100)+'%)' : '');
  document.getElementById('order-label').textContent = lbl;
  const btn = document.getElementById('btn-order');
  btn.style.opacity='1'; btn.style.pointerEvents='auto';
}

function openCheckout() {
  if (!selectedTier) return;
  ckStep=1; ckContact={};
  document.getElementById('ck-overlay').classList.add('open');
  document.body.style.overflow='hidden';
  ckRender();
}

function closeCk() {
  document.getElementById('ck-overlay').classList.remove('open');
  document.body.style.overflow='';
}

function ckRender() {
  const titles={1:'📋 Votre abonnement',2:'👤 Coordonnées',3:'💳 Premier paiement'};
  document.getElementById('ck-title').textContent=titles[ckStep];
  for(let i=1;i<=3;i++){const el=document.getElementById('cks'+i);el.className='ck-step'+(i<ckStep?' done':i===ckStep?' active':'');}
  if(ckStep===1) ckRecap1();
  else if(ckStep===2) ckContactForm();
  else ckPayment();
}

function ckRecap1() {
  const tier = TIERS.find(t=>t.id===selectedTier);
  const eng = ENGAGEMENTS[selectedEng];
  const price = calcPrice(tier, selectedEng);
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      <div class="recap-row"><span>Formule</span><span>\${tier.name}</span></div>
      <div class="recap-row"><span>Engagement</span><span>\${eng.label}</span></div>
      \${eng.discount?'<div class="recap-row"><span>Remise</span><span style="color:#43e97b;font-weight:700">−'+Math.round(eng.discount*100)+'%</span></div>':''}
      <div class="recap-row"><span style="font-weight:700">Montant/mois</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${price.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    <div style="font-size:.75rem;color:rgba(255,255,255,.5);line-height:1.7">
      Le 1er mois est débité maintenant. Renouvellement automatique mensuel.<br>
      Résiliation possible à tout moment depuis votre espace membre.
    </div>\`;
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-next" onclick="ckStep=2;ckRender()">Continuer →</button>\`;
}

function ckContactForm() {
  const s=ckContact;
  document.getElementById('ck-body').innerHTML=\`
    <div class="ck-field"><label>Prénom & Nom *</label><input class="ck-input" id="ck-name" value="\${s.name||''}" placeholder="Jean Dupont"></div>
    <div class="ck-field"><label>Email *</label><input class="ck-input" id="ck-email" type="email" value="\${s.email||''}" placeholder="jean@mail.com"></div>
    <div class="ck-field"><label>Téléphone</label><input class="ck-input" id="ck-phone" type="tel" value="\${s.phone||''}" placeholder="87 00 00 00"></div>
    <div class="ck-field"><label>Code parrainage (optionnel)</label><input class="ck-input" id="ck-promo" placeholder="Code ami pour −10%"></div>\`;
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-prev" onclick="ckStep=1;ckRender()">← Retour</button><button class="btn-next" onclick="ckSaveContact()">Paiement →</button>\`;
}

function ckSaveContact() {
  const name=document.getElementById('ck-name')?.value.trim(), email=document.getElementById('ck-email')?.value.trim();
  if(!name){alert('Saisissez votre nom.');return;}
  if(!email||!email.includes('@')){alert('Email invalide.');return;}
  ckContact={name,email,phone:document.getElementById('ck-phone')?.value.trim()||'',promo:document.getElementById('ck-promo')?.value.trim()||''};
  ckStep=3;ckRender();
}

async function ckPayment() {
  const tier = TIERS.find(t=>t.id===selectedTier);
  const eng = ENGAGEMENTS[selectedEng];
  const price = calcPrice(tier, selectedEng);
  const orderId='HCS-ABO-'+Date.now();
  document.getElementById('ck-body').innerHTML=\`
    <div class="recap-box">
      <div class="recap-row"><span>Abonnement</span><span>\${tier.name} · \${eng.label}</span></div>
      <div class="recap-row"><span>Client</span><span>\${ckContact.name}</span></div>
      <div class="recap-row"><span style="font-weight:700">1er mois</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${price.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${location.protocol==='file:'?\`<div style="background:rgba(246,211,101,.12);border:2px solid #f6d365;border-radius:12px;padding:20px;text-align:center"><div style="font-size:1.8rem;margin-bottom:8px">⚠️</div><div style="font-weight:800;color:#f6d365;margin-bottom:8px">Fichier ouvert en local</div><div style="font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.8">Le paiement OSB nécessite une URL https://.<br>Publie cette LP via le bouton <strong>🌐 Publier</strong>.</div></div>\`:\`<div id="pz-loading" class="pz-loading">🔒 Connexion sécurisée à OSB Polynésie…</div>
    <div class="kr-embedded" id="pz-kr-form" style="display:none"></div>
    <div class="pz-error" id="pz-error"></div>
    <div class="pz-ok" id="pz-ok"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Bienvenue chez HCS !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Merci <strong>\${ckContact.name}</strong> !<br>Abonnement <strong>\${tier.name}</strong> activé.<br>Votre carte membre QR vous sera envoyée à \${ckContact.email}.</p></div>\`}\`;
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-prev" id="pz-back" onclick="ckStep=2;ckRender()">← Retour</button>\`;
  if(location.protocol==='file:') return;
  const oldSdk=document.getElementById('pz-sdk');if(oldSdk)oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const res=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount:price,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:ckContact.email})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Erreur serveur');}
    const {formToken,publicKey}=await res.json();
    if(!document.getElementById('pz-css1')){const c1=document.createElement('link');c1.id='pz-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);const c2=document.createElement('link');c2.id='pz-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);}
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK OSB indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pz-loading').style.display='none';
    document.getElementById('pz-kr-form').style.display='block';
    function showSuccess() {
      document.getElementById('pz-kr-form').style.display='none';
      const ok=document.getElementById('pz-ok');if(ok){ok.removeAttribute('style');ok.style.cssText='display:block!important';}
      const bk=document.getElementById('pz-back');if(bk)bk.style.display='none';
      fetch(WORKER_URL.replace('/payzen-token','/order/save'),{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
        body:JSON.stringify({orderId,status:'paid',amount:price,currency:'XPF',campaignName:CAMP_NAME,product:'Abo '+tier.name+' '+eng.label,
          client:{name:ckContact.name,email:ckContact.email,phone:ckContact.phone||''},
          delivery:{type:'none',deliveryDelay:0},
          note:['Tier:'+tier.id,'Engagement:'+eng.mois+'mois',ckContact.promo?'Parrainage:'+ckContact.promo:''].filter(Boolean).join(' | ')})
      }).catch(e=>console.warn('Ordre non sauvegardé:',e));
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){showSuccess();}return false;});
    const krForm=document.querySelector('.kr-embedded');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList.contains('kr-payment-success')){done=true;showSuccess();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e) {
    document.getElementById('pz-loading').style.display='none';
    const err=document.getElementById('pz-error');err.style.display='block';err.textContent='❌ '+e.message;
  }
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCk();});
initPage();
<\/script>
</body></html>`;

  _downloadHtml(html, `hcs-abonnements-${_slug(v.headline)}.html`);
}

// ── V7 Export ──
function exportLP_Service(id) {
  const v = _getCommonExportVars(id);
  const heroBg = _getHeroBg(v);
  const v2 = v.c._v2 || {};
  const services = v2.services || [];
  const servicesJson = JSON.stringify(services);

  const html = `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${v.headline} — HCS Tahiti</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f1a;color:#e8e8f0}
.hero{min-height:70vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px 20px;background:${heroBg};background-size:cover;background-position:center;position:relative;overflow:hidden}
.hero-overlay{position:absolute;inset:0;background:${v.c.colors.overlay}}
.hero-content{max-width:640px;position:relative;z-index:2}
h1{font-size:clamp(1.8rem,5vw,3rem);font-weight:900;margin-bottom:14px;line-height:1.1;color:white}
.sub{font-size:1rem;opacity:.9;margin-bottom:20px;color:rgba(255,255,255,.85)}
.badge-hp{display:inline-block;background:${v.badge2};color:white;padding:8px 24px;border-radius:24px;font-weight:700;margin-bottom:20px}
.freemium-banner{background:linear-gradient(135deg,rgba(67,233,123,.15),rgba(79,172,254,.15));border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:14px 20px;display:inline-flex;align-items:center;gap:10px;margin-top:16px;font-size:.85rem;font-weight:700}
.section{padding:40px 20px;max-width:960px;margin:0 auto}
.section-title{font-size:1.2rem;font-weight:800;margin-bottom:8px;text-align:center}
.section-sub{font-size:.85rem;color:rgba(255,255,255,.6);text-align:center;margin-bottom:28px}
/* Catégories */
.cat-tabs{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}
.cat-tab{padding:8px 18px;border-radius:20px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.04);font-size:.78rem;font-weight:700;cursor:pointer;transition:all .2s;color:rgba(255,255,255,.7)}
.cat-tab:hover,.cat-tab.active{border-color:${v.primary};background:${v.primary}22;color:white}
/* Services grid */
.services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:20px}
.svc{background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);border-radius:14px;padding:18px;cursor:pointer;transition:all .2s;position:relative}
.svc:hover{border-color:${v.primary};transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.svc.sel{border-color:${v.primary};background:rgba(${_hexToRgb(v.primary)},.08);box-shadow:0 0 0 3px ${v.primary}33}
.svc-check{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;background:${v.primary};color:white;display:none;align-items:center;justify-content:center;font-size:.6rem;font-weight:900}
.svc.sel .svc-check{display:flex}
.svc-name{font-size:.85rem;font-weight:700;margin-bottom:6px}
.svc-price{font-size:1.1rem;font-weight:900;color:${v.primary}}
/* Panier */
.cart-bar{position:sticky;bottom:0;background:#1a1a2e;border-top:2px solid ${v.primary};padding:14px 20px;display:none;align-items:center;justify-content:space-between;gap:14px;z-index:100}
.cart-bar.show{display:flex}
.cart-info{font-size:.85rem;font-weight:700}
.cart-total{font-size:1.1rem;font-weight:900;color:${v.primary}}
.btn-cart{padding:12px 28px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:10px;font-size:.85rem;font-weight:800;cursor:pointer}
/* Upload brief */
.upload-zone{border:2px dashed rgba(255,255,255,.15);border-radius:14px;padding:28px;text-align:center;cursor:pointer;transition:all .2s;margin:20px 0}
.upload-zone:hover,.upload-zone.has-file{border-color:${v.primary};background:${v.primary}08}
.upload-preview{max-width:200px;max-height:120px;border-radius:8px;margin:10px auto;display:block}
/* Checkout */
.ck-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:950;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.ck-overlay.open{display:flex}
@media(min-width:600px){.ck-overlay.open{align-items:center}}
.ck-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.ck-box{border-radius:20px}}
.ck-head{padding:16px 20px;border-bottom:1px solid #2a2a4a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.ck-head-title{font-size:.95rem;font-weight:800}
.ck-close{background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer}
.ck-steps{display:flex;padding:12px 20px;border-bottom:1px solid #2a2a4a;flex-shrink:0}
.ck-step{flex:1;text-align:center;position:relative}
.ck-step::after{content:'';position:absolute;top:13px;left:50%;width:100%;height:2px;background:#2a2a4a;z-index:0}
.ck-step:last-child::after{display:none}
.ck-dot2{width:26px;height:26px;border-radius:50%;border:2px solid #2a2a4a;background:#1e1e3a;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;margin:0 auto 4px;position:relative;z-index:1;color:#9090b0;transition:all .2s}
.ck-step.done .ck-dot2{background:#43e97b;border-color:#43e97b;color:#0f0f1a}
.ck-step.done::after{background:#43e97b}
.ck-step.active .ck-dot2{background:${v.primary};border-color:${v.primary};color:white}
.ck-lbl{font-size:.58rem;color:#9090b0;font-weight:600}
.ck-step.active .ck-lbl{color:${v.primary}}
.ck-step.done .ck-lbl{color:#43e97b}
.ck-body{flex:1;overflow-y:auto;padding:20px}
.ck-foot{padding:14px 20px;border-top:1px solid #2a2a4a;display:flex;gap:8px;flex-shrink:0}
.ck-field{margin-bottom:12px}
.ck-field label{display:block;font-size:.7rem;color:#9090b0;margin-bottom:4px}
.ck-input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #2a2a4a;background:#1e1e3a;color:#e8e8f0;font-size:.85rem;outline:none;font-family:inherit;transition:border-color .2s}
.ck-input:focus{border-color:${v.primary}}
.ck-textarea{resize:vertical;min-height:60px}
.recap-box{background:#16213e;border:1px solid #2a2a4a;border-radius:10px;padding:14px 16px;margin-bottom:16px}
.recap-row{display:flex;justify-content:space-between;font-size:.78rem;padding:4px 0;border-bottom:1px solid #2a2a4a22}
.recap-row:last-child{border:none;padding-top:8px;border-top:1px solid #2a2a4a}
.recap-row span:first-child{color:#9090b0}
.btn-next{flex:1;padding:12px;background:linear-gradient(135deg,${v.primary},#ff6584);color:white;border:none;border-radius:8px;font-size:.85rem;font-weight:700;cursor:pointer}
.btn-prev{padding:12px 16px;background:#1e1e3a;border:1px solid #2a2a4a;color:#9090b0;border-radius:8px;font-size:.85rem;cursor:pointer}
.pz-loading{text-align:center;color:#9090b0;font-size:.85rem;padding:24px}
.pz-error{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.3);border-radius:8px;padding:12px;color:#ff6b6b;font-size:.8rem;margin-top:10px;display:none}
.pz-ok{background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b;display:none}
.kr-embedded{background:#fff!important;border-radius:14px!important;padding:16px 14px!important;margin-top:4px!important}
.kr-embedded .kr-payment-button{background:linear-gradient(135deg,${v.primary},#ff6584)!important;border-radius:10px!important;font-weight:800!important;font-size:.9rem!important;padding:13px!important;width:100%!important;border:none!important;color:#fff!important;cursor:pointer!important;margin-top:4px!important}
footer{text-align:center;padding:28px;color:rgba(255,255,255,.4);font-size:.82rem;border-top:1px solid rgba(255,255,255,.1)}
</style></head><body>

<div class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <div class="badge-hp">${v.badge}</div>
    <h1>${v.headline}</h1>
    <p class="sub">${v.subline}</p>
    <a href="#services" class="freemium-banner" style="text-decoration:none;color:white">
      🎁 1er détourage offert — aucun engagement
    </a>
  </div>
</div>

<div class="section" id="services">
  <div class="section-title">Nos services numériques</div>
  <div class="section-sub">Sélectionnez un ou plusieurs services · Paiement sécurisé en ligne</div>

  <div class="cat-tabs" id="cat-tabs">
    <div class="cat-tab active" onclick="filterCat(null,this)">Tous</div>
    <div class="cat-tab" onclick="filterCat('detourage',this)">✂️ Détourage</div>
    <div class="cat-tab" onclick="filterCat('creation',this)">🎨 Création</div>
    <div class="cat-tab" onclick="filterCat('apps',this)">📱 Accès Apps</div>
  </div>

  <div class="services-grid" id="svc-grid"></div>

  <div style="background:rgba(67,233,123,.06);border:1px solid rgba(67,233,123,.2);border-radius:12px;padding:16px;text-align:center;margin:16px 0">
    <div style="font-size:.85rem;font-weight:700;margin-bottom:4px">🎁 Offre de bienvenue</div>
    <div style="font-size:.78rem;color:rgba(255,255,255,.6);line-height:1.6">1er détourage IA offert pour tout nouveau client · PNG ou JPG jusqu'à 10 Mo</div>
    <button onclick="openFreemium()" style="margin-top:10px;padding:8px 20px;border-radius:8px;border:1px solid rgba(67,233,123,.4);background:rgba(67,233,123,.1);color:#43e97b;font-size:.78rem;font-weight:700;cursor:pointer">Obtenir mon détourage gratuit →</button>
  </div>

  <div class="feats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin:28px 0">
    ${v.c.features.map(f=>`<div style="background:rgba(255,255,255,.05);border-radius:10px;padding:18px;text-align:center;border:1px solid rgba(255,255,255,.08)"><div style="font-size:28px;margin-bottom:8px">${f.i}</div><div style="font-size:.82rem;color:rgba(255,255,255,.7)">${f.t}</div></div>`).join('')}
  </div>
</div>

<!-- Brief upload section -->
<div class="section">
  <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:24px">
    <div style="font-size:.95rem;font-weight:800;margin-bottom:8px">📎 Joindre vos fichiers (optionnel)</div>
    <div style="font-size:.8rem;color:rgba(255,255,255,.5);margin-bottom:14px">Joignez dès maintenant vos logos ou images à traiter. Formats : PNG, JPG, SVG, AI (max 20 Mo)</div>
    <div class="upload-zone" id="upload-zone" onclick="document.getElementById('brief-file').click()">
      <div style="font-size:32px;margin-bottom:8px">📁</div>
      <div style="font-size:.82rem;font-weight:700" id="upload-label">Cliquer pour joindre un fichier</div>
      <div style="font-size:.7rem;color:rgba(255,255,255,.4);margin-top:4px">ou glissez-déposez ici</div>
      <img id="brief-preview" class="upload-preview" style="display:none">
    </div>
    <input type="file" id="brief-file" accept="image/*,.svg,.ai,.pdf" style="display:none" onchange="previewFile(event)">
    <textarea id="brief-text" class="ck-input ck-textarea" placeholder="Décrivez votre demande... (ex: logo vectoriel pour t-shirt DTF, fond blanc à supprimer)" style="margin-top:10px;display:block;min-height:80px"></textarea>
  </div>
</div>

<footer>© ${new Date().getFullYear()} High Coffee Shirt — Papeete, Polynésie Française</footer>

<!-- Panier sticky -->
<div class="cart-bar" id="cart-bar">
  <div>
    <div class="cart-info" id="cart-info">0 service sélectionné</div>
    <div class="cart-total" id="cart-total">0 XPF</div>
  </div>
  <button class="btn-cart" onclick="openCheckout()">🛒 Commander</button>
</div>

<!-- Checkout Modal -->
<div class="ck-overlay" id="ck-overlay" onclick="if(event.target===this)closeCk()">
<div class="ck-box">
  <div class="ck-head">
    <div class="ck-head-title" id="ck-title">🛒 Commander</div>
    <button class="ck-close" onclick="closeCk()">✕</button>
  </div>
  <div class="ck-steps">
    <div class="ck-step active" id="cks1"><div class="ck-dot2">1</div><div class="ck-lbl">Récap</div></div>
    <div class="ck-step" id="cks2"><div class="ck-dot2">2</div><div class="ck-lbl">Contact</div></div>
    <div class="ck-step" id="cks3"><div class="ck-dot2">3</div><div class="ck-lbl">Paiement</div></div>
  </div>
  <div class="ck-body" id="ck-body"></div>
  <div class="ck-foot" id="ck-foot"></div>
</div>
</div>

<script>
const WORKER_URL = '${v.workerUrl}';
const WORKER_SECRET = '${v.workerSecret}';
const WORKER_MODE = '${v.workerMode}';
const CAMP_NAME = '${v.headline}';
const ACCENT = '${v.primary}';
const SERVICES = ${servicesJson};

let cart = {}; // id → service
let activeCat = null;
let ckStep = 1, ckContact = {};
let briefFileData = null;

const CATS = {
  detourage: s => s.id.startsWith('detourage') || s.id === 'vecto',
  creation:  s => ['logo','pack','vecto'].includes(s.id),
  apps:      s => s.id.startsWith('apps')
};

function filterCat(cat, tab) {
  activeCat = cat;
  document.querySelectorAll('.cat-tab').forEach(t=>t.classList.remove('active'));
  tab.classList.add('active');
  renderServices();
}

function renderServices() {
  const filtered = activeCat ? SERVICES.filter(CATS[activeCat]) : SERVICES;
  document.getElementById('svc-grid').innerHTML = filtered.map(s => \`
    <div class="svc\${cart[s.id]?' sel':''}" id="svc-\${s.id}" onclick="toggleSvc('\${s.id}')">
      <div class="svc-check">✓</div>
      <div class="svc-name">\${s.name}</div>
      <div class="svc-price">\${s.price.toLocaleString('fr-FR')} XPF</div>
    </div>\`).join('');
}

function toggleSvc(id) {
  const svc = SERVICES.find(s=>s.id===id);
  if (!svc) return;
  if (cart[id]) delete cart[id];
  else cart[id] = svc;
  renderServices();
  updateCart();
}

function updateCart() {
  const items = Object.values(cart);
  const total = items.reduce((s,i)=>s+i.price,0);
  const bar = document.getElementById('cart-bar');
  document.getElementById('cart-info').textContent = items.length + ' service' + (items.length>1?'s':'') + ' sélectionné' + (items.length>1?'s':'');
  document.getElementById('cart-total').textContent = total.toLocaleString('fr-FR') + ' XPF';
  bar.classList.toggle('show', items.length > 0);
}

function openFreemium() {
  alert('✓ 1er détourage offert !\\n\\nJoignez votre image dans la zone ci-dessous et passez commande.\\nLe détourage sera appliqué gratuitement sur votre première image.');
}

function previewFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    briefFileData = ev.target.result;
    const zone = document.getElementById('upload-zone');
    zone.classList.add('has-file');
    document.getElementById('upload-label').textContent = '✓ ' + file.name;
    if (file.type.startsWith('image/')) {
      const img = document.getElementById('brief-preview');
      img.src = briefFileData; img.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

document.getElementById('upload-zone').addEventListener('dragover', e => { e.preventDefault(); e.currentTarget.classList.add('has-file'); });
document.getElementById('upload-zone').addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f){ const inp = document.getElementById('brief-file'); const dt = new DataTransfer(); dt.items.add(f); inp.files = dt.files; previewFile({target:inp}); } });

function openCheckout() {
  if (!Object.keys(cart).length) return;
  ckStep=1; ckContact={};
  document.getElementById('ck-overlay').classList.add('open');
  document.body.style.overflow='hidden';
  ckRender();
}

function closeCk() {
  document.getElementById('ck-overlay').classList.remove('open');
  document.body.style.overflow='';
}

function ckRender() {
  const titles={1:'🛒 Votre commande',2:'👤 Coordonnées',3:'💳 Paiement sécurisé'};
  document.getElementById('ck-title').textContent=titles[ckStep];
  for(let i=1;i<=3;i++){const el=document.getElementById('cks'+i);el.className='ck-step'+(i<ckStep?' done':i===ckStep?' active':'');}
  if(ckStep===1) ckRecap1();
  else if(ckStep===2) ckContactForm();
  else ckPayment();
}

function ckRecap1() {
  const items = Object.values(cart);
  const total = items.reduce((s,i)=>s+i.price,0);
  const hasBrief = !!briefFileData;
  document.getElementById('ck-body').innerHTML = \`
    <div class="recap-box">
      \${items.map(i=>'<div class="recap-row"><span>'+i.name+'</span><span>'+i.price.toLocaleString('fr-FR')+' XPF</span></div>').join('')}
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${total.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${hasBrief?'<div style="background:rgba(79,172,254,.08);border:1px solid rgba(79,172,254,.2);border-radius:8px;padding:10px;font-size:.75rem;color:rgba(255,255,255,.7)">📎 Fichier joint inclus dans la commande</div>':''}
    <div style="font-size:.75rem;color:rgba(255,255,255,.5);margin-top:10px;line-height:1.6">
      Délai : 24–48h ouvrés · Livraison par email
    </div>\`;
  const _svcNames=items.map(i=>i.name).join(', ');
  const _pwBtn=HCSPass.canPay(total)?\`<button class="btn-pass" style="margin-top:8px;width:100%" onclick="pwPayCheckout(\${total},'\${_svcNames.replace(/'/g,'').substring(0,40)}','HCS-SVC-'+Date.now(),{type:'email',deliveryDelay:1},'Services:\${_svcNames.replace(/'/g,'').substring(0,60)}')">🎫 Payer avec Pass · \${HCSPass.getBalance().toLocaleString('fr-FR')} XPF</button>\`:'';
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-next" onclick="ckStep=2;ckRender()">Continuer →</button>\`+_pwBtn;
}

function ckContactForm() {
  const s=ckContact;
  document.getElementById('ck-body').innerHTML=\`
    <div class="ck-field"><label>Prénom & Nom *</label><input class="ck-input" id="ck-name" value="\${s.name||''}" placeholder="Jean Dupont"></div>
    <div class="ck-field"><label>Email * (livraison des fichiers)</label><input class="ck-input" id="ck-email" type="email" value="\${s.email||''}" placeholder="jean@mail.com"></div>
    <div class="ck-field"><label>Téléphone</label><input class="ck-input" id="ck-phone" type="tel" value="\${s.phone||''}" placeholder="87 00 00 00"></div>
    <div class="ck-field"><label>Brief / instructions supplémentaires</label><textarea class="ck-input ck-textarea" id="ck-note" placeholder="Couleurs souhaitées, fond à supprimer, format de livraison...">\${s.note||''}</textarea></div>\`;
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-prev" onclick="ckStep=1;ckRender()">← Retour</button><button class="btn-next" onclick="ckSaveContact()">Paiement →</button>\`;
}

function ckSaveContact() {
  const name=document.getElementById('ck-name')?.value.trim(), email=document.getElementById('ck-email')?.value.trim();
  if(!name){alert('Saisissez votre nom.');return;}
  if(!email||!email.includes('@')){alert('Email invalide.');return;}
  ckContact={name,email,phone:document.getElementById('ck-phone')?.value.trim()||'',note:document.getElementById('ck-note')?.value.trim()||''};
  ckStep=3;ckRender();
}

async function ckPayment() {
  const items=Object.values(cart);
  const total=items.reduce((s,i)=>s+i.price,0);
  const orderId='HCS-SVC-'+Date.now();
  const productList=items.map(i=>i.name).join(', ');
  document.getElementById('ck-body').innerHTML=\`
    <div class="recap-box">
      \${items.map(i=>'<div class="recap-row"><span>'+i.name+'</span><span>'+i.price.toLocaleString('fr-FR')+' XPF</span></div>').join('')}
      <div class="recap-row"><span>Client</span><span>\${ckContact.name}</span></div>
      <div class="recap-row"><span style="font-weight:700">Total</span><span style="font-weight:900;color:\${ACCENT};font-size:1.1rem">\${total.toLocaleString('fr-FR')} XPF</span></div>
    </div>
    \${location.protocol==='file:'?\`<div style="background:rgba(246,211,101,.12);border:2px solid #f6d365;border-radius:12px;padding:20px;text-align:center"><div style="font-size:1.8rem;margin-bottom:8px">⚠️</div><div style="font-weight:800;color:#f6d365;margin-bottom:8px">Fichier ouvert en local</div><div style="font-size:.8rem;color:rgba(255,255,255,.8);line-height:1.8">Le paiement OSB nécessite une URL https://.<br>Publie cette LP via le bouton <strong>🌐 Publier</strong>.</div></div>\`:\`<div id="pz-loading" class="pz-loading">🔒 Connexion sécurisée à OSB Polynésie…</div>
    <div class="kr-embedded" id="pz-kr-form" style="display:none"></div>
    <div class="pz-error" id="pz-error"></div>
    <div class="pz-ok" id="pz-ok"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Commande confirmée !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Merci <strong>\${ckContact.name}</strong> !<br>Livraison sous 24–48h à <strong>\${ckContact.email}</strong>.<br>Référence : <strong>\${orderId}</strong></p></div>\`}\`;
  document.getElementById('ck-foot').innerHTML=\`<button class="btn-prev" id="pz-back" onclick="ckStep=2;ckRender()">← Retour</button>\`;
  if(location.protocol==='file:') return;
  const oldSdk=document.getElementById('pz-sdk');if(oldSdk)oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const res=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount:total,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:ckContact.email})});
    if(!res.ok){const e=await res.json();throw new Error(e.error||'Erreur serveur');}
    const {formToken,publicKey}=await res.json();
    if(!document.getElementById('pz-css1')){const c1=document.createElement('link');c1.id='pz-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);const c2=document.createElement('link');c2.id='pz-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);}
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK OSB indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pz-loading').style.display='none';
    document.getElementById('pz-kr-form').style.display='block';
    function showSuccess() {
      document.getElementById('pz-kr-form').style.display='none';
      const ok=document.getElementById('pz-ok');if(ok){ok.removeAttribute('style');ok.style.cssText='display:block!important';}
      const bk=document.getElementById('pz-back');if(bk)bk.style.display='none';
      const briefNote=document.getElementById('brief-text')?.value||'';
      fetch(WORKER_URL.replace('/payzen-token','/order/save'),{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
        body:JSON.stringify({orderId,status:'paid',amount:total,currency:'XPF',campaignName:CAMP_NAME,product:productList,
          client:{name:ckContact.name,email:ckContact.email,phone:ckContact.phone||''},
          delivery:{type:'email',deliveryDelay:1},
          note:[ckContact.note,briefNote,'Services:'+productList,'Fichier:'+(briefFileData?'oui':'non')].filter(Boolean).join(' | ')})
      }).catch(e=>console.warn('Ordre non sauvegardé:',e));
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){showSuccess();}return false;});
    const krForm=document.querySelector('.kr-embedded');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList.contains('kr-payment-success')){done=true;showSuccess();}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e) {
    document.getElementById('pz-loading').style.display='none';
    const err=document.getElementById('pz-error');err.style.display='block';err.textContent='❌ '+e.message;
  }
}

document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCk();});
renderServices();
_pwRefreshWidget();
<\/script>
${_passBlock(v)}
</body></html>`;

  _downloadHtml(html, `hcs-services-ia-${_slug(v.headline)}.html`);
}

/* ═══════════════════════════════════════════════════════════
   7. PASS HCS — Bloc inlinable dans les LP exportées
   ═══════════════════════════════════════════════════════════ */

function _passBlock(v) {
  const css = `
.pw-widget{position:fixed;bottom:80px;right:16px;z-index:800;background:#1a1a2e;border:2px solid ${v.primary};border-radius:16px;padding:10px 14px;cursor:pointer;transition:all .2s;box-shadow:0 4px 20px rgba(0,0,0,.5);min-width:140px}
.pw-widget:hover{transform:translateY(-2px)}
.pw-label{font-size:.6rem;color:#9090b0;font-weight:700;letter-spacing:.5px}
.pw-balance{font-size:1rem;font-weight:900;color:${v.primary}}
.pw-reload-btn{font-size:.6rem;color:rgba(255,255,255,.4);margin-top:2px;text-align:center}
.pw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:960;display:none;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)}
.pw-overlay.open{display:flex}
@media(min-width:600px){.pw-overlay.open{align-items:center}}
.pw-box{background:#1a1a2e;border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:24px;box-shadow:0 -8px 48px rgba(0,0,0,.6)}
@media(min-width:600px){.pw-box{border-radius:20px}}
.pw-box h3{font-size:1rem;font-weight:800;margin-bottom:4px}
.pw-amounts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:16px 0}
.pw-amt{padding:14px;border-radius:10px;border:2px solid #2a2a4a;background:#1e1e3a;cursor:pointer;text-align:center;transition:all .2s}
.pw-amt:hover,.pw-amt.sel{border-color:${v.primary};background:${v.primary}18}
.pw-amt-xpf{font-size:1rem;font-weight:900;color:${v.primary}}
.pw-amt-bonus{font-size:.65rem;color:#43e97b;font-weight:700;margin-top:2px}
.pw-close{float:right;background:none;border:none;color:#9090b0;font-size:1.1rem;cursor:pointer}
.btn-pass{flex:1;padding:12px;background:linear-gradient(135deg,#f6d365,#fda085);color:#1a1a2e;border:none;border-radius:8px;font-size:.85rem;font-weight:800;cursor:pointer}`;
  return `
<style>${css}</style>
${_passHtml()}
<script>${_passJs(v)}<\/script>`;
}

function _passHtml() {
  return `
<!-- Pass HCS Widget -->
<div class="pw-widget" onclick="openPassModal()" id="pw-widget" style="display:none">
  <div class="pw-label">🎫 MON PASS HCS</div>
  <div class="pw-balance" id="pw-bal">0 XPF</div>
  <div class="pw-reload-btn">Recharger →</div>
</div>

<!-- Pass Recharge Modal -->
<div class="pw-overlay" id="pw-overlay" onclick="if(event.target===this)closePw()">
<div class="pw-box">
  <button class="pw-close" onclick="closePw()">✕</button>
  <h3>🎫 Pass HCS</h3>
  <div style="font-size:.8rem;color:rgba(255,255,255,.6);margin-bottom:4px">Solde actuel : <strong id="pw-modal-bal" style="color:#fda085">0 XPF</strong></div>
  <div style="font-size:.72rem;color:rgba(255,255,255,.5)">+5% de crédit offert à chaque rechargement</div>
  <div id="pw-history-section" style="margin:12px 0;max-height:100px;overflow-y:auto"></div>
  <div style="font-size:.82rem;font-weight:700;margin-bottom:8px">Recharger mon Pass</div>
  <div class="pw-amounts" id="pw-amounts">
    <div class="pw-amt" onclick="selectPwAmt(5000)"><div class="pw-amt-xpf">5 000 XPF</div><div class="pw-amt-bonus">+250 XPF bonus</div></div>
    <div class="pw-amt" onclick="selectPwAmt(10000)"><div class="pw-amt-xpf">10 000 XPF</div><div class="pw-amt-bonus">+500 XPF bonus</div></div>
    <div class="pw-amt" onclick="selectPwAmt(20000)"><div class="pw-amt-xpf">20 000 XPF</div><div class="pw-amt-bonus">+1 000 XPF bonus</div></div>
    <div class="pw-amt" onclick="selectPwAmt(50000)"><div class="pw-amt-xpf">50 000 XPF</div><div class="pw-amt-bonus">+2 500 XPF bonus</div></div>
  </div>
  <div id="pw-payzen-area" style="display:none">
    <div id="pw-pz-loading" style="text-align:center;color:#9090b0;font-size:.85rem;padding:16px">🔒 Connexion OSB…</div>
    <div class="kr-embedded" id="pw-kr-form" style="display:none"></div>
    <div id="pw-ok" style="display:none;background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:20px;text-align:center;color:#43e97b">
      <div style="font-size:1.5rem;margin-bottom:8px">✅</div>
      <div style="font-weight:800;margin-bottom:4px" id="pw-ok-msg">Pass rechargé !</div>
      <div style="font-size:.78rem;color:#9090b0" id="pw-ok-detail"></div>
    </div>
  </div>
  <div id="pw-suggestion" style="display:none;background:rgba(253,160,133,.08);border:1px solid rgba(253,160,133,.25);border-radius:8px;padding:10px;font-size:.72rem;color:rgba(255,255,255,.7);margin-top:10px;line-height:1.6"></div>
</div>
</div>`;
}

function _passJs(v) {
  return `
/* ── HCS Pass JS ── */
const HCS_PASS_KEY = 'hcs_pass';
const HCS_PASS_BONUS = 0.05;
function _pwLoad(){try{return JSON.parse(localStorage.getItem(HCS_PASS_KEY))||{balance:0,history:[],totalReloaded:0};}catch{return{balance:0,history:[],totalReloaded:0};}}
function _pwSave(d){localStorage.setItem(HCS_PASS_KEY,JSON.stringify(d));}
const HCSPass={
  getBalance(){return _pwLoad().balance;},
  getHistory(){return _pwLoad().history||[];},
  canPay(n){return _pwLoad().balance>=n;},
  credit(amount,label){
    const d=_pwLoad(),bonus=Math.round(amount*HCS_PASS_BONUS),total=amount+bonus;
    d.balance+=total;d.totalReloaded=(d.totalReloaded||0)+amount;
    d.history.unshift({date:new Date().toISOString(),label:label+(bonus?' (+'+bonus.toLocaleString('fr-FR')+' XPF bonus)':''),amount:total,type:'credit',balance:d.balance});
    _pwSave(d);return{credited:total,bonus};
  },
  debit(amount,label){
    const d=_pwLoad();if(d.balance<amount)return false;
    d.balance-=amount;d.history.unshift({date:new Date().toISOString(),label,amount,type:'debit',balance:d.balance});
    _pwSave(d);return true;
  },
  getSuggestion(){
    const d=_pwLoad();const total=d.totalReloaded||0;
    if(total>=10000)return'Vous utilisez régulièrement le Pass HCS — nos abonnements dès 1 800 XPF/mois pourraient vous convenir.';
    return null;
  }
};

let pwSelectedAmt = 0;

function _pwRefreshWidget(){
  const bal=HCSPass.getBalance();
  const w=document.getElementById('pw-widget');
  if(w){w.style.display='block';document.getElementById('pw-bal').textContent=bal.toLocaleString('fr-FR')+' XPF';}
}

function openPassModal(){
  document.getElementById('pw-overlay').classList.add('open');
  document.body.style.overflow='hidden';
  const bal=HCSPass.getBalance();
  document.getElementById('pw-modal-bal').textContent=bal.toLocaleString('fr-FR')+' XPF';
  // Historique
  const hist=HCSPass.getHistory().slice(0,5);
  const histEl=document.getElementById('pw-history-section');
  if(hist.length){
    histEl.innerHTML='<div style="font-size:.68rem;font-weight:700;color:#9090b0;margin-bottom:6px">Historique</div>'+
      hist.map(h=>\`<div style="display:flex;justify-content:space-between;font-size:.65rem;padding:3px 0;border-bottom:1px solid #2a2a4a22"><span style="color:#9090b0">\${h.label}</span><span style="color:\${h.type==='credit'?'#43e97b':'#ff6b6b'};font-weight:700">\${h.type==='credit'?'+':'-'}\${h.amount.toLocaleString('fr-FR')} XPF</span></div>\`).join('');
  }
  // Suggestion V6
  const sug=HCSPass.getSuggestion();
  const sugEl=document.getElementById('pw-suggestion');
  if(sug){sugEl.style.display='block';sugEl.textContent='💡 '+sug;}
  document.getElementById('pw-payzen-area').style.display='none';
  pwSelectedAmt=0;
  document.querySelectorAll('.pw-amt').forEach(a=>a.classList.remove('sel'));
}

function closePw(){
  document.getElementById('pw-overlay').classList.remove('open');
  document.body.style.overflow='';
}

function selectPwAmt(amount){
  pwSelectedAmt=amount;
  document.querySelectorAll('.pw-amt').forEach(a=>a.classList.remove('sel'));
  event.currentTarget.classList.add('sel');
  document.getElementById('pw-payzen-area').style.display='block';
  document.getElementById('pw-pz-loading').style.display='block';
  document.getElementById('pw-kr-form').style.display='none';
  document.getElementById('pw-ok').style.display='none';
  _pwInitPayzen(amount);
}

async function _pwInitPayzen(amount){
  const oldSdk=document.getElementById('pw-pz-sdk');if(oldSdk)oldSdk.remove();
  if(window.KR){try{KR.removeForms();}catch(_){}}
  try {
    const orderId='HCS-PASS-'+Date.now();
    const res=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},body:JSON.stringify({amount,currency:'XPF',orderId,mode:WORKER_MODE,customerEmail:'pass@hcs.pf'})});
    if(!res.ok)throw new Error('Worker '+res.status);
    const {formToken,publicKey}=await res.json();
    if(!document.getElementById('pw-css1')){const c1=document.createElement('link');c1.id='pw-css1';c1.rel='stylesheet';c1.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic-reset.min.css';document.head.appendChild(c1);const c2=document.createElement('link');c2.id='pw-css2';c2.rel='stylesheet';c2.href='https://static.osb.pf/static/js/krypton-client/V4.0/stable/classic.min.css';document.head.appendChild(c2);}
    await new Promise((resolve,reject)=>{
      if(window.KR){KR.setFormConfig({'kr-public-key':publicKey,'kr-language':'fr-FR'}).then(()=>KR.setFormToken(formToken)).then(resolve).catch(reject);}
      else{const s=document.createElement('script');s.id='pw-pz-sdk';s.src='https://static.osb.pf/static/js/krypton-client/V4.0/stable/kr-payment-form.min.js';s.setAttribute('kr-public-key',publicKey);s.setAttribute('kr-language','fr-FR');s.onload=()=>KR.setFormToken(formToken).then(resolve);s.onerror=()=>reject(new Error('SDK indisponible'));document.head.appendChild(s);}
    });
    document.getElementById('pw-pz-loading').style.display='none';
    document.getElementById('pw-kr-form').style.display='block';
    function pwSuccess(){
      document.getElementById('pw-kr-form').style.display='none';
      const {credited,bonus}=HCSPass.credit(pwSelectedAmt,'Rechargement Pass');
      const ok=document.getElementById('pw-ok');ok.removeAttribute('style');ok.style.cssText='display:block!important';
      document.getElementById('pw-ok-msg').textContent='✅ Pass rechargé — '+credited.toLocaleString('fr-FR')+' XPF crédités';
      document.getElementById('pw-ok-detail').textContent=bonus?'Dont '+bonus.toLocaleString('fr-FR')+' XPF bonus offerts':'';
      _pwRefreshWidget();
      // Rafraîchir le bouton Pass dans le checkout si ouvert
      if(document.getElementById('ck-overlay')?.classList.contains('open'))ckRender();
    }
    KR.onSubmit(d=>{if(['PAID','RUNNING','AUTHORISED'].includes(d?.clientAnswer?.orderStatus)){pwSuccess();}return false;});
    const krForm=document.querySelector('#pw-kr-form .kr-embedded,#pw-kr-form');
    if(krForm){let done=false;new MutationObserver(()=>{if(done)return;if(document.querySelector('.kr-payment-success')||krForm.classList?.contains('kr-payment-success')){done=true;pwSuccess();}}).observe(document.getElementById('pw-payzen-area'),{subtree:true,childList:true,attributes:true,attributeFilter:['class']});}
  } catch(e){
    document.getElementById('pw-pz-loading').textContent='❌ '+e.message;
  }
}

/* Payer une commande avec le Pass */
function pwPayCheckout(total, productName, orderId, deliveryObj, noteStr){
  if(!HCSPass.debit(total, productName)){alert('Solde Pass insuffisant.');return;}
  // Sauvegarder la commande
  fetch(WORKER_URL.replace('/payzen-token','/order/save'),{method:'POST',headers:{'Content-Type':'application/json','X-Worker-Secret':WORKER_SECRET},
    body:JSON.stringify({orderId,status:'paid',amount:total,currency:'XPF',campaignName:CAMP_NAME,product:productName,
      client:ckContact,delivery:deliveryObj||{type:'pickup',deliveryDelay:0},note:(noteStr||'')+' | Paiement:PassHCS'})
  }).catch(e=>console.warn('Ordre non sauvegardé:',e));
  // Afficher succès dans le checkout
  document.getElementById('ck-body').innerHTML=\`<div style="background:rgba(67,233,123,.12);border:1px solid rgba(67,233,123,.3);border-radius:12px;padding:28px;text-align:center;color:#43e97b"><h3 style="font-size:1.2rem;margin-bottom:8px">✅ Paiement Pass accepté !</h3><p style="font-size:.82rem;color:#9090b0;line-height:1.6">Commande <strong>\${orderId}</strong> confirmée.<br>Solde Pass restant : <strong style="color:#fda085">\${HCSPass.getBalance().toLocaleString('fr-FR')} XPF</strong></p></div>\`;
  document.getElementById('ck-foot').innerHTML='';
  _pwRefreshWidget();
}

_pwRefreshWidget();
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePw();});
/* ── FIN HCS Pass JS ── */`;
}

/* ═══════════════════════════════════════════════════════════
   8. UTILS
   ═══════════════════════════════════════════════════════════ */
function _fmt(n) { return Math.round(n).toLocaleString('fr-FR'); }
function _slug(s) { return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,30); }
function _hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}
function _downloadHtml(html, filename) {
  const blob = new Blob([html], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ═══════════════════════════════════════════════════════════
   8. RE-RENDER SIDEBAR
   ═══════════════════════════════════════════════════════════ */
if (typeof buildSidebar === 'function') {
  setTimeout(buildSidebar, 200);
}

/* ═══════════════════════════════════════════════════════════
   9. CONSOLE LOG
   ═══════════════════════════════════════════════════════════ */
console.log('[Andromeda v2] ✓ Patch actif — 8 verticales mises à jour');
console.log('  V0: Stickers & Decals (élargi)');
console.log('  V1: T-Shirt Perso (repositionné + PicWish auto)');
console.log('  V2: Casquette (guide broderie/DTF + zones)');
console.log('  V3: DTF Originals (parcours collection complet)');
console.log('  V4: Pack Collector + Atelier (double parcours)');
console.log('  V5: Formation 3h + Pack Machines');
console.log('  V6: Abonnements (3 tiers + engagements)');
console.log('  V7: Services Numériques IA');

})();
