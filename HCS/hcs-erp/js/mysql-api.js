/* ================================================================
   HCS ERP — js/mysql-api.js
   Couche d'abstraction vers l'API PHP MySQL Planet Hoster.
   Expose window.MYSQL = new MySQLAPI()

   Interface identique à PocketBaseAPI (pocketbase.js)
   pour rendre les deux backends interchangeables.

   Endpoint : https://highcoffeeshirts.com/erp/api/
   ================================================================ */

'use strict';

class MySQLAPI {

  /**
   * @param {string} baseUrl  URL de base de l'API PHP
   * @param {string} apiKey   Valeur du header x-api-key
   */
  constructor(
    baseUrl = 'https://highcoffeeshirts.com/erp/api',
    apiKey  = 'hcs-erp-2026'
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey  = apiKey;
  }

  /* ----------------------------------------------------------------
     CRUD GÉNÉRIQUE — miroir exact de PocketBaseAPI
     ---------------------------------------------------------------- */

  /**
   * Récupère tous les enregistrements d'une table.
   * @param {string} table   Nom de la table MySQL
   * @param {Object} [opts]  { sort, order, limit, offset }
   * @returns {Promise<Array>}
   */
  async getAll(table, opts = {}) {
    const params = new URLSearchParams();
    if (opts.sort)   params.set('sort',   opts.sort);
    if (opts.order)  params.set('order',  opts.order);
    if (opts.limit)  params.set('limit',  opts.limit);
    if (opts.offset) params.set('offset', opts.offset);

    const qs  = params.toString();
    const url = `${this.baseUrl}/${encodeURIComponent(table)}${qs ? '?' + qs : ''}`;
    const data = await this._req('GET', url);

    /* L'API retourne { items: [...], table, limit, offset } */
    return data.items || [];
  }

  /**
   * Récupère un seul enregistrement par ID.
   * @param {string} table
   * @param {number|string} id
   * @returns {Promise<Object>}
   */
  async getOne(table, id) {
    const url = `${this.baseUrl}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    return this._req('GET', url);
  }

  /**
   * Crée un nouvel enregistrement.
   * @param {string} table
   * @param {Object} data   Champs à insérer
   * @returns {Promise<Object>}  L'enregistrement créé avec son ID MySQL
   */
  async create(table, data) {
    const url = `${this.baseUrl}/${encodeURIComponent(table)}`;
    return this._req('POST', url, data);
  }

  /**
   * Met à jour un enregistrement existant.
   * @param {string} table
   * @param {number|string} id
   * @param {Object} data   Champs à modifier
   * @returns {Promise<Object>}
   */
  async update(table, id, data) {
    const url = `${this.baseUrl}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    return this._req('PUT', url, data);
  }

  /**
   * Supprime un enregistrement.
   * @param {string} table
   * @param {number|string} id
   * @returns {Promise<null>}
   */
  async delete(table, id) {
    const url = `${this.baseUrl}/${encodeURIComponent(table)}/${encodeURIComponent(id)}`;
    return this._req('DELETE', url);
  }

  /**
   * Recherche full-text dans une table.
   * @param {string} table
   * @param {string} query   Terme à chercher
   * @returns {Promise<Array>}
   */
  async search(table, query) {
    if (!query) return this.getAll(table);
    const url  = `${this.baseUrl}/${encodeURIComponent(table)}/search?q=${encodeURIComponent(query)}`;
    const data = await this._req('GET', url);
    return data.items || [];
  }

  /* ----------------------------------------------------------------
     UTILITAIRES
     ---------------------------------------------------------------- */

  /**
   * Teste la connexion à l'API PHP.
   * @returns {Promise<{ok:boolean, message:string}>}
   */
  async ping() {
    try {
      /* On tente de lister les contacts (table toujours présente) */
      await this._req('GET', `${this.baseUrl}/contacts?limit=1`);
      return { ok: true, message: 'Connexion API MySQL OK' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  /* ----------------------------------------------------------------
     REQUÊTE INTERNE
     ---------------------------------------------------------------- */

  /**
   * Effectue une requête HTTP vers l'API PHP.
   * Ajoute automatiquement le header x-api-key.
   * @private
   */
  async _req(method, url, body = null) {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    this.apiKey,
      },
    };

    /* Ajout du corps JSON pour POST et PUT */
    if (body && method !== 'GET' && method !== 'DELETE') {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);

    /* DELETE réussit avec 204 (corps vide) */
    if (res.status === 204) return null;

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = json.error || json.message || `Erreur HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      err.data   = json;
      throw err;
    }

    return json;
  }
}

/* ----------------------------------------------------------------
   INSTANCE GLOBALE
   Utilisable partout dans l'ERP :
     MYSQL.getAll('contacts')
     MYSQL.create('devis', { client_nom: 'Dupont', montant: 15000 })
   ---------------------------------------------------------------- */
window.MYSQL = new MySQLAPI();
