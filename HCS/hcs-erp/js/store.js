/* ================================================================
   HCS ERP — store.js
   Objet DB global, fonctions CRUD génériques,
   sauvegarde / chargement localStorage, import / export JSON
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   CLÉ DE STOCKAGE DANS LE LOCALSTORAGE
   ---------------------------------------------------------------- */
const LS_KEY      = 'hcs_erp_db';
/* Clé séparée pour les images base64 des mockups (évite QuotaExceededError) */
const MOCKUPS_KEY  = 'hcs_erp_mockups';
const MOCKUP_COLS  = ['devis', 'factures'];

/* ----------------------------------------------------------------
   SCHÉMA PAR DÉFAUT DE LA BASE
   Rempli par data/seed.js au premier démarrage
   ---------------------------------------------------------------- */
const DB_DEFAULT = {
  produits:          [],
  contacts:          [],
  clients:           [],   // Fiches clients entreprises / organisations
  fournisseurs:      [],
  opportunites:      [],
  devis:             [],
  commandes:         [],
  factures:          [],
  facturesPartielles:[],  // Acomptes et situations de travaux
  paiements:         [],  // Encaissements et décaissements
  bonsAchat:         [],
  ordresFab:         [],
  ecritures:         [],
  messages:          [],
  utilisateurs:      [],   // Comptes utilisateurs ERP
  auditLog:          [],   // Journal d'audit (actions utilisateurs)
  depenses:          [],   // Dépenses du magasin (avec TVA 13% / 16%)
  employes:          [],   // Fiches employés RH
  conges:            [],   // Demandes de congés RH
  notifications:     [],   // Notifications système
  postes:            [],   // Postes de travail (manufacturing)
  _meta: {
    version: '1.2.0',
    createdAt: new Date().toISOString(),
    counters: {
      devis:              0,
      commandes:          0,
      factures:           0,
      facturesPartielles: 0,
      paiements:          0,
      bonsAchat:          0,
      ordresFab:          0,
      ecritures:          0,
      utilisateurs:       0
    }
  }
};

/* ----------------------------------------------------------------
   STORE : API publique
   ---------------------------------------------------------------- */
