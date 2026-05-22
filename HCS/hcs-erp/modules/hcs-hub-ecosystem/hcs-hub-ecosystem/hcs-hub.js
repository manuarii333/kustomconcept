/* ═══════════════════════════════════════════════════════════════
   HCS HUB v1.0 — Bus de données unifié pour l'écosystème HCS
   ═══════════════════════════════════════════════════════════════
   Un seul fichier JS, zéro dépendance.
   Inclure dans chaque app : <script src="hcs-hub.js"></script>
   
   4 object stores :
     logos     — logos détourés (PicWish) + originaux (DTF Studio)
     mockups   — compositions finales (MockupForge, Mockup Studio)
     configs   — thèmes, prix, produits (Builder ↔ Andromeda)
     campagnes — état des 8 verticales Andromeda

   Rétrocompatibilité :
     - Migre automatiquement hcs_picwish_db → hub.logos au 1er lancement
     - L'ancien PicWishDB continue de fonctionner en parallèle
     - Aucune app existante ne casse

   Usage :
     await HCSHub.put('logos', { name:'MonLogo', src:'data:image/png;base64,...', client:'Moana', tags:['surf'] })
     const all = await HCSHub.getAll('logos')
     const one = await HCSHub.get('logos', 'abc123')
     const filtered = await HCSHub.query('logos', e => e.source === 'dtf-studio')
     await HCSHub.del('logos', 'abc123')
     HCSHub.onChange('logos', entries => console.log('Mis à jour !', entries))
   ═══════════════════════════════════════════════════════════════ */

