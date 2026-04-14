/* ================================================================
   HCS ERP — apps/hcs-api-shared.js
   Couche partagée pour tous les outils du dossier apps/

   Usage (inclure avant votre script) :
     <script src="hcs-api-shared.js"></script>

   Puis :
     await HCSApi.save('logos', { nom_fichier: 'test.png', ... })
     await HCSApi.getRecent('assets', 10)
     await HCSApi.search('logos', 'Mairie')

   Gestion erreurs : fallback localStorage si API indisponible
   ================================================================ */

'use strict';

const HCSApi = (() => {

  const BASE_URL = 'https://highcoffeeshirts.com/erp/api';
  const API_KEY  = 'hcs-erp-2026';

  /* ── Requête HTTP interne ── */
  async function _req(method, path, body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    API_KEY,
      },
    };
    if (body && method !== 'GET' && method !== 'DELETE') {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${BASE_URL}${path}`, opts);
    if (res.status === 204) return null;
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json.error || json.message || `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  /* ── Clé localStorage de fallback ── */
  function _lsKey(table) { return `hcs_fallback_${table}`; }

  /* ── Sauvegarde dans localStorage (fallback) ── */
  function _lsSave(table, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(_lsKey(table)) || '[]');
      existing.unshift({ ...data, _id: Date.now(), _offline: true });
      if (existing.length > 50) existing.splice(50); /* Garder 50 max */
      localStorage.setItem(_lsKey(table), JSON.stringify(existing));
    } catch(e) { /* localStorage plein ou désactivé */ }
  }

  /* ── Lecture fallback localStorage ── */
  function _lsGet(table, limit = 10) {
    try {
      return JSON.parse(localStorage.getItem(_lsKey(table)) || '[]').slice(0, limit);
    } catch(e) { return []; }
  }

  /* ====================================================
     API PUBLIQUE
     ==================================================== */
  return {

    /**
     * Sauvegarde un enregistrement dans une table.
     * Fallback automatique vers localStorage si API indisponible.
     * @param {string} table   Nom de la table (logos, assets, calculs, …)
     * @param {Object} data    Données à insérer
     * @returns {Promise<{ok:boolean, data:Object, offline:boolean}>}
     */
    async save(table, data) {
      try {
        const result = await _req('POST', `/${encodeURIComponent(table)}`, data);
        return { ok: true, data: result, offline: false };
      } catch(e) {
        /* Fallback localStorage si API hors ligne */
        _lsSave(table, data);
        console.warn(`[HCSApi] API indisponible (${e.message}) — sauvegarde locale`);
        return { ok: false, data: null, offline: true, error: e.message };
      }
    },

    /**
     * Récupère les N derniers enregistrements d'une table.
     * Fallback localStorage si API indisponible.
     * @param {string} table
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getRecent(table, limit = 10) {
      try {
        const data = await _req('GET', `/${encodeURIComponent(table)}?sort=id&order=DESC&limit=${limit}`);
        return data?.items || [];
      } catch(e) {
        console.warn(`[HCSApi] API indisponible — lecture fallback localStorage`);
        return _lsGet(table, limit);
      }
    },

    /**
     * Recherche full-text dans une table.
     * @param {string} table
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async search(table, query) {
      try {
        if (!query) return this.getRecent(table, 50);
        const data = await _req('GET', `/${encodeURIComponent(table)}/search?q=${encodeURIComponent(query)}`);
        return data?.items || [];
      } catch(e) {
        console.warn(`[HCSApi] Recherche indisponible`);
        return [];
      }
    },

    /**
     * Récupère un enregistrement par ID.
     * @param {string} table
     * @param {number|string} id
     * @returns {Promise<Object|null>}
     */
    async getOne(table, id) {
      try {
        return await _req('GET', `/${encodeURIComponent(table)}/${encodeURIComponent(id)}`);
      } catch(e) { return null; }
    },

    /**
     * Mise à jour d'un enregistrement.
     * @param {string} table
     * @param {number|string} id
     * @param {Object} data
     * @returns {Promise<Object|null>}
     */
    async update(table, id, data) {
      try {
        return await _req('PUT', `/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, data);
      } catch(e) { return null; }
    },

    /**
     * Teste la connexion à l'API.
     * @returns {Promise<boolean>}
     */
    async ping() {
      try {
        await _req('GET', '/contacts?limit=1');
        return true;
      } catch(e) { return false; }
    },

    /* Utilitaires d'affichage */

    /**
     * Génère le HTML d'un mini-badge "Sauvegardé".
     * @param {boolean} offline  true si sauvegardé hors-ligne
     * @returns {string}  HTML du badge
     */
    badgeHtml(offline = false) {
      if (offline) {
        return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;
          padding:3px 8px;border-radius:6px;background:rgba(251,191,36,0.12);
          color:#fbbf24;border:1px solid rgba(251,191,36,0.3);">
          💾 Hors-ligne
        </span>`;
      }
      return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;
        padding:3px 8px;border-radius:6px;background:rgba(74,222,128,0.12);
        color:#4ade80;border:1px solid rgba(74,222,128,0.3);">
        ✓ Sauvegardé
      </span>`;
    },

    /**
     * Affiche un toast de confirmation dans un conteneur donné.
     * @param {string} containerId  ID de l'élément où afficher le badge
     * @param {boolean} offline
     */
    showSavedBadge(containerId, offline = false) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = this.badgeHtml(offline);
      el.style.display = 'inline-block';
      setTimeout(() => { el.style.display = 'none'; }, 4000);
    },

    /**
     * Rendu HTML d'une liste d'historique.
     * @param {Array}  items          Tableau d'enregistrements
     * @param {Object} opts           { labelKey, subKey, dateKey, badgeKey }
     * @returns {string}  HTML
     */
    renderHistory(items, opts = {}) {
      const { labelKey = 'nom', subKey = null, dateKey = 'date', badgeKey = null } = opts;
      if (!items || items.length === 0) {
        return '<p style="color:#555;font-size:11px;text-align:center;padding:12px;">Aucun enregistrement.</p>';
      }
      return items.map(item => {
        const label = item[labelKey] || '—';
        const sub   = subKey ? (item[subKey] || '') : '';
        const date  = dateKey ? (item[dateKey] || '') : '';
        const badge = badgeKey ? (item[badgeKey] || '') : '';
        const isOffline = !!item._offline;
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #1a1a1a;">
          <div style="width:7px;height:7px;border-radius:50%;background:${isOffline?'#fbbf24':'#4ade80'};flex-shrink:0;margin-top:4px;"></div>
          <div style="flex:1;min-width:0;">
            <p style="font-size:12px;color:#e5e5e5;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 2px;">${_escHtml(label)}</p>
            ${sub ? `<p style="font-size:10px;color:#555;margin:0;">${_escHtml(sub)}</p>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0;">
            ${badge ? `<span style="font-size:9px;padding:1px 6px;border-radius:8px;background:rgba(255,107,0,0.1);color:#FF6B00;display:block;margin-bottom:2px;">${_escHtml(badge)}</span>` : ''}
            <span style="font-size:9px;color:#555;">${_escHtml(date)}</span>
          </div>
        </div>`;
      }).join('');
    },

  };

  /* Helper privé */
  function _escHtml(s) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s || '')));
    return d.innerHTML;
  }

})();

/* Expose en global pour compatibilité avec les outils existants */
window.HCSApi = HCSApi;