const Store = (() => {

  // Base en mémoire (chargée depuis localStorage ou seed)
  let db = null;

  /* ---------- CHARGEMENT ---------- */

  /**
   * Charge la base depuis localStorage.
   * Si aucune donnée n'existe, initialise avec les données du seed.
   */
  function load() {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        db = JSON.parse(raw);
        /* Migration non-destructive : préserver les données utilisateur */
        const seedVersion = (typeof SEED !== 'undefined' && SEED._meta) ? SEED._meta.seedVersion : null;
        const dbVersion   = db._meta ? db._meta.seedVersion : null;
        let patched = false;

        /* 1. Ajouter les collections manquantes (sans écraser les existantes) */
        Object.keys(DB_DEFAULT).forEach(col => {
          if (col !== '_meta' && !db[col]) {
            /* Si la collection est nouvelle et que le seed en a, on l'injecte */
            db[col] = (typeof SEED !== 'undefined' && SEED[col]) ? SEED[col] : [];
            patched = true;
          }
        });

        /* 2. Ajouter les compteurs manquants */
        if (!db._meta) db._meta = { counters: {} };
        if (!db._meta.counters) db._meta.counters = {};
        Object.keys(DB_DEFAULT._meta.counters).forEach(k => {
          if (db._meta.counters[k] === undefined) { db._meta.counters[k] = 0; patched = true; }
        });

        /* 3. Fusionner les collections du seed qui n'existent pas encore (par id) */
        if (seedVersion && seedVersion !== dbVersion && typeof SEED !== 'undefined') {
          const MERGE_COLS = ['ecritures', 'fournisseurs', 'postes'];
          MERGE_COLS.forEach(col => {
            if (!db[col]) db[col] = [];
            const existingIds = new Set(db[col].map(e => e.id));
            (SEED[col] || []).forEach(e => {
              if (!existingIds.has(e.id)) { db[col].push(e); patched = true; }
            });
          });
          console.info(`[Store] Migration seed ${dbVersion || 'null'} → ${seedVersion} (données préservées)`);
        }

        /* 4. Mettre à jour la version */
        if (seedVersion && db._meta.seedVersion !== seedVersion) {
          db._meta.seedVersion = seedVersion;
          db._meta.version     = DB_DEFAULT._meta.version;
          patched = true;
        }

        if (patched) save();

        /* Fusionner les images mockups depuis hcs_erp_mockups */
        try {
          const mockupsStore = JSON.parse(localStorage.getItem(MOCKUPS_KEY) || '{}');
          for (const col of MOCKUP_COLS) {
            (db[col] || []).forEach(record => {
              if (mockupsStore[record.id]) record.mockupUrls = mockupsStore[record.id];
            });
          }
        } catch (_) {}

        console.info('[Store] Base chargée depuis localStorage');
      } catch (e) {
        console.warn('[Store] Données corrompues, réinitialisation');
        db = null;
      }
    }

    // Aucune donnée → on charge le seed
    if (!db) {
      if (typeof SEED !== 'undefined') {
        db = Object.assign({}, DB_DEFAULT, SEED);
        save(); // Persister immédiatement
        console.info('[Store] Base initialisée depuis le seed');
      } else {
        db = Object.assign({}, DB_DEFAULT);
        console.warn('[Store] Seed non trouvé, base vide');
      }
    }
  }

  /* ---------- SAUVEGARDE ---------- */

  /**
   * Persiste la base dans localStorage.
   * Appelé automatiquement après chaque mutation CRUD.
   */
  function save() {
    try {
      /* Extraire les dataUrl des mockups dans hcs_erp_mockups (clé séparée)
         pour éviter QuotaExceededError — les images base64 peuvent dépasser 5 MB */
      const mockupsStore = {};
      const dbForStorage = JSON.parse(JSON.stringify(db));

      for (const col of MOCKUP_COLS) {
        (dbForStorage[col] || []).forEach(record => {
          if (Array.isArray(record.mockupUrls) && record.mockupUrls.some(m => m.dataUrl)) {
            mockupsStore[record.id] = record.mockupUrls;
            /* Garder seulement les métadonnées dans hcs_erp_db */
            record.mockupUrls = record.mockupUrls.map(m => ({
              nom: m.nom || '', date: m.date || '', source: m.source || ''
            }));
          }
        });
      }

      /* Fusionner avec les images existantes et sauvegarder */
      if (Object.keys(mockupsStore).length > 0) {
        try {
          const existing = JSON.parse(localStorage.getItem(MOCKUPS_KEY) || '{}');
          localStorage.setItem(MOCKUPS_KEY, JSON.stringify(Object.assign(existing, mockupsStore)));
        } catch (e) {
          console.warn('[Store] hcs_erp_mockups quota dépassé :', e);
        }
      }

      /* Limiter l'auditLog à 200 entrées pour éviter QuotaExceededError */
      if (dbForStorage.auditLog && dbForStorage.auditLog.length > 200) {
        dbForStorage.auditLog = dbForStorage.auditLog.slice(-200);
      }
      /* Limiter les messages à 500 entrées */
      if (dbForStorage.messages && dbForStorage.messages.length > 500) {
        dbForStorage.messages = dbForStorage.messages.slice(-500);
      }

      try {
        localStorage.setItem(LS_KEY, JSON.stringify(dbForStorage));
      } catch (e1) {
        /* Fallback 1 : audit log minimal + stripping des champs binaires */
        if (dbForStorage.auditLog) dbForStorage.auditLog = dbForStorage.auditLog.slice(-50);
        if (dbForStorage.messages) dbForStorage.messages = dbForStorage.messages.slice(-100);
        /* Supprimer les dataUrl résiduels dans toutes les collections */
        for (const col of Object.keys(dbForStorage)) {
          if (!Array.isArray(dbForStorage[col])) continue;
          dbForStorage[col].forEach(r => {
            if (typeof r !== 'object' || !r) return;
            for (const k of Object.keys(r)) {
              if (typeof r[k] === 'string' && r[k].startsWith('data:')) r[k] = '';
            }
          });
        }
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(dbForStorage));
          console.warn('[Store] Sauvegarde dégradée (images supprimées) après QuotaExceededError');
        } catch (e2) {
          console.error('[Store] Erreur de sauvegarde :', e2);
        }
      }
    } catch (e) {
      console.error('[Store] Erreur de sauvegarde :', e);
    }
  }

  /* ---------- ACCESSEURS ---------- */

  /** Retourne la base complète (lecture seule conseillée) */
  function getDB() {
    if (!db) load();
    return db;
  }

  /**
   * Retourne tous les enregistrements d'une collection.
   * @param {string} collection  - ex: 'produits', 'contacts'
   */
  function getAll(collection) {
    if (!db) load();
    return db[collection] || [];
  }

  /**
   * Retourne un enregistrement par son id.
   * @param {string} collection
   * @param {string} id
   */
  function getById(collection, id) {
    return getAll(collection).find(item => item.id === id) || null;
  }

  /* ---------- MUTATIONS ---------- */

  /**
   * Ajoute un enregistrement dans une collection.
   * Génère un id si absent.
   * @param {string} collection
   * @param {object} record
   * @returns {object} L'enregistrement créé
   */
  function create(collection, record) {
    if (!db) load();
    if (!db[collection]) db[collection] = [];

    // Génération d'id si absent
    if (!record.id) {
      record.id = collection + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    }

    record._createdAt = new Date().toISOString();
    record._updatedAt = new Date().toISOString();

    db[collection].push(record);
    save();

    /* Sync MySQL asynchrone (fire-and-forget) */
    _syncMySQLCreate(collection, record);

    return record;
  }

  /**
   * Met à jour un enregistrement existant (fusion partielle).
   * @param {string} collection
   * @param {string} id
   * @param {object} updates - Champs à modifier
   * @returns {object|null} L'enregistrement mis à jour, ou null
   */
  function update(collection, id, updates) {
    if (!db) load();
    const idx = (db[collection] || []).findIndex(item => item.id === id);
    if (idx === -1) return null;

    db[collection][idx] = Object.assign({}, db[collection][idx], updates, {
      _updatedAt: new Date().toISOString()
    });
    save();

    /* Sync MySQL asynchrone (fire-and-forget) */
    _syncMySQLUpdate(collection, id, updates);

    return db[collection][idx];
  }

  /**
   * Supprime un enregistrement.
   * @param {string} collection
   * @param {string} id
   * @returns {boolean} true si supprimé
   */
  /* Collections protégées : suppression interdite (intégrité comptable) */
  const PROTECTED_COLLECTIONS = new Set(['factures', 'facturesPartielles', 'ecritures', 'paiements']);

  function remove(collection, id) {
    if (!db) load();

    /* Verrou comptable — une facture ou écriture ne se supprime jamais */
    /* Exception : facture avec statut 'Annulé' → aucune écriture comptable liée, suppression autorisée */
    if (PROTECTED_COLLECTIONS.has(collection)) {
      if (collection === 'factures') {
        const rec = (db[collection] || []).find(r => r.id === id);
        if (!rec || rec.statut !== 'Annulé') {
          console.error(`[Store] Suppression interdite sur "${collection}" — intégrité comptable.`);
          if (typeof showToast === 'function') {
            showToast('Suppression interdite : utilisez l\'annulation (statut Annulé).', 'error');
          }
          return false;
        }
        /* Facture Annulée : on continue vers la suppression réelle */
      } else {
        console.error(`[Store] Suppression interdite sur "${collection}" — intégrité comptable.`);
        if (typeof showToast === 'function') {
          showToast('Suppression interdite : utilisez l\'annulation (statut Annulé).', 'error');
        }
        return false;
      }
    }

    if (!db[collection]) return false;
    const len = db[collection].length;

    /* Sync MySQL avant la suppression (on a encore le record) */
    _syncMySQLDelete(collection, id);

    db[collection] = db[collection].filter(item => item.id !== id);

    /* Tombstone : mémorise l'ID supprimé pour que pullAllFromMySQL ne le réinjecte pas */
    if (!db._tombstones) db._tombstones = {};
    if (!db._tombstones[collection]) db._tombstones[collection] = [];
    if (!db._tombstones[collection].includes(id)) db._tombstones[collection].push(id);

    /* Nettoyer les images mockups orphelines */
    if (MOCKUP_COLS.includes(collection)) {
      try {
        const mk = JSON.parse(localStorage.getItem(MOCKUPS_KEY) || '{}');
        if (mk[id]) { delete mk[id]; localStorage.setItem(MOCKUPS_KEY, JSON.stringify(mk)); }
      } catch (_) {}
    }

    save();
    return db[collection].length < len;
  }

  /**
   * Recherche dans une collection (recherche textuelle naïve).
   * @param {string} collection
   * @param {string} query
   * @param {string[]} fields - Champs à chercher (ex: ['nom','email'])
   */
  function search(collection, query, fields = []) {
    const items = getAll(collection);
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      fields.some(f => String(item[f] || '').toLowerCase().includes(q))
    );
  }

  /* ---------- COMPTEURS & NUMÉROTATION ---------- */

  /**
   * Incrémente et retourne le prochain numéro pour une série.
   * @param {string} serie - ex: 'devis', 'factures'
   * @returns {number}
   */
  function nextCounter(serie) {
    if (!db) load();
    if (!db._meta) db._meta = { counters: {} };
    if (!db._meta.counters) db._meta.counters = {};
    db._meta.counters[serie] = (db._meta.counters[serie] || 0) + 1;
    save();
    return db._meta.counters[serie];
  }

  /* ---------- MESSAGES (CHAT) ---------- */

  /**
   * Ajoute un message dans la collection messages.
   * @param {object} msg
   */
  function addMessage(msg) {
    return create('messages', msg);
  }

  /* ---------- NOTIFICATIONS SYSTÈME ---------- */

  /**
   * Crée une notification système dans db.notifications.
   * Appelé par les autres modules pour signaler un événement.
   * @param {string} text   - Texte de la notification
   * @param {string} source - Source : 'stock'|'facture'|'of'|'achat'|'autre'
   */
  function addNotification(text, source) {
    if (!db) load();
    if (!db.notifications) db.notifications = [];

    /* Éviter les doublons récents (même texte dans les 5 min) */
    const fiveMin = Date.now() - 5 * 60 * 1000;
    const exists  = db.notifications.some(n =>
      n.text === text && new Date(n.date).getTime() > fiveMin
    );
    if (exists) return null;

    const notif = {
      id:     'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text,
      source: source || 'autre',
      date:   new Date().toISOString(),
      read:   false
    };
    db.notifications.unshift(notif);

    /* Garder au maximum 50 notifications */
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
    save();

    /* Mettre à jour le badge de la topbar si Discuss est chargé */
    if (typeof Discuss !== 'undefined' && typeof Discuss.updateBadge === 'function') {
      Discuss.updateBadge();
    }
    return notif;
  }

  /* ---------- JOURNAL D'AUDIT ---------- */

  /**
   * Enregistre une action dans le journal d'audit.
   * Appelé par auth.js et les modules métier.
   * @param {string} action   - Description courte de l'action (ex: 'Connexion', 'Créé facture FAC-0042')
   * @param {string} module   - Module concerné (ex: 'ventes', 'auth', 'utilisateurs')
   * @param {object} details  - Données additionnelles (optionnel)
   */
  function addAuditLog(action, module, details) {
    if (!db) load();
    if (!db.auditLog) db.auditLog = [];

    /* Récupérer l'utilisateur courant depuis la session */
    let utilisateur = 'system';
    try {
      const raw = localStorage.getItem('hcs_erp_session');
      if (raw) {
        const s = JSON.parse(raw);
        utilisateur = s.prenom && s.nom ? s.prenom + ' ' + s.nom : s.prenom || s.login || 'Inconnu';
      }
    } catch {}

    const entry = {
      id:          'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      date:        new Date().toISOString(),
      utilisateur,
      action:      action || '',
      module:      module || 'système',
      details:     details || null
    };

    db.auditLog.unshift(entry);

    /* Limiter à 500 entrées */
    if (db.auditLog.length > 500) db.auditLog = db.auditLog.slice(0, 500);
    save();
    return entry;
  }

  /**
   * Marque toutes les notifications comme lues.
   */
  function markNotificationsRead() {
    if (!db) load();
    if (!db.notifications) return;
    db.notifications.forEach(n => { n.read = true; });
    save();
  }

  /**
   * Retourne le nombre de notifications non lues.
   * @returns {number}
   */
  function getUnreadNotifCount() {
    if (!db) load();
    return (db.notifications || []).filter(n => !n.read).length;
  }

  /* ---------- IMPORT / EXPORT ---------- */

  /**
   * Exporte la base complète en JSON téléchargeable.
   */
  function exportJSON() {
    if (!db) load();
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `hcs-erp-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.info('[Store] Export JSON effectué');
  }

  /**
   * Importe une base depuis un fichier JSON.
   * @param {File} file
   */
  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          // Validation minimale
          if (!imported.produits || !imported.contacts) {
            throw new Error('Fichier invalide : collections requises manquantes');
          }
          db = imported;
          save();
          resolve(db);
          console.info('[Store] Import JSON réussi');
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  /**
   * Applique les variantes par défaut HCS aux produits existants en localStorage.
   * À exécuter une fois depuis la console : Store.applyDefaultVariants()
   * Ne touche que les produits sans variantes (ou variantes vides).
   */
  function applyDefaultVariants() {
    if (!db) load();

    const TAILLES    = ['XS','S','M','L','XL','XXL'];
    const C_POLO     = ['Blanc','Noir','Marine','Gris','Rouge','Kaki'];
    const C_SHIRT    = ['Blanc','Noir','Marine','Gris','Rouge','Bordeaux','Kaki','Rose'];
    const C_CASQ     = ['Noir','Blanc','Marine','Rouge','Kaki'];
    const C_SAC      = ['Naturel','Noir','Marine'];
    const FORMATS_HTV= ['A5 14×20','A4 20×28','A3 28×40','Coeur 8×8','Poitrine 20×20','Dos 28×28','Manche 8×8'];

    const mkTex = (prix, cout, tailles, couleurs) => {
      const v = [];
      tailles.forEach(t => couleurs.forEach(c =>
        v.push({ taille: t, couleur: c, ref: '', prix, cout, quantite: 0 })
      ));
      return v;
    };
    const mkCasq = (prix, cout, couleurs) =>
      couleurs.map(c => ({ couleur: c, taille: 'TU', ref: '', prix, cout, quantite: 0 }));
    const mkFmt  = (formats, prix, cout) =>
      formats.map(f => ({ 'Format Thermocollant': f, ref: '', prix, cout, quantite: 0 }));

    /* Règles par SKU / nom partiel */
    const DEFAULTS = [
      { match: p => ['TEX-POLO-001'].includes(p.sku),
        apply: p => ({ variantes: mkTex(p.prix, p.cout, TAILLES, C_POLO),
          customAttrs: [{ nom:'Taille', valeurs:TAILLES },{ nom:'Couleur', valeurs:C_POLO }] }) },
      { match: p => ['TEX-TSHIRT-001','TUC-001'].includes(p.sku) || p.nom?.toLowerCase().includes('t-shirt'),
        apply: p => ({ variantes: mkTex(p.prix, p.cout, TAILLES, C_SHIRT),
          customAttrs: [{ nom:'Taille', valeurs:TAILLES },{ nom:'Couleur', valeurs:C_SHIRT }] }) },
      { match: p => ['TEX-CASQUETTE-001','CAP-001'].includes(p.sku) || p.nom?.toLowerCase().includes('casquette'),
        apply: p => ({ variantes: mkCasq(p.prix, p.cout, C_CASQ),
          customAttrs: [{ nom:'Couleur', valeurs:C_CASQ }] }) },
      { match: p => p.sku === 'TEX-SAC-001',
        apply: p => ({ variantes: mkCasq(p.prix, p.cout, C_SAC),
          customAttrs: [{ nom:'Couleur', valeurs:C_SAC }] }) },
      { match: p => ['HTV-001'].includes(p.sku) || p.nom?.toLowerCase().includes('heat transfer') || p.nom?.toLowerCase().includes('thermocollant') || p.nom?.toLowerCase().includes('vinyl'),
        apply: p => ({ variantes: mkFmt(FORMATS_HTV, p.prix, p.cout),
          customAttrs: [{ nom:'Format Thermocollant', valeurs:FORMATS_HTV }],
          attrPrix: 'Format Thermocollant' }) },
    ];

    let updated = 0;
    (db.produits || []).forEach((p, idx) => {
      if ((p.variantes || []).length > 0) return; /* déjà configuré */
      const rule = DEFAULTS.find(r => r.match(p));
      if (!rule) return;
      const patch = rule.apply(p);
      db.produits[idx] = { ...p, attrIncrements: {}, productKind: 'variable', ...patch };
      updated++;
    });

    if (updated > 0) {
      save();
      console.info(`[Store] applyDefaultVariants : ${updated} produit(s) mis à jour`);
    } else {
      console.info('[Store] applyDefaultVariants : aucun produit à mettre à jour');
    }
    return updated;
  }

  /**
   * Réinitialise la base (supprime le localStorage et recharge le seed).
   */
  function reset() {
    localStorage.removeItem(LS_KEY);
    db = null;
    load();
    console.info('[Store] Base réinitialisée');
  }

  /**
   * Vide des collections spécifiques dans localStorage ET dans MySQL.
   * Sans suppression MySQL, syncFromMySQL() réimporterait tout au rechargement.
   * @param {string[]} collections - ex: ['devis', 'factures']
   * @returns {Promise<{local: string[], mysqlDeleted: number, errors: string[]}>}
   */
  async function resetCollections(collections) {
    if (!db) load();
    const errors = [];
    let mysqlDeleted = 0;

    for (const col of collections) {
      /* 1. Supprimer chaque enregistrement dans MySQL avant de vider le local */
      if (window.MYSQL && MYSQL_TABLES.has(col)) {
        const records = db[col] || [];
        for (const record of records) {
          const mysqlId = record._mysql_id;
          if (!mysqlId) continue;
          try {
            await window.MYSQL.delete(col, mysqlId);
            mysqlDeleted++;
          } catch (e) {
            errors.push(`${col}/${mysqlId}: ${e.message}`);
            console.warn(`[Store] resetCollections MySQL delete ${col} échoué:`, e.message);
          }
        }
      }

      /* 2. Vider en local et remettre le compteur à zéro */
      db[col] = [];
      if (db._meta && db._meta.counters && db._meta.counters[col] !== undefined) {
        db._meta.counters[col] = 0;
      }
      console.info(`[Store] Collection "${col}" vidée (MySQL: ${mysqlDeleted} supprimé(s))`);
    }

    save();
    console.info('[Store] resetCollections terminé :', collections.join(', '));
    return { local: collections, mysqlDeleted, errors };
  }

  /* ================================================================
     SYNC MYSQL — miroir asynchrone vers l'API PHP
     Fire-and-forget : ne bloque jamais les opérations locales.
     ================================================================ */

  /* Tables du Store qui ont une contrepartie MySQL */
  const MYSQL_TABLES = new Set([
    'contacts', 'produits', 'fournisseurs', 'devis', 'commandes',
    'factures', 'bonsAchat', 'employes', 'conges', 'commandes_atelier',
    'planning_atelier', 'taches_agents'
  ]);

  /**
   * Envoie une création vers MySQL.
   * Stocke l'ID MySQL retourné dans le record Store (_mysql_id).
   */
  async function _syncMySQLCreate(collection, record) {
    if (!window.MYSQL || !MYSQL_TABLES.has(collection)) return;
    try {
      const payload = _buildMySQLPayload(record);
      const created = await window.MYSQL.create(collection, payload);
      if (created && created.id) {
        /* Stocker l'ID MySQL sans déclencher une nouvelle sync */
        const idx = (db[collection] || []).findIndex(r => r.id === record.id);
        if (idx !== -1) {
          db[collection][idx]._mysql_id = created.id;
          try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (_) {}
        }
      }
    } catch (e) {
      console.warn(`[Store] MySQL create ${collection} échoué:`, e.message);
    }
  }

  /**
   * Envoie une mise à jour vers MySQL.
   * Si _mysql_id absent (ex: produits seed) → upsert complet via store_id.
   */
  async function _syncMySQLUpdate(collection, storeId, updates) {
    if (!window.MYSQL || !MYSQL_TABLES.has(collection)) return;
    try {
      const record = (db[collection] || []).find(r => r.id === storeId);
      if (!record) return;
      if (!record._mysql_id) {
        /* Fallback upsert : envoie l'enregistrement complet avec store_id.
           base.php utilise INSERT … ON DUPLICATE KEY UPDATE → idempotent. */
        const payload = _buildMySQLPayload(record);
        const created = await window.MYSQL.create(collection, payload);
        if (created && created.id) {
          record._mysql_id = created.id;
          try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (_) {}
          console.info(`[Store] MySQL upsert ${collection}/${storeId} → mysql_id=${created.id}`);
        }
        return;
      }
      const payload = _buildMySQLPayload(updates);
      await window.MYSQL.update(collection, record._mysql_id, payload);
    } catch (e) {
      console.warn(`[Store] MySQL update ${collection} échoué:`, e.message);
    }
  }

  /**
   * Envoie une suppression vers MySQL.
   * Une erreur 404 est silencieuse : l'enregistrement n'existe déjà plus côté serveur.
   */
  async function _syncMySQLDelete(collection, storeId) {
    if (!window.MYSQL || !MYSQL_TABLES.has(collection)) return;
    try {
      const record = (db[collection] || []).find(r => r.id === storeId);
      if (!record || !record._mysql_id) return;
      await window.MYSQL.delete(collection, record._mysql_id);
    } catch (e) {
      /* 404 = déjà absent de MySQL → pas une vraie erreur */
      if (e.message && e.message.includes('404')) return;
      if (e.message && e.message.includes('introuvable')) return;
      console.warn(`[Store] MySQL delete ${collection} échoué:`, e.message);
    }
  }

  /**
   * Prépare les données pour MySQL.
   * - Exclut les champs internes (_createdAt, _updatedAt, _mysql_id)
   * - Mappe 'id' → 'store_id' (colonne de liaison dans MySQL)
   * - Arrays/objects laissés tels quels (base.php les JSON-encode)
   */
  /* Mapping inverse Store → MySQL (champs qui ne suivent pas camelCase standard) */
  const _STORE_TO_MYSQL_MAP = {
    client:            'client_nom',
    contactId:         'client_id',
    totalHT:           'total_ht',
    totalTVA:          'total_tva',
    totalTTC:          'total_ttc',
    dateExpiration:    'date_expiration',
    dateEcheance:      'date_echeance',
    paiementsDevis:    'paiements_devis',
    commandeId:        'commande_id',
    devisId:           'devis_id',
    quoteId:           'quote_id',
    archivedAt:        'archived_at',
    mockupUrls:        'mockup_urls',
    stockMin:          'stock_min',
    attrPrix:          'attr_prix',
    attrIncrements:    'attr_increments',
    formatsPrix:       'formats_prix',
    customAttrs:       'custom_attrs',
    fournisseurId:     'fournisseur_id',
    dateLivraisonPrevue: 'date_livraison_prevue',
    devisOrigineId:    'devis_origine_id',
    devisOrigineRef:   'devis_origine_ref',
    cmdRef:            'cmd_ref',
  };

  function _buildMySQLPayload(record) {
    const exclude = new Set(['_createdAt', '_updatedAt', '_mysql_id']);
    const payload = {};
    for (const [k, v] of Object.entries(record || {})) {
      if (exclude.has(k)) continue;
      if (k === 'id') { payload['store_id'] = v; continue; }
      const mysqlKey = _STORE_TO_MYSQL_MAP[k] || k;
      payload[mysqlKey] = v;
    }
    return payload;
  }

  /**
   * Convertit une ligne MySQL en record Store local.
   * Utilise store_id comme id local si disponible.
   * Parse automatiquement les champs JSON (lignes, paiements, variantes…).
   * @private
   */
  /* snake_case → camelCase générique */
  function _snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
              .replace(/_([A-Z]+)/g, (_, g) => g);
  }

  /* Mapping explicite MySQL → Store pour les champs qui ne suivent pas camelCase standard */
  const _MYSQL_FIELD_MAP = {
    /* Devis / Commandes / Factures */
    client_nom:        'client',
    client_id:         'contactId',
    total_ht:          'totalHT',
    total_tva:         'totalTVA',
    total_ttc:         'totalTTC',
    date_expiration:   'dateExpiration',
    date_echeance:     'dateEcheance',
    paiements_devis:   'paiementsDevis',
    commande_id:       'commandeId',
    devis_id:          'devisId',
    quote_id:          'quoteId',
    archived_at:       'archivedAt',
    mockup_urls:       'mockupUrls',
    /* Produits */
    stock_min:         'stockMin',
    attr_prix:         'attrPrix',
    attr_increments:   'attrIncrements',
    formats_prix:      'formatsPrix',
    custom_attrs:      'customAttrs',
    /* Contacts */
    /* Bons achat */
    fournisseur_id:    'fournisseurId',
    date_livraison_prevue: 'dateLivraisonPrevue',
    devis_origine_id:  'devisOrigineId',
    devis_origine_ref: 'devisOrigineRef',
    /* Atelier */
    commande_atelier_id: 'commandeAtelierId',
    cmd_ref:           'cmdRef',
  };

  function _mysqlRowToLocal(collection, row) {
    const record = {
      id:         row.store_id || (collection + '-mysql-' + row.id + '-' + Math.random().toString(36).substr(2, 5)),
      _mysql_id:  row.id,
      _createdAt: row.created_at || new Date().toISOString(),
      _updatedAt: row.updated_at || new Date().toISOString()
    };
    for (const [k, v] of Object.entries(row)) {
      if (['id', 'store_id', 'created_at', 'updated_at'].includes(k)) continue;
      const localKey = _MYSQL_FIELD_MAP[k] || _snakeToCamel(k);
      if (typeof v === 'string' && v.length > 1 && (v[0] === '[' || v[0] === '{')) {
        try { record[localKey] = JSON.parse(v); } catch { record[localKey] = v; }
      } else {
        record[localKey] = v;
      }
    }
    return record;
  }

  /**
   * MySQL → localStorage : importe les records MySQL absents en local.
   * Identifie les doublons via store_id (fiable) OU _mysql_id (fallback).
   * Recale les compteurs de numérotation.
   *
   * @param {string[]} [collections]
   * @returns {Promise<{synced: number, errors: string[]}>}
   */
  async function syncFromMySQL(collections) {
    if (!window.MYSQL) return { synced: 0, errors: ['MySQL non disponible'] };
    if (!db) load();

    const SYNC_COLS = collections || ['devis', 'factures', 'commandes', 'contacts', 'produits', 'fournisseurs'];
    const COUNTER_MAP = { devis: 'devis', factures: 'factures', commandes: 'commandes' };
    let synced = 0;
    const errors = [];

    for (const col of SYNC_COLS) {
      try {
        const rows = await window.MYSQL.getAll(col, { limit: 2000 });
        if (!Array.isArray(rows) || !rows.length) continue;

        /* Double index : par _mysql_id et par store_id (= id local) */
        const byMysqlId = new Map();
        const byStoreId = new Map();
        (db[col] || []).forEach(r => {
          if (r._mysql_id) byMysqlId.set(String(r._mysql_id), r);
          if (r.id)        byStoreId.set(r.id, r);
        });

        const tombstones = new Set((db._tombstones && db._tombstones[col]) || []);

        for (const row of rows) {
          /* Ignorer les enregistrements supprimés localement */
          if (row.store_id && tombstones.has(row.store_id)) continue;

          const alreadyLinked  = byMysqlId.has(String(row.id));
          const alreadyByStore = row.store_id && byStoreId.has(row.store_id);
          if (alreadyLinked || alreadyByStore) {
            /* Mettre à jour _mysql_id si le record local l'avait perdu */
            if (alreadyByStore && !alreadyLinked) {
              const local = byStoreId.get(row.store_id);
              local._mysql_id = row.id;
            }
            continue;
          }

          const record = _mysqlRowToLocal(col, row);
          if (!db[col]) db[col] = [];
          db[col].push(record);
          synced++;

          /* Recaler le compteur si on détecte un numéro de référence plus élevé */
          const cKey = COUNTER_MAP[col];
          if (cKey && record.ref) {
            const m = String(record.ref).match(/(\d+)$/);
            if (m) {
              const n = parseInt(m[1], 10);
              if (!db._meta.counters) db._meta.counters = {};
              if (n > (db._meta.counters[cKey] || 0)) db._meta.counters[cKey] = n;
            }
          }
        }
      } catch (e) {
        errors.push(`${col}: ${e.message}`);
        console.warn(`[Store] syncFromMySQL ${col} échoué:`, e.message);
      }
    }

    if (synced > 0) {
      save();
      console.info(`[Store] syncFromMySQL: ${synced} enregistrement(s) restauré(s) depuis MySQL`);
    }
    return { synced, errors };
  }

  /**
   * localStorage → MySQL : envoie les records locaux sans _mysql_id.
   * Corrige les records créés quand MySQL était hors-ligne.
   *
   * @param {string[]} [collections]
   * @returns {Promise<{pushed: number, errors: string[]}>}
   */
  async function pushMissingToMySQL(collections) {
    if (!window.MYSQL) return { pushed: 0, errors: ['MySQL non disponible'] };
    if (!db) load();

    const PUSH_COLS = collections || ['devis', 'factures', 'commandes', 'contacts', 'produits', 'fournisseurs'];
    let pushed = 0;
    const errors = [];

    for (const col of PUSH_COLS) {
      /* Tous les records sans _mysql_id, y compris les produits seed (prod-001…)
         qui peuvent avoir été modifiés et doivent être persistés en MySQL. */
      const orphans = (db[col] || []).filter(r => !r._mysql_id);
      for (const record of orphans) {
        try {
          const payload = _buildMySQLPayload(record);
          const created = await window.MYSQL.create(col, payload);
          if (created && created.id) {
            const idx = db[col].findIndex(r => r.id === record.id);
            if (idx !== -1) db[col][idx]._mysql_id = created.id;
            pushed++;
          }
        } catch (e) {
          errors.push(`${col}/${record.id}: ${e.message}`);
          console.warn(`[Store] pushMissingToMySQL ${col} échoué:`, e.message);
        }
      }
    }

    if (pushed > 0) {
      save();
      console.info(`[Store] pushMissingToMySQL: ${pushed} enregistrement(s) envoyé(s) vers MySQL`);
    }
    return { pushed, errors };
  }

  /**
   * Synchronisation forcée d'une collection vers MySQL.
   * Couvre tous les cas : nouveaux articles, articles seed modifiés,
   * records créés hors-ligne sans _mysql_id.
   *
   * - Sans _mysql_id → CREATE dans MySQL puis stocke _mysql_id
   * - Avec _mysql_id → UPDATE dans MySQL avec les valeurs actuelles
   *
   * @param {string} [collection='produits']
   * @returns {Promise<{created: number, updated: number, errors: string[]}>}
   */
  /* Timeout par requête pour éviter un freeze si le serveur ne répond pas */
  function _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(function(_, rej) {
        setTimeout(function() { rej(new Error('timeout ' + ms + 'ms')); }, ms);
      })
    ]);
  }

  async function syncAllToMySQL(collection = 'produits', onProgress = null) {
    if (!window.MYSQL) return { created: 0, updated: 0, errors: ['MySQL non disponible'] };
    if (!db) load();

    const records = db[collection] || [];
    let created = 0, updated = 0;
    const errors = [];
    const total = records.length;
    let done = 0;
    const TIMEOUT_MS = 20000; /* 20s max par requête */

    for (const record of records) {
      try {
        const payload = _buildMySQLPayload(record);

        if (!record._mysql_id) {
          /* Pas encore en MySQL → CREATE */
          const res = await _withTimeout(window.MYSQL.create(collection, payload), TIMEOUT_MS);
          if (res && res.id) {
            const idx = db[collection].findIndex(r => r.id === record.id);
            if (idx !== -1) db[collection][idx]._mysql_id = res.id;
            created++;
          }
        } else {
          /* Déjà en MySQL → UPDATE pour refléter les modifications locales */
          await _withTimeout(window.MYSQL.update(collection, record._mysql_id, payload), TIMEOUT_MS);
          updated++;
        }
      } catch (e) {
        errors.push(`${record.id}: ${e.message}`);
        console.warn(`[Store] syncAllToMySQL ${collection} échoué pour ${record.id}:`, e.message);
      }
      done++;
      if (typeof onProgress === 'function') {
        onProgress({ done, total, label: record.nom || record.id || '' });
      }
    }

    if (created + updated > 0) {
      try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (_) {}
      console.info(`[Store] syncAllToMySQL ${collection} : ↑${created} créé(s), ↻${updated} mis à jour`);
    }
    return { created, updated, errors };
  }

  /**
   * MySQL → localStorage : PULL GLOBAL (MySQL fait autorité).
   * Pour chaque collection, récupère tous les enregistrements MySQL
   * et écrase les records locaux correspondants (match par store_id ou _mysql_id).
   * Les records locaux sans contrepartie MySQL sont conservés.
   *
   * @param {string[]} [collections]  — liste optionnelle ; défaut : toutes les tables sync
   * @returns {Promise<{updated: number, added: number, errors: string[]}>}
   */
  async function pullAllFromMySQL(collections, onProgress = null) {
    if (!window.MYSQL) return { updated: 0, added: 0, errors: ['MySQL non disponible'] };
    if (!db) load();

    const DEFAULT_COLS = ['produits', 'contacts', 'fournisseurs', 'devis', 'commandes', 'factures'];
    const COLS = Array.isArray(collections) ? collections : DEFAULT_COLS;
    const total = COLS.length;
    let colDone = 0;
    let updated = 0, added = 0;
    const errors = [];

    for (const col of COLS) {
      try {
        const rows = await _withTimeout(window.MYSQL.getAll(col, { limit: 5000 }), 30000);
        if (!Array.isArray(rows) || !rows.length) {
          colDone++;
          if (typeof onProgress === 'function') onProgress({ done: colDone, total, label: col });
          continue;
        }
        if (!db[col]) db[col] = [];

        const tombstones = new Set((db._tombstones && db._tombstones[col]) || []);

        for (const row of rows) {
          /* Ignorer les produits supprimés localement */
          if (row.store_id && tombstones.has(row.store_id)) continue;

          const record = _mysqlRowToLocal(col, row);

          /* Cherche le record local : d'abord par store_id, puis par _mysql_id */
          let idx = row.store_id ? db[col].findIndex(r => r.id === row.store_id) : -1;
          if (idx < 0) idx = db[col].findIndex(r => r._mysql_id === row.id);

          if (idx >= 0) {
            db[col][idx] = record;   /* Écrase avec la version MySQL */
            updated++;
          } else {
            db[col].push(record);    /* Nouveau depuis MySQL */
            added++;
          }
        }
      } catch (e) {
        errors.push(`${col}: ${e.message}`);
        console.warn(`[Store] pullAllFromMySQL ${col} échoué:`, e.message);
      }
      colDone++;
      if (typeof onProgress === 'function') onProgress({ done: colDone, total, label: col });
    }

    if (updated + added > 0) {
      save();
      console.info(`[Store] pullAllFromMySQL : ↓${updated} mis à jour, +${added} ajouté(s)`);
    }
    return { updated, added, errors };
  }

  /**
   * Dédoublonne une collection en regroupant par une clé.
   * Conserve le "meilleur" enregistrement par groupe (rankFn retourne un score).
   * Supprime les doublons via Store.remove() (sync MySQL inclus).
   *
   * @param {string}   collection  - ex: 'devis'
   * @param {function} keyFn       - (record) => clé de groupe (ex: r => r.ref)
   * @param {function} rankFn      - (record) => score (plus haut = meilleur)
   * @returns {{ kept: number, removed: number }}
   */
  function deduplicateCollection(collection, keyFn, rankFn) {
    if (!db) load();
    const records = db[collection] || [];
    /* Grouper par clé */
    const groups = {};
    records.forEach(r => {
      const k = keyFn(r);
      if (!k) return;
      if (!groups[k]) groups[k] = [];
      groups[k].push(r);
    });

    let removed = 0;
    Object.values(groups).forEach(group => {
      if (group.length <= 1) return;
      /* Trier : meilleur en premier */
      group.sort((a, b) => (rankFn(b) || 0) - (rankFn(a) || 0));
      /* Supprimer tous sauf le premier */
      group.slice(1).forEach(dup => {
        remove(collection, dup.id);
        removed++;
      });
    });

    if (removed > 0) save();
    return { kept: Object.keys(groups).length, removed };
  }

  /* ---------- API PUBLIQUE ---------- */
  return {
    load,
    save,
    getDB,
    getAll,
    getById,
    create,
    update,
    remove,
    deduplicateCollection,
    search,
    nextCounter,
    addMessage,
    addNotification,
    markNotificationsRead,
    getUnreadNotifCount,
    addAuditLog,
    exportJSON,
    importJSON,
    reset,
    resetCollections,
    applyDefaultVariants,
    syncFromMySQL,
    pushMissingToMySQL,
    syncAllToMySQL,
    pullAllFromMySQL
  };
})();

/* Initialiser la base au chargement du script */
Store.load();

/* Sync bidirectionnelle au démarrage :
   1. MySQL → local : récupère les records absents (restauration après perte localStorage)
   2. Local → MySQL : pousse les records sans _mysql_id (créés hors-ligne)
*/
(async () => {
  /* Attendre que mysql-api.js soit chargé (window.MYSQL dispo) — polling au lieu de délai fixe */
  await new Promise(r => {
    if (window.MYSQL) { r(); return; }
    let tries = 0;
    const t = setInterval(() => {
      if (window.MYSQL || ++tries > 20) { clearInterval(t); r(); }
    }, 100);
  });

  const [fromMySQL, toMySQL] = await Promise.all([
    Store.syncFromMySQL(),
    Store.pushMissingToMySQL()
  ]);

  const total = fromMySQL.synced + toMySQL.pushed;
  if (total > 0) {
    console.info(`[Store] Sync démarrage : ↓${fromMySQL.synced} restauré(s), ↑${toMySQL.pushed} envoyé(s)`);
    /* Rafraîchir l'affichage si l'app est montée */
    if (typeof App !== 'undefined' && typeof App.refresh === 'function') App.refresh();
  }
})();