const HCSHub = (() => {

  const DB_NAME    = 'hcs_hub';
  const DB_VERSION = 1;
  const STORES     = ['logos', 'mockups', 'configs', 'campagnes'];

  let _db = null;
  let _listeners = {};  // { storeName: [callback, ...] }

  /* ── Ouvrir / créer la base ──────────────────────────────── */
  function open() {
    return new Promise((resolve, reject) => {
      if (_db) { resolve(_db); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        STORES.forEach(name => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: 'id' });
            store.createIndex('source', 'source', { unique: false });
            store.createIndex('type', 'type', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        });
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror = e => reject(e.target.error);
    });
  }

  /* ── ID unique ───────────────────────────────────────────── */
  function uid() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  /* ── PUT — écrire/mettre à jour ──────────────────────────── */
  async function put(storeName, entry) {
    _validateStore(storeName);
    const db = await open();
    const now = new Date().toISOString();
    const record = {
      id:        entry.id || uid(),
      type:      entry.type    || 'generic',
      source:    entry.source  || 'unknown',
      name:      entry.name    || '',
      client:    entry.client  || '',
      tags:      entry.tags    || [],
      data:      entry.data    || '',          // base64 si image
      meta:      entry.meta    || {},          // données libres par app
      createdAt: entry.createdAt || now,
      updatedAt: now
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => { _notify(storeName); resolve(record); };
      tx.onerror = e => reject(e.target.error);
    });
  }

  /* ── GET — lire par id ───────────────────────────────────── */
  async function get(storeName, id) {
    _validateStore(storeName);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = e => reject(e.target.error);
    });
  }

  /* ── GET ALL — tout lire ─────────────────────────────────── */
  async function getAll(storeName) {
    _validateStore(storeName);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = e => reject(e.target.error);
    });
  }

  /* ── QUERY — filtrer avec une fonction ───────────────────── */
  async function query(storeName, filterFn) {
    const all = await getAll(storeName);
    return all.filter(filterFn);
  }

  /* ── DEL — supprimer par id ──────────────────────────────── */
  async function del(storeName, id) {
    _validateStore(storeName);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => { _notify(storeName); resolve(true); };
      tx.onerror = e => reject(e.target.error);
    });
  }

  /* ── CLEAR — vider un store ──────────────────────────────── */
  async function clear(storeName) {
    _validateStore(storeName);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => { _notify(storeName); resolve(true); };
      tx.onerror = e => reject(e.target.error);
    });
  }

  /* ── COUNT — nombre d'entrées ────────────────────────────── */
  async function count(storeName) {
    _validateStore(storeName);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = e => reject(e.target.error);
    });
  }

  /* ── ON CHANGE — écouter les modifications ───────────────── */
  function onChange(storeName, callback) {
    if (!_listeners[storeName]) _listeners[storeName] = [];
    _listeners[storeName].push(callback);
    return () => {
      _listeners[storeName] = _listeners[storeName].filter(cb => cb !== callback);
    };
  }

  function _notify(storeName) {
    if (!_listeners[storeName]) return;
    getAll(storeName).then(entries => {
      _listeners[storeName].forEach(cb => {
        try { cb(entries); } catch (e) { console.warn('[HCSHub] listener error:', e); }
      });
    });
  }

  /* ── VALIDATION ──────────────────────────────────────────── */
  function _validateStore(name) {
    if (!STORES.includes(name)) {
      throw new Error(`[HCSHub] Store inconnu: "${name}". Stores valides: ${STORES.join(', ')}`);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     MIGRATION — hcs_picwish_db → hcs_hub.logos
     ═══════════════════════════════════════════════════════════
     One-shot au premier appel de migrateFromPicWish().
     Lit l'ancienne DB, copie dans hub.logos avec source:'picwish'.
     Ne supprime PAS l'ancienne DB (rétrocompatibilité).
     ═══════════════════════════════════════════════════════════ */
  async function migrateFromPicWish() {
    const MIGRATED_KEY = 'hcs_hub_picwish_migrated';
    if (localStorage.getItem(MIGRATED_KEY) === '1') return 0;

    let oldEntries = [];
    try {
      oldEntries = await _readOldPicWishDB();
    } catch (e) {
      // Ancienne DB n'existe pas ou erreur — rien à migrer
      localStorage.setItem(MIGRATED_KEY, '1');
      return 0;
    }

    if (!oldEntries.length) {
      localStorage.setItem(MIGRATED_KEY, '1');
      return 0;
    }

    let migrated = 0;
    for (const entry of oldEntries) {
      // Vérifier si déjà dans le hub (par ancien id)
      const existing = await get('logos', entry.id).catch(() => null);
      if (!existing) {
        await put('logos', {
          id:     entry.id,
          type:   'client',
          source: 'picwish',
          name:   entry.name || '',
          client: entry.client || '',
          data:   entry.src || '',
          tags:   ['migré', 'picwish'],
          meta:   { date: entry.date || '' },
          createdAt: entry.date ? new Date(entry.date.split('/').reverse().join('-')).toISOString() : new Date().toISOString()
        });
        migrated++;
      }
    }

    localStorage.setItem(MIGRATED_KEY, '1');
    return migrated;
  }

  function _readOldPicWishDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('hcs_picwish_db', 1);
      req.onupgradeneeded = e => {
        // La DB n'existait pas — on la ferme et on ne crée rien
        e.target.transaction.abort();
        reject(new Error('no_old_db'));
      };
      req.onsuccess = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('bank')) {
          db.close();
          resolve([]);
          return;
        }
        const tx  = db.transaction('bank', 'readonly');
        const all = tx.objectStore('bank').getAll();
        all.onsuccess = () => { db.close(); resolve(all.result || []); };
        all.onerror   = () => { db.close(); reject(all.error); };
      };
      req.onerror = e => reject(e.target.error);
    });
  }

  /* ═══════════════════════════════════════════════════════════
     EXPORT / IMPORT JSON — fallback portable
     ═══════════════════════════════════════════════════════════ */
  async function exportJSON(storeName) {
    const entries = storeName ? await getAll(storeName) : {};
    if (!storeName) {
      for (const s of STORES) entries[s] = await getAll(s);
    }
    return JSON.stringify(storeName ? { [storeName]: entries } : entries, null, 2);
  }

  async function importJSON(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    let total = 0;
    for (const [storeName, entries] of Object.entries(data)) {
      if (!STORES.includes(storeName)) continue;
      for (const entry of entries) {
        await put(storeName, entry);
        total++;
      }
    }
    return total;
  }

  /* ═══════════════════════════════════════════════════════════
     DIAGNOSTIC — info sur l'état du hub
     ═══════════════════════════════════════════════════════════ */
  async function stats() {
    const result = { version: DB_VERSION, stores: {} };
    for (const s of STORES) {
      result.stores[s] = await count(s);
    }
    result.picwishMigrated = localStorage.getItem('hcs_hub_picwish_migrated') === '1';
    return result;
  }

  /* ── API publique ────────────────────────────────────────── */
  return {
    open,
    put,
    get,
    getAll,
    query,
    del,
    clear,
    count,
    onChange,
    exportJSON,
    importJSON,
    migrateFromPicWish,
    stats,
    STORES,
    DB_NAME,
    DB_VERSION
  };

})();

/* Rendre global pour les apps standalone HTML */
if (typeof window !== 'undefined') window.HCSHub = HCSHub;
