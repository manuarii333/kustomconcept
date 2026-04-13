/* ================================================================
   HCS ERP — pocketbase.js
   Couche d'abstraction vers PocketBase (http://127.0.0.1:8090).
   Expose window.PB = new PocketBaseAPI() utilisable dans tout l'ERP.
   ================================================================ */

'use strict';

class PocketBaseAPI {

  constructor(baseUrl = 'http://127.0.0.1:8090') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this._token  = null;  // JWT admin si authentifié
  }

  /* ----------------------------------------------------------------
     AUTHENTIFICATION ADMIN (optionnel — si les collections sont
     en accès public, inutile)
     ---------------------------------------------------------------- */

  /**
   * Authentifie un admin PocketBase.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{token, admin}>}
   */
  async authAdmin(email, password) {
    const res = await this._req('POST', '/api/admins/auth-with-password', {
      identity: email,
      password
    });
    this._token = res.token;
    return res;
  }

  /** Supprime le token courant */
  logout() {
    this._token = null;
  }

  /* ----------------------------------------------------------------
     CRUD GÉNÉRIQUE — collections
     ---------------------------------------------------------------- */

  /**
   * Récupère tous les enregistrements d'une collection.
   * Gère la pagination automatiquement (perPage 500 max).
   * @param {string} collection  Nom de la collection PocketBase
   * @param {Object} [opts]      { filter, sort, expand, page, perPage }
   * @returns {Promise<Array>}
   */
  async getAll(collection, opts = {}) {
    const {
      filter  = '',
      sort    = '-created',
      expand  = '',
      page    = 1,
      perPage = 500
    } = opts;

    const params = new URLSearchParams({ page, perPage, sort });
    if (filter) params.set('filter', filter);
    if (expand) params.set('expand', expand);

    const data = await this._req(
      'GET',
      `/api/collections/${encodeURIComponent(collection)}/records?${params}`
    );
    return data.items || [];
  }

  /**
   * Récupère un seul enregistrement par ID.
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getOne(collection, id) {
    return this._req(
      'GET',
      `/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`
    );
  }

  /**
   * Crée un nouvel enregistrement.
   * @param {string} collection
   * @param {Object} data
   * @returns {Promise<Object>}  L'enregistrement créé avec son ID PocketBase
   */
  async create(collection, data) {
    return this._req(
      'POST',
      `/api/collections/${encodeURIComponent(collection)}/records`,
      data
    );
  }

  /**
   * Met à jour un enregistrement existant (PATCH partiel).
   * @param {string} collection
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(collection, id, data) {
    return this._req(
      'PATCH',
      `/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`,
      data
    );
  }

  /**
   * Supprime un enregistrement.
   * @param {string} collection
   * @param {string} id
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    return this._req(
      'DELETE',
      `/api/collections/${encodeURIComponent(collection)}/records/${encodeURIComponent(id)}`
    );
  }

  /**
   * Recherche full-text dans une collection.
   * Cherche dans tous les champs texte via le filtre PocketBase.
   * @param {string} collection
   * @param {string} query        Terme de recherche
   * @param {string[]} [fields]   Champs à fouiller (défaut : ['nom','name','title'])
   * @returns {Promise<Array>}
   */
  async search(collection, query, fields = ['nom', 'name', 'title', 'label']) {
    if (!query) return this.getAll(collection);
    const filter = fields
      .map(f => `${f}~"${query.replace(/"/g, '\\"')}"`)
      .join('||');
    return this.getAll(collection, { filter });
  }

  /* ----------------------------------------------------------------
     UTILITAIRES
     ---------------------------------------------------------------- */

  /**
   * Teste la connexion à PocketBase.
   * @returns {Promise<{ok:boolean, version:string, message:string}>}
   */
  async ping() {
    try {
      const data = await this._req('GET', '/api/health');
      return { ok: true, version: data.version || '?', message: 'Connexion OK' };
    } catch (err) {
      return { ok: false, version: null, message: err.message };
    }
  }

  /**
   * Retourne la liste des collections disponibles.
   * Nécessite un token admin.
   * @returns {Promise<Array>}
   */
  async listCollections() {
    const data = await this._req('GET', '/api/collections?perPage=200');
    return data.items || [];
  }

  /* ----------------------------------------------------------------
     REQUÊTE INTERNE
     ---------------------------------------------------------------- */

  /**
   * Effectue une requête HTTP vers PocketBase.
   * @private
   */
  async _req(method, path, body = null) {
    const url  = `${this.baseUrl}${path}`;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (this._token) {
      opts.headers['Authorization'] = `Bearer ${this._token}`;
    }

    if (body && method !== 'GET' && method !== 'DELETE') {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);

    /* DELETE réussit avec 204 (corps vide) */
    if (res.status === 204) return null;

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = json.message || json.error || `Erreur HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data   = json.data || {};
      throw err;
    }

    return json;
  }
}

/* ----------------------------------------------------------------
   INSTANCE GLOBALE
   Utilisable partout dans l'ERP : PB.getAll('contacts'), etc.
   ---------------------------------------------------------------- */
window.PB = new PocketBaseAPI();
