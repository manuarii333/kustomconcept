/* ================================================================
   HCS ERP — js/modules/sales.js
   Module Ventes : Devis (quotes), Commandes (orders),
   Factures (invoices), Rapport de ventes (sales-report).
   Exporté via window.Sales — initialisé par app.js via Sales.init()
   ================================================================ */

'use strict';

const Sales = (() => {

  /* ----------------------------------------------------------------
     ÉTAT INTERNE — navigation liste ↔ formulaire
     ---------------------------------------------------------------- */
  const _state = {
    view:      'quotes',  // vue active
    mode:      'list',    // 'list' | 'form'
    listMode:  'list',    // 'list' | 'kanban'
    currentId: null,      // id du document en cours d'édition
    lignes:    [],        // lignes du formulaire courant
    paiements: []         // paiements de la facture courante
  };

  /* Lignes de règlement du devis en cours (multi-mode/montant) */
  let _paiementsDevis = []; // [{mode, montant}]
  let _mockupUrls     = []; // [{dataUrl, nom, date, source}] — mockups projet en cours d'édition
  const REG_ICONS = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦', 'Chèque': '📋' };
  const REG_MODES = ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'];

  /* ----------------------------------------------------------------
     CONSTANTES MÉTIER
     ---------------------------------------------------------------- */

  const STATUTS_DEVIS = ['Brouillon', 'Envoyé', 'Confirmé', 'Annulé'];

  const STATUTS_CMD = [
    'Brouillon', 'Confirmé', 'En production', 'Prêt', 'Livré', 'Terminé'
  ];

  const STATUTS_FAC = [
    'Brouillon', 'Envoyé', 'Payé partiel', 'Payé', 'En retard', 'Annulé'
  ];

  const BADGE_DEVIS = {
    'Brouillon': 'badge-gray',
    'Envoyé':    'badge-blue',
    'Confirmé':  'badge-green',
    'Annulé':    'badge-red'
  };

  const BADGE_CMD = {
    'Brouillon':     'badge-gray',
    'Confirmé':      'badge-blue',
    'En production': 'badge-orange',
    'Prêt':          'badge-violet',
    'Livré':         'badge-green',
    'Terminé':       'badge-green'
  };

  const BADGE_FAC = {
    'Brouillon':    'badge-gray',
    'Envoyé':       'badge-blue',
    'Payé partiel': 'badge-orange',
    'Payé':         'badge-green',
    'En retard':    'badge-red',
    'Annulé':       'badge-red'
  };

  const METHODES_PAIEMENT = ['Espèces', 'Carte bancaire', 'Virement', 'Chèque'];

  const STATUTS_BL = ['En attente', 'Reçu partiel', 'Reçu complet', 'Annulé'];

  const BADGE_BL = {
    'En attente':    'badge-gray',
    'Reçu partiel':  'badge-orange',
    'Reçu complet':  'badge-green',
    'Annulé':        'badge-red'
  };

  const TYPES_PAIEMENT = ['Acompte', 'Paiement', 'Solde'];

  /* Types de clients */
  const CLIENT_TYPES = [
    'Particulier', 'Entreprise', 'Association', 'CE',
    'Club de sport', 'Administration', 'Touriste'
  ];

  /* Îles de Polynésie française */
  const ILES_PF = [
    'Tahiti', 'Moorea', 'Bora Bora', 'Huahine', 'Raiatea',
    'Tahaa', 'Maupiti', 'Rangiroa', 'Fakarava', 'Tikehau',
    'Nuku Hiva', 'Hiva Oa', 'Papeete', 'Autre'
  ];

  /* ----------------------------------------------------------------
     UTILITAIRES INTERNES
     ---------------------------------------------------------------- */

  /** Échappe le HTML pour éviter les injections */
  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Génère un badge HTML */
  function _badge(statut, map) {
    const cls = map[statut] || 'badge-gray';
    return `<span class="badge ${cls}">${_esc(statut || '—')}</span>`;
  }

  /** Calcule HT / TVA (16% produits, 13% services) / TTC depuis les lignes */
  function _calcTotaux(lignes) {
    let totalHT  = 0;
    let totalTVA = 0;
    (lignes || []).forEach(l => {
      const brut   = (l.qte || 0) * (l.prixUnitaire || 0);
      const remise = brut * ((l.remise || 0) / 100);
      const ht     = brut - remise;
      /* tauxTVA stocké en % (16 ou 13), défaut 16 pour les produits */
      const taux   = ((l.tauxTVA !== undefined ? l.tauxTVA : 16)) / 100;
      totalHT  += ht;
      totalTVA += ht * taux;
    });
    return {
      totalHT:  Math.round(totalHT),
      totalTVA: Math.round(totalTVA),
      totalTTC: Math.round(totalHT + totalTVA)
    };
  }

  /** Somme des paiements enregistrés */
  function _totalPaiements(paiements) {
    return (paiements || []).reduce((s, p) => s + (p.montant || 0), 0);
  }

  /** Sauvegarde un document HTML dans le dossier Dropbox du client + log ERP */
  async function _sauverDocDropbox(client, filename, htmlContent, type) {
    if (!client) return;
    try {
      const res = await fetch('http://localhost:7879/save-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, filename, content_html: htmlContent })
      });
      const data = await res.json();
      if (data.ok) {
        toast(`📁 Dropbox : ${filename}`, 'info');
        fetch('https://highcoffeeshirts.com/erp/api/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': localStorage.getItem('hcs_api_key') || 'hcs-erp-2026' },
          body: JSON.stringify({
            nom: filename, client, type,
            url: data.path,
            date: new Date().toISOString().slice(0, 10)
          })
        }).catch(() => {});
      }
    } catch (_) { /* serveur non démarré — silencieux */ }
  }

  /** Nettoie un nom pour un nom de fichier valide */
  function _safeFilename(s) {
    return (s || '').replace(/[\\/:*?"<>|]/g, '').trim().replace(/\s+/g, '_');
  }

  /** Picker position atelier — affiche un modal de sélection rapide
   *  positions : tableau de strings OU d'objets {nom, taille, prix} */
  function _showPositionPicker(positions, callback) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';

    const items = positions.map(pos => {
      const nom    = typeof pos === 'object' ? pos.nom    : pos;
      const taille = typeof pos === 'object' ? pos.taille : '';
      const prix   = typeof pos === 'object' && pos.prix  ? pos.prix : null;
      const prixStr = prix ? ` — ${prix.toLocaleString('fr-FR')} XPF` : '';
      return `
      <button class="pos-pick-btn" data-pos="${_esc(nom)}" data-prix="${prix || ''}"
        style="display:flex;align-items:center;justify-content:space-between;width:100%;text-align:left;
          background:var(--bg-surface);border:1px solid var(--border);border-radius:8px;
          padding:10px 14px;font-size:13px;color:var(--text-primary);cursor:pointer;
          transition:border .15s,background .15s;">
        <span>${_esc(nom)}</span>
        ${taille ? `<span style="font-size:11px;color:var(--text-muted);">${_esc(taille)}${prixStr}</span>` : ''}
      </button>`;
    }).join('');

    overlay.innerHTML = `
      <div style="background:var(--bg-card);border-radius:16px;max-width:420px;width:100%;
        box-shadow:0 8px 40px rgba(0,0,0,.4);overflow:hidden;">
        <div style="background:var(--bg-elevated);padding:14px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);">
          <span style="font-size:18px;">📍</span>
          <div>
            <div style="font-weight:700;font-size:14px;color:var(--text-primary);">Position atelier</div>
            <div style="font-size:11px;color:var(--text-muted);">Choisir l'emplacement du visuel sur le vêtement</div>
          </div>
          <button id="pos-close" style="margin-left:auto;background:rgba(255,255,255,.1);border:none;
            color:var(--text-secondary);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:13px;">✕</button>
        </div>
        <div style="padding:16px;display:flex;flex-direction:column;gap:8px;max-height:60vh;overflow-y:auto;">
          ${items}
        </div>
        <div style="padding:10px 16px;border-top:1px solid var(--border);text-align:right;">
          <button id="pos-skip" style="background:transparent;border:none;color:var(--text-muted);
            font-size:12px;cursor:pointer;text-decoration:underline;">Ignorer pour l'instant</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    overlay.querySelectorAll('.pos-pick-btn').forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'var(--bg-elevated)';
        btn.style.borderColor = 'var(--accent-blue)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'var(--bg-surface)';
        btn.style.borderColor = 'var(--border)';
      });
      btn.addEventListener('click', () => {
        overlay.remove();
        callback({ pos: btn.dataset.pos, prix: btn.dataset.prix ? parseInt(btn.dataset.prix, 10) : null });
      });
    });

    overlay.querySelector('#pos-close')?.addEventListener('click', () => { overlay.remove(); callback(null); });
    overlay.querySelector('#pos-skip')?.addEventListener('click', () => { overlay.remove(); callback(null); });
  }

  /** Crée le dossier Dropbox client du mois en cours (silencieux si serveur absent) */
  async function _createDropboxFolder(clientName) {
    if (!clientName) return;
    try {
      const res = await fetch('http://localhost:7879/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: clientName })
      });
      const data = await res.json();
      if (data.created) toast(`📁 Dossier Dropbox créé : ${clientName}`, 'info');
    } catch (_) { /* serveur non démarré — silencieux */ }
  }

  /** Nom d'un contact depuis son id */
  function _contactNom(contactId) {
    const c = Store.getById('contacts', contactId);
    return c ? c.nom : (contactId || '—');
  }

  /** Options <option> pour le select de produits (dans les lignes) — exclut les archivés */
  function _produitOptions(selectedId) {
    const produits = Store.getAll('produits');
    return `<option value="">— Produit / Service —</option>` +
      produits.map(p =>
        `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${_esc(p.emoji || '')} ${_esc(p.nom)}</option>`
      ).join('');
  }

  /**
   * Flux tendu — à la confirmation du devis, crée une réservation fournisseur local
   * pour TOUTES les lignes (on réserve la quantité exacte demandée, peu importe le stock).
   */
  function _creerReservationFournisseur(devis) {
    const lignesReservation = (devis.lignes || [])
      .filter(l => l.produitId && (l.qte || 0) > 0)
      .map(l => {
        const produit = Store.getById('produits', l.produitId) || {};
        return {
          produitId:    l.produitId,
          description:  `[RÉS] ${l.description || produit.nom || l.produitId}`,
          qte:          l.qte,
          prixUnitaire: produit.cout || l.prixUnitaire || 0,
          remise:       0,
          taille:       l.taille       || '',
          couleur:      l.couleur      || '',
          technique:    l.technique    || ''
        };
      });

    if (lignesReservation.length === 0) return;

    /* Fournisseur local : premier de la liste ou "À définir" */
    const fournisseurs = Store.getAll('fournisseurs');
    const fourLocal    = fournisseurs[0] || null;
    const ref          = _genRef('RES', 'bonsAchat');

    Store.create('bonsAchat', {
      ref,
      _type:               'Réservation',
      fournisseur:         fourLocal ? fourLocal.nom : 'Fournisseur local',
      fournisseurId:       fourLocal ? fourLocal.id  : '',
      date:                new Date().toISOString().slice(0, 10),
      dateLivraisonPrevue: '',
      statut:              'Réservation',
      devisOrigineId:      devis.id,
      devisOrigineRef:     devis.ref,
      notes:               `Réservation stock fournisseur local — ${devis.ref} — ${devis.client}`,
      lignes:              lignesReservation
    });

    toast(
      `📦 Réservation ${ref} créée chez ${fourLocal ? fourLocal.nom : 'fournisseur local'} (${lignesReservation.length} article(s))`,
      'success',
      6000
    );

    Store.addAuditLog(
      'reservation_fournisseur',
      'sales',
      { ref: devis.ref, bonRef: ref, detail: `${lignesReservation.length} article(s) réservé(s) — flux tendu` }
    );
  }

  /** Génère le prochain numéro de document */
  function _genRef(prefix, serie) {
    const n = Store.nextCounter(serie);
    return `${prefix}-${new Date().getFullYear()}-${String(n).padStart(5, '0')}`;
  }

  /** Formate un montant (utilise fmt() de utils.js) */
  function _fmt(v) {
    return typeof fmt === 'function' ? fmt(v || 0) : (v || 0) + ' XPF';
  }

  /** Formate une date (utilise fmtDate() de utils.js) */
  function _fmtDate(d) {
    return typeof fmtDate === 'function' ? fmtDate(d) : (d || '—');
  }

  /* ----------------------------------------------------------------
     NAVIGATION INTERNE liste ↔ formulaire
     ---------------------------------------------------------------- */

  /** Revenir à la liste d'une vue */
  function _goList(view, toolbar, area) {
    _state.mode      = 'list';
    _state.currentId = null;
    _state.lignes    = [];
    _state.paiements = [];
    init(toolbar, area, view);
  }

  /** Ouvrir le formulaire d'un document */
  function _goForm(view, id, toolbar, area) {
    _state.mode      = 'form';
    _state.currentId = id;
    init(toolbar, area, view);
  }

  /* ================================================================
     TABLE DE LIGNES RÉUTILISABLE
     Partagée entre Devis, Commandes, Factures
     ================================================================ */

  /**
   * Copie les attributs d'une variante dans les champs de la ligne du devis.
   * - Attributs connus (taille, couleur, coupe…) → champs directs (insensible à la casse)
   * - Attributs personnalisés (ex: Format Thermocollant) → notes_design
   */
  function _copyVarianteFields(variante, idx) {
    const SKIP = new Set(['ref', 'prix', 'cout', 'quantite', 'customDims']);
    /* Mapping insensible à la casse vers les champs de la ligne */
    const KNOWN = {
      taille: 'taille', size: 'taille',
      couleur: 'couleur', color: 'couleur', colour: 'couleur',
      coupe: 'technique',
      technique: 'technique',
      emplacement: 'emplacement', placement: 'emplacement',
    };
    const custom = [];

    Object.keys(variante).forEach(k => {
      if (SKIP.has(k) || !variante[k]) return;
      const target = KNOWN[k.toLowerCase()];
      if (target) {
        _state.lignes[idx][target] = variante[k];
      } else {
        custom.push(`${k}: ${variante[k]}`);
      }
    });

    /* Attributs non reconnus (ex: Format Thermocollant, Aspect) → notes_design */
    if (custom.length) {
      _state.lignes[idx].notes_design = custom.join(' — ');
    }
  }

  /** Parse un CSV texte en tableau d'objets (gère les champs entre guillemets) */
  function _parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const fields = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (ch === ',' && !inQ) {
          fields.push(cur); cur = '';
        } else {
          cur += ch;
        }
      }
      fields.push(cur);
      return fields;
    };

    const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    return lines.slice(1).map(line => {
      const vals = parseLine(line);
      const row = {};
      headers.forEach((h, j) => { row[h] = (vals[j] || '').trim(); });
      return row;
    }).filter(r => Object.values(r).some(v => v));
  }

  /** Ouvre un sélecteur de fichier CSV et importe les lignes dans le devis courant */
  function _importCSVLignes() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';

    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const rows = _parseCSV(e.target.result);
        if (!rows.length) { toast('CSV vide ou format invalide.', 'error'); return; }

        const allProduits = Store.getAll('produits');

        /* Correspondance nom CSV → produitId (fuzzy) */
        const _matchProduit = (nom) => {
          if (!nom) return '';
          const n = nom.toLowerCase();
          const found = allProduits.find(p => {
            const pn = (p.nom || '').toLowerCase();
            return pn === n || n.includes(pn) || pn.split(' ').some(w => w.length > 3 && n.includes(w));
          });
          return found ? found.id : '';
        };

        let added = 0;
        rows.forEach(row => {
          const nomProduit  = row.produit || row.designation || row.article || '';
          const description = row.description || nomProduit;
          const qte         = parseInt(row.quantite || row.qte || row.qt_ || 1) || 1;
          const prix        = parseFloat(row.prix_unitaire_ht || row.prix_ht || row.prix || 0) || 0;
          const remise      = parseFloat(row.remise_pct || row.remise || 0) || 0;
          const tva         = parseInt(row.tva_pct || row.tva || 16) || 16;
          const produitId   = _matchProduit(nomProduit);

          _state.lignes.push({
            produitId, description, qte,
            prixUnitaire: prix, remise, tauxTVA: tva,
            taille: '', couleur: '', technique: '', emplacement: '', notes_design: ''
          });
          added++;
        });

        _refreshLineTable();
        toast(`✅ ${added} ligne(s) importée(s) depuis CSV.`, 'success');
      };

      reader.readAsText(file, 'UTF-8');
    };

    input.click();
  }

  /** Génère le HTML complet de la table de lignes */
  function _renderLineTable(lignes) {
    return `
      <div class="line-table-wrapper">
        <table class="line-table">
          <thead>
            <tr>
              <th style="width:210px;">Produit</th>
              <th>Description</th>
              <th class="col-num" style="width:90px;">Qté</th>
              <th class="col-num" style="width:120px;">Prix HT</th>
              <th class="col-num" style="width:72px;">Remise %</th>
              <th class="col-num" style="width:70px;">TVA %</th>
              <th class="col-num" style="width:120px;">Sous-total</th>
              <th style="width:36px;"></th>
            </tr>
          </thead>
          <tbody id="line-tbody">
            ${lignes.map((l, i) => _renderLineRow(l, i)).join('')}
          </tbody>
        </table>
        <div style="padding:8px 12px;display:flex;gap:8px;align-items:center;">
          <button class="btn-add-line" id="btn-add-line">+ Ajouter une ligne</button>
          <button class="btn btn-ghost btn-sm" id="btn-import-csv-lignes"
            title="Importer des lignes depuis un fichier CSV"
            style="font-size:12px;padding:4px 10px;">
            📥 Importer CSV
          </button>
        </div>
      </div>`;
  }

  /** Génère le HTML d'une ligne (avec variantes textile + design) */
  function _renderLineRow(l, i) {
    const sousTotal = Math.round(
      (l.qte || 0) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100)
    );

    /* Vérifier si le produit sélectionné a des variantes */
    const produitLigne = l.produitId ? Store.getById('produits', l.produitId) : null;
    const hasVariantes = produitLigne && (produitLigne.variantes || []).length > 0;

    return `
      <tr data-line="${i}">
        <td>
          <select class="line-input" data-field="produitId" data-line="${i}">
            ${_produitOptions(l.produitId)}
          </select>
          ${hasVariantes ? `<button class="btn btn-ghost btn-sm" data-pick-variante="${i}"
            title="Choisir une variante"
            style="margin-top:3px;font-size:10px;padding:2px 6px;width:100%;justify-content:center;">
            ⚡ Variantes
          </button>` : ''}
        </td>
        <td>
          <input type="text" class="line-input" data-field="description"
            data-line="${i}" value="${_esc(l.description || '')}"
            placeholder="Description…"
            title="${_esc(l.description || '')}"
            style="width:100%;font-style:${l.description ? 'normal' : 'italic'};" />
          <!-- Variantes textile -->
          <div style="display:flex;gap:4px;margin-top:3px;flex-wrap:wrap;">
            <input type="text" class="line-input" data-field="taille" data-line="${i}"
              value="${_esc(l.taille || '')}" placeholder="Taille"
              style="width:60px;height:22px;font-size:11px;padding:0 4px;background:${l.taille ? '#EEF2FF' : 'transparent'};" />
            <input type="text" class="line-input" data-field="couleur" data-line="${i}"
              value="${_esc(l.couleur || '')}" placeholder="Couleur"
              style="width:70px;height:22px;font-size:11px;padding:0 4px;background:${l.couleur ? '#EEF2FF' : 'transparent'};" />
            <input type="text" class="line-input" data-field="technique" data-line="${i}"
              value="${_esc(l.technique || '')}" placeholder="Technique"
              style="width:70px;height:22px;font-size:11px;padding:0 4px;background:${l.technique ? '#EEF2FF' : 'transparent'};" />
            <input type="text" class="line-input" data-field="emplacement" data-line="${i}"
              value="${_esc(l.emplacement || '')}" placeholder="Emplac."
              style="width:65px;height:22px;font-size:11px;padding:0 4px;background:${l.emplacement ? '#FFF7ED' : 'transparent'};" />
            <input type="text" class="line-input" data-field="notes_design" data-line="${i}"
              value="${_esc(l.notes_design || '')}" placeholder="Notes design"
              style="flex:1;min-width:80px;height:22px;font-size:11px;padding:0 4px;background:${l.notes_design ? '#FFF7ED' : 'transparent'};" />
          </div>
        </td>
        <td>
          <input type="text" inputmode="numeric" pattern="[0-9]*" class="line-input num-input" data-field="qte"
            data-line="${i}" value="${l.qte || 1}" />
        </td>
        <td>
          <input type="number" class="line-input num-input" data-field="prixUnitaire"
            data-line="${i}" value="${l.prixUnitaire || 0}" min="0" step="1" />
        </td>
        <td>
          <input type="number" class="line-input num-input" data-field="remise"
            data-line="${i}" value="${l.remise || 0}" min="0" max="100" step="0.5" />
        </td>
        <td>
          <select class="line-input" data-field="tauxTVA" data-line="${i}"
            style="width:65px;font-size:12px;">
            <option value="16" ${(l.tauxTVA === undefined || l.tauxTVA == 16) ? 'selected' : ''}>16%</option>
            <option value="13" ${l.tauxTVA == 13 ? 'selected' : ''}>13%</option>
            <option value="5"  ${l.tauxTVA == 5  ? 'selected' : ''}>5%</option>
          </select>
        </td>
        <td class="col-num line-sous-total" data-line="${i}">
          ${_fmt(sousTotal)}
        </td>
        <td>
          <button class="btn-remove-line" data-remove="${i}" title="Supprimer la ligne">✕</button>
        </td>
      </tr>`;
  }

  /** Calcule la TVA par taux depuis les lignes */
  function _calcTVAParTaux(lignes) {
    let tva16 = 0, tva13 = 0, tva5 = 0;
    (lignes || []).forEach(l => {
      const brut = (l.qte || 0) * (l.prixUnitaire || 0);
      const ht   = brut * (1 - (l.remise || 0) / 100);
      const taux = Number(l.tauxTVA !== undefined ? l.tauxTVA : 16);
      if (taux === 13)     tva13 += ht * 0.13;
      else if (taux === 5) tva5  += ht * 0.05;
      else                 tva16 += ht * 0.16;
    });
    return { tva16: Math.round(tva16), tva13: Math.round(tva13), tva5: Math.round(tva5) };
  }

  /** Bloc totaux HT / TVA 16% / TVA 13% / TTC */
  function _renderTotalsBlock(lignes) {
    const { totalHT, totalTVA, totalTTC } = _calcTotaux(lignes);
    const { tva16, tva13, tva5 } = _calcTVAParTaux(lignes);
    /* N'afficher que les lignes TVA dont le montant est > 0 */
    const row16 = tva16 > 0 ? `
        <div class="total-row">
          <span class="total-label">TVA 16% (produits)</span>
          <span class="total-value" id="t-tva16">${_fmt(tva16)}</span>
        </div>` : `<div id="t-tva16" style="display:none;"></div>`;
    const row13 = tva13 > 0 ? `
        <div class="total-row">
          <span class="total-label">TVA 13% (services)</span>
          <span class="total-value" id="t-tva13">${_fmt(tva13)}</span>
        </div>` : `<div id="t-tva13" style="display:none;"></div>`;
    const row5 = tva5 > 0 ? `
        <div class="total-row">
          <span class="total-label">TVA 5%</span>
          <span class="total-value" id="t-tva5">${_fmt(tva5)}</span>
        </div>` : `<div id="t-tva5" style="display:none;"></div>`;
    return `
      <div class="line-table-totals" id="totals-block">
        <div class="total-row">
          <span class="total-label">Sous-total HT</span>
          <span class="total-value" id="t-ht">${_fmt(totalHT)}</span>
        </div>
        ${row16}${row13}${row5}
        <div class="total-row" style="border-top:1px dashed var(--border);margin-top:2px;padding-top:4px;">
          <span class="total-label">Total TVA</span>
          <span class="total-value" id="t-tva">${_fmt(totalTVA)}</span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">TOTAL TTC</span>
          <span class="total-value" id="t-ttc">${_fmt(totalTTC)}</span>
        </div>
      </div>`;
  }

  /** Lie les événements sur la table de lignes (délégation) */
  function _bindLineTableEvents() {
    /* Ajouter une ligne vide */
    document.getElementById('btn-add-line')?.addEventListener('click', () => {
      _state.lignes.push({ produitId: '', description: '', qte: 1, prixUnitaire: 0, remise: 0, tauxTVA: 16, taille: '', couleur: '', technique: '', emplacement: '', notes_design: '' });
      _refreshLineTable();
    });

    /* Import CSV */
    document.getElementById('btn-import-csv-lignes')?.addEventListener('click', _importCSVLignes);

    const tbody = document.getElementById('line-tbody');
    if (!tbody) return;

    /* Sélection produit → auto-remplissage description + prix */
    tbody.addEventListener('change', (e) => {
      const el  = e.target;
      const idx = parseInt(el.dataset.line, 10);
      if (isNaN(idx) || !el.dataset.field) return;

      if (el.dataset.field === 'produitId') {
        const produit = Store.getById('produits', el.value);
        if (produit) {
          _state.lignes[idx].produitId    = el.value;
          _state.lignes[idx].prixUnitaire = produit.prix || 0;
          /* TVA : champ tva du produit > règle catégorie */
          _state.lignes[idx].tauxTVA = (produit.tva !== undefined) ? Number(produit.tva) :
            (/^services?$/i.test(produit.categorie || '') ? 13 : 16);
          /* Description : nom du produit + description courte si dispo */
          const descParts = [produit.nom];
          if (produit.description) descParts.push(produit.description);
          _state.lignes[idx].description = descParts.join(' — ');
          _applyPalierPrix(idx);
          _refreshLineTable();
          /* Auto-ouvrir le picker variantes puis position atelier */
          const hasVariantes = (produit.variantes || []).length > 0 &&
            typeof Inventory !== 'undefined' && Inventory.showVariantePicker;
          const hasPositions = (produit.positionsAtelier || []).length > 0;

          const _openPositionPicker = () => {
            if (!hasPositions) return;
            _showPositionPicker(produit.positionsAtelier, (result) => {
              if (!result) return;
              const position = result.pos || result;
              const posPrix  = result.prix || null;
              _state.lignes[idx].positionAtelier = position;
              const base = _state.lignes[idx].description || produit.nom;
              if (!base.includes(position)) {
                _state.lignes[idx].description = `${base} | pos: ${position}`;
              }
              if (posPrix) _state.lignes[idx].prixUnitaire = posPrix;
              _refreshLineTable();
            });
          };

          if (hasVariantes) {
            Inventory.showVariantePicker(produit, (variante, descriptionAuto) => {
              if (!variante) return;
              _copyVarianteFields(variante, idx);
              /* Prix = base + incrément attrPrix si configuré, sinon prix variante */
              let _prixFinal = variante.prix || produit.prix || 0;
              let _coutFinal = variante.cout || produit.cout || 0;
              if (produit.attrPrix && (produit.attrIncrements || produit.attrCouts)) {
                const _needle = (produit.attrPrix).toLowerCase().replace(/_/g, ' ');
                const _varKey = Object.keys(variante).find(k => k.toLowerCase() === _needle);
                const _attrVal = _varKey ? variante[_varKey] : undefined;
                if (_attrVal !== undefined) {
                  const _normVal = String(_attrVal).replace(/×/g, 'x');
                  if (produit.attrIncrements) {
                    const _incrKey = Object.keys(produit.attrIncrements).find(k =>
                      k === _attrVal || k.replace(/×/g, 'x') === _normVal
                    );
                    if (_incrKey !== undefined) {
                      _prixFinal = (produit.prix || 0) + (produit.attrIncrements[_incrKey] || 0);
                    }
                  }
                  if (produit.attrCouts) {
                    const _coutKey = Object.keys(produit.attrCouts).find(k =>
                      k === _attrVal || k.replace(/×/g, 'x') === _normVal
                    );
                    if (_coutKey !== undefined) _coutFinal = produit.attrCouts[_coutKey];
                  }
                }
              }
              _state.lignes[idx].prixUnitaire  = _prixFinal || _state.lignes[idx].prixUnitaire;
              _state.lignes[idx].coutUnitaire  = _coutFinal;
              _state.lignes[idx].description   = descriptionAuto
                ? `${produit.nom} — ${descriptionAuto}`
                : produit.nom;
              _applyPalierPrix(idx);
              _refreshLineTable();
              _openPositionPicker();
            });
          } else {
            _openPositionPicker();
          }
        } else {
          _state.lignes[idx].produitId   = '';
          _state.lignes[idx].description = '';
          _refreshLineTable();
        }
        return;
      }

      /* Mise à jour des champs numériques ou texte */
      const numFields = ['prixUnitaire', 'remise', 'tauxTVA'];
      if (el.dataset.field === 'qte') {
        _state.lignes[idx].qte = parseInt(el.value, 10) || 0;
      } else if (numFields.includes(el.dataset.field)) {
        _state.lignes[idx][el.dataset.field] = parseFloat(el.value) || 0;
      } else {
        _state.lignes[idx][el.dataset.field] = el.value;
      }

      _updateLineSousTotal(idx);
      _updateTotals();
    });

    /* Saisie en temps réel → mise à jour des totaux + paliers auto */
    tbody.addEventListener('input', (e) => {
      const el  = e.target;
      const idx = parseInt(el.dataset.line, 10);
      if (isNaN(idx) || !el.dataset.field) return;

      const numFields = ['prixUnitaire', 'remise', 'tauxTVA'];
      if (el.dataset.field === 'qte') {
        _state.lignes[idx].qte = parseInt(el.value, 10) || 0;
        _applyPalierPrix(idx);
      } else if (numFields.includes(el.dataset.field)) {
        _state.lignes[idx][el.dataset.field] = parseFloat(el.value) || 0;
      } else {
        _state.lignes[idx][el.dataset.field] = el.value;
      }

      _updateLineSousTotal(idx);
      _updateTotals();
    });

    /* Supprimer une ligne */
    tbody.addEventListener('click', (e) => {
      const btnRemove = e.target.closest('[data-remove]');
      if (btnRemove) {
        _state.lignes.splice(parseInt(btnRemove.dataset.remove, 10), 1);
        _refreshLineTable();
        return;
      }

      /* Picker de variantes */
      const btnPick = e.target.closest('[data-pick-variante]');
      if (btnPick) {
        const idx = parseInt(btnPick.dataset.pickVariante, 10);
        const ligne = _state.lignes[idx];
        const produit = ligne.produitId ? Store.getById('produits', ligne.produitId) : null;
        if (!produit || !(produit.variantes || []).length) return;
        if (typeof Inventory !== 'undefined' && Inventory.showVariantePicker) {
          Inventory.showVariantePicker(produit, (variante, descriptionAuto) => {
            if (!variante) return;
            _copyVarianteFields(variante, idx);
            let _prixFinal2 = variante.prix || produit.prix || 0;
            let _coutFinal2 = variante.cout || produit.cout || 0;
            if (produit.attrPrix && (produit.attrIncrements || produit.attrCouts)) {
              const _needle2 = (produit.attrPrix).toLowerCase().replace(/_/g, ' ');
              const _varKey2 = Object.keys(variante).find(k => k.toLowerCase() === _needle2);
              const _attrVal2 = _varKey2 ? variante[_varKey2] : undefined;
              if (_attrVal2 !== undefined) {
                const _normVal2 = String(_attrVal2).replace(/×/g, 'x');
                if (produit.attrIncrements) {
                  const _incrKey2 = Object.keys(produit.attrIncrements).find(k =>
                    k === _attrVal2 || k.replace(/×/g, 'x') === _normVal2
                  );
                  if (_incrKey2 !== undefined) {
                    _prixFinal2 = (produit.prix || 0) + (produit.attrIncrements[_incrKey2] || 0);
                  }
                }
                if (produit.attrCouts) {
                  const _coutKey2 = Object.keys(produit.attrCouts).find(k =>
                    k === _attrVal2 || k.replace(/×/g, 'x') === _normVal2
                  );
                  if (_coutKey2 !== undefined) _coutFinal2 = produit.attrCouts[_coutKey2];
                }
              }
            }
            _state.lignes[idx].prixUnitaire  = _prixFinal2 || ligne.prixUnitaire || 0;
            _state.lignes[idx].coutUnitaire  = _coutFinal2;
            _state.lignes[idx].description   = descriptionAuto
              ? `${produit.nom} — ${descriptionAuto}`
              : (ligne.description || produit.nom);
            _applyPalierPrix(idx);
            _refreshLineTable();
          });
        }
      }
    });
  }

  /**
   * Tarification dégressive : applique le meilleur prix palier selon la qte.
   * Si aucun palier ne correspond, revient au prix de base du produit.
   * Met à jour _state.lignes[idx].prixUnitaire en silence (sans redessiner).
   */
  function _applyPalierPrix(idx) {
    const ligne = _state.lignes[idx];
    if (!ligne.produitId) return;

    const produit = Store.getById('produits', ligne.produitId);
    if (!produit) return;

    const paliers = (produit.paliers || [])
      .filter(p => p.qteMin > 0 && p.prix > 0)
      .sort((a, b) => b.qteMin - a.qteMin); // du plus grand au plus petit

    const qte = ligne.qte || 1;
    /* Trouver le palier applicable : le premier dont qteMin <= qte */
    const palierOK = paliers.find(p => qte >= p.qteMin);

    if (palierOK) {
      ligne.prixUnitaire = palierOK.prix;
    } else if (paliers.length > 0) {
      /* Des paliers existent mais aucun ne s'applique → prix de base produit */
      ligne.prixUnitaire = produit.prix || 0;
    }
    /* Aucun palier configuré → ne pas écraser le prix (peut venir d'un incrément variante) */

    /* Mettre à jour l'input prixUnitaire dans le DOM si visible */
    const inputPrix = document.querySelector(
      `[data-field="prixUnitaire"][data-line="${idx}"]`
    );
    if (inputPrix) inputPrix.value = ligne.prixUnitaire;
  }

  /**
   * Remise client spéciale : applique remiseClient (%) sur toutes les lignes
   * quand un client est sélectionné dans le formulaire.
   * @param {string} selectId — id du <select> client
   */
  function _applyRemiseClient(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel || !sel.value || sel.value === '__new__') return;

    const contact = Store.getById('contacts', sel.value);
    if (!contact || !contact.remiseClient || contact.remiseClient <= 0) return;

    const taux = parseFloat(contact.remiseClient) || 0;
    if (taux <= 0 || taux > 100) return;

    /* Appliquer la remise client sur toutes les lignes */
    _state.lignes.forEach(l => {
      l.remise = taux;
    });

    _refreshLineTable();

    /* Feedback visuel discret */
    const nom = contact.nom || 'ce client';
    toast(`Remise client ${taux}% appliquée pour ${nom}.`, 'info');
  }

  /** Met à jour le sous-total affiché d'une ligne */
  function _updateLineSousTotal(idx) {
    const l  = _state.lignes[idx];
    const st = Math.round((l.qte || 0) * (l.prixUnitaire || 0) * (1 - (l.remise || 0) / 100));
    const el = document.querySelector(`.line-sous-total[data-line="${idx}"]`);
    if (el) el.textContent = _fmt(st);
  }

  /** Met à jour les totaux affichés en bas du formulaire */
  function _updateTotals() {
    const { totalHT, totalTVA, totalTTC } = _calcTotaux(_state.lignes);
    const { tva16, tva13, tva5 } = _calcTVAParTaux(_state.lignes);

    const elHT  = document.getElementById('t-ht');
    const elTVA = document.getElementById('t-tva');
    const elTTC = document.getElementById('t-ttc');
    const el16  = document.getElementById('t-tva16');
    const el13  = document.getElementById('t-tva13');
    const el5   = document.getElementById('t-tva5');

    if (elHT)  elHT.textContent  = _fmt(totalHT);
    if (elTVA) elTVA.textContent = _fmt(totalTVA);
    if (elTTC) elTTC.textContent = _fmt(totalTTC);

    const _updateTaxRow = (el, val) => {
      if (!el) return;
      el.style.display = val > 0 ? '' : 'none';
      el.textContent   = val > 0 ? _fmt(val) : '';
    };
    _updateTaxRow(el16, tva16);
    _updateTaxRow(el13, tva13);
    _updateTaxRow(el5,  tva5);
  }

  /** Redessine le corps de la table de lignes */
  function _refreshLineTable() {
    const tbody = document.getElementById('line-tbody');
    if (!tbody) return;
    tbody.innerHTML = _state.lignes.map((l, i) => _renderLineRow(l, i)).join('');
    _updateTotals();
    /* La délégation sur tbody est toujours active — pas besoin de rebind */
  }

  /* ----------------------------------------------------------------
     SUIVI BON DE COMMANDE — barre de progression entre devis/cmd/facture
     ---------------------------------------------------------------- */
  function _renderSuiviBDC(doc, docType) {
    if (!doc) return '';

    let devisDoc = null, cmdDoc = null, facDoc = null;

    if (docType === 'devis') {
      devisDoc = doc;
      cmdDoc   = Store.getAll('commandes').find(c => c.quoteId === doc.id) || null;
      facDoc   = Store.getAll('factures').find(f => f.devisId === doc.id)  || null;
    } else if (docType === 'facture') {
      facDoc   = doc;
      if (doc.devisId)    devisDoc = Store.getById('devis', doc.devisId)    || null;
      if (doc.commandeId) cmdDoc   = Store.getById('commandes', doc.commandeId) || null;
    } else if (docType === 'commande') {
      cmdDoc   = doc;
      if (doc.quoteId) devisDoc = Store.getById('devis', doc.quoteId) || null;
      facDoc   = Store.getAll('factures').find(f => f.commandeId === doc.id) || null;
    }

    if (!devisDoc && !cmdDoc && !facDoc) return '';

    /* Valeur de référence = total du devis ou commande ou facture */
    const valRef    = (devisDoc?.totalTTC || cmdDoc?.totalTTC || facDoc?.totalTTC || 0);
    const totalFac  = facDoc?.totalTTC || 0;
    const totalPaye = _totalPaiements(facDoc?.paiements);
    const reste     = Math.max(0, totalFac - totalPaye);
    const pct       = valRef > 0 ? Math.min(100, Math.round((totalPaye / valRef) * 100)) : 0;
    const pctFac    = valRef > 0 ? Math.min(100, Math.round((totalFac / valRef) * 100)) : 0;

    const step = (ref, label, amount, color) => ref
      ? `<div style="display:flex;align-items:center;gap:6px;">
           <span style="font-size:11px;color:var(--text-muted);">${label}</span>
           <span style="font-size:12px;font-family:var(--font-mono);font-weight:600;color:${color};">
             ${_esc(ref)}
           </span>
           ${amount ? `<span style="font-size:11px;color:var(--text-muted);">${_fmt(amount)}</span>` : ''}
         </div>`
      : '';

    return `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;
        padding:12px 16px;margin-bottom:20px;display:flex;flex-direction:column;gap:8px;">

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;
            letter-spacing:.05em;">Suivi bon de commande</span>
          <span style="font-size:12px;font-family:var(--font-mono);color:var(--text-primary);font-weight:700;">
            ${_fmt(valRef)} XPF
          </span>
          ${pct > 0 ? `<span style="font-size:11px;color:var(--accent-green);">✓ ${pct}% réglé</span>` : ''}
        </div>

        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          ${step(devisDoc?.ref, '📄 Devis', devisDoc?.totalTTC, 'var(--text-primary)')}
          ${devisDoc && (cmdDoc || facDoc) ? '<span style="color:var(--text-muted);">›</span>' : ''}
          ${step(cmdDoc?.reference || cmdDoc?.ref, '📦 Commande', cmdDoc?.totalTTC, 'var(--accent-blue)')}
          ${cmdDoc && facDoc ? '<span style="color:var(--text-muted);">›</span>' : ''}
          ${!cmdDoc && devisDoc && facDoc ? '<span style="color:var(--text-muted);">›</span>' : ''}
          ${step(facDoc?.ref, '🧾 Facture', facDoc?.totalTTC, 'var(--accent-green)')}
        </div>

        ${totalFac > 0 ? `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="flex:1;height:6px;background:var(--bg-card);border-radius:3px;overflow:hidden;position:relative;">
            <div style="position:absolute;left:0;top:0;height:100%;width:${pctFac}%;background:var(--accent-blue);border-radius:3px;"></div>
            <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:var(--accent-green);border-radius:3px;transition:width .4s;"></div>
          </div>
          <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">
            Payé : <strong style="color:var(--accent-green);">${_fmt(totalPaye)}</strong>
            ${reste > 0 ? ` · Reste : <strong style="color:var(--accent-red);">${_fmt(reste)}</strong>` : ''}
          </span>
        </div>` : ''}

      </div>`;
  }

  /* ----------------------------------------------------------------
     HEADER DE FORMULAIRE DOCUMENT (commun aux 3 types)
     ---------------------------------------------------------------- */
  function _renderFormHeader(ref, statut, badgeMap, chips = '') {
    return `
      <div class="breadcrumb" style="margin-bottom:12px;">
        <span style="color:var(--text-muted)">Ventes</span>
        <span>›</span>
        <span style="color:var(--text-muted)">${_esc(_state.view === 'quotes' ? 'Devis' : _state.view === 'orders' ? 'Commandes' : 'Factures')}</span>
        <span>›</span>
        <span>${_esc(ref)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <div class="page-title" style="margin-bottom:0;">${_esc(ref)}</div>
        ${_badge(statut, badgeMap)}
        ${chips}
      </div>`;
  }

  /* ================================================================
     KANBAN GÉNÉRIQUE — réutilisé par devis, commandes, factures
     ================================================================ */

  /**
   * Affiche un kanban par colonnes de statut.
   * @param {Array}  data      - documents
   * @param {Array}  statuts   - liste ordonnée des statuts (colonnes)
   * @param {Object} badgeMap  - { statut: 'badge-xxx' }
   * @param {string} viewName  - 'quotes' | 'orders' | 'invoices'
   * @param {Element} toolbar
   * @param {Element} area
   */
  function _drawKanban(data, statuts, badgeMap, viewName, toolbar, area) {
    const container = document.getElementById('sales-quotes-table') ||
                      document.getElementById('sales-orders-table') ||
                      document.getElementById('sales-invoices-table') ||
                      document.getElementById('sales-bl-table');

    /* Grouper par statut */
    const groups = {};
    statuts.forEach(s => { groups[s] = []; });
    data.forEach(d => {
      const s = d.statut || statuts[0];
      if (groups[s]) groups[s].push(d);
      else groups[statuts[0]].push(d);
    });

    /* Couleur de la colonne */
    const colColor = {
      'badge-gray':   '#6b7280', 'badge-blue':   '#4a5fff',
      'badge-green':  '#22c55e', 'badge-red':    '#ef4444',
      'badge-orange': '#f97316', 'badge-violet': '#9c5de5'
    };

    let html = `<div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:12px;min-height:300px;">`;

    statuts.forEach(statut => {
      const items = groups[statut] || [];
      const cls   = badgeMap[statut] || 'badge-gray';
      const color = colColor[cls] || '#6b7280';

      html += `
        <div style="flex:0 0 230px;min-width:230px;">
          <div style="display:flex;align-items:center;justify-content:space-between;
            margin-bottom:10px;padding:8px 10px;background:${color}18;
            border-radius:8px;border-left:3px solid ${color};">
            <span style="font-size:12px;font-weight:700;color:${color};">${_esc(statut)}</span>
            <span style="font-size:11px;color:var(--text-muted);">${items.length}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${items.map(item => _renderKanbanCard(item, viewName, badgeMap)).join('')}
          </div>
        </div>`;
    });

    html += `</div>`;

    /* Injecter dans le conteneur existant */
    const target = document.getElementById('sales-quotes-table') ||
                   document.getElementById('sales-orders-table') ||
                   document.getElementById('sales-invoices-table') ||
                   document.getElementById('sales-bl-table');
    if (target) {
      target.innerHTML = html;
      target.querySelectorAll('[data-kanban-id]').forEach(card => {
        card.addEventListener('click', () => {
          _goForm(viewName, card.dataset.kanbanId, toolbar, area);
        });
      });
    }
  }

  /** Carte Kanban individuelle */
  function _renderKanbanCard(item, viewName, badgeMap) {
    const isInvoice = viewName === 'invoices';
    const reste = isInvoice
      ? Math.max(0, (item.totalTTC || 0) - _totalPaiements(item.paiements))
      : null;

    return `
      <div data-kanban-id="${item.id}" style="
          background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;
          padding:12px 14px;cursor:pointer;transition:box-shadow 0.2s,transform 0.15s;"
        onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.3)';this.style.transform='translateY(-1px)'"
        onmouseleave="this.style.boxShadow='none';this.style.transform='none'">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);
          margin-bottom:4px;">${_esc(item.ref || '—')}</div>
        <div style="font-weight:600;font-size:13px;color:var(--text-primary);
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px;">
          ${_esc(item.client || '—')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:var(--font-mono);font-size:12px;color:var(--text-secondary);">
            ${_fmt(item.totalTTC || 0)}
          </span>
          ${isInvoice && reste !== null ? `<span style="font-size:11px;font-weight:700;color:${reste > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">
            ${reste > 0 ? '−' + _fmt(reste) : '✓ Payé'}
          </span>` : `<span style="font-size:11px;color:var(--text-muted);">${_fmtDate(item.date || '')}</span>`}
        </div>
      </div>`;
  }


  /* ================================================================
     CRÉATION RAPIDE CLIENT (depuis Devis / Commande / Facture)
     ================================================================ */

  /**
   * Attache l'écouteur sur un select client pour détecter "__new__"
   * et ouvrir la modale de création rapide.
   * @param {string} selectId  — id du <select> (ex: 'q-client')
   */
  function _bindClientSelectCreation(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.addEventListener('change', function () {
      if (this.value !== '__new__') return;
      this.value = ''; /* reset pendant la saisie */
      _openQuickClientModal(selectId);
    });
  }

  /**
   * Modale légère de création rapide d'un client.
   * Une fois créé, le client est injecté et sélectionné dans le select cible.
   * @param {string} selectId — id du <select> à mettre à jour
   */
  function _openQuickClientModal(selectId) {
    const typeOpts = CLIENT_TYPES.map(t =>
      `<option value="${_esc(t)}">${_esc(t)}</option>`).join('');
    const ileOpts = ILES_PF.map(ile =>
      `<option value="${_esc(ile)}">${_esc(ile)}</option>`).join('');

    showModal('Nouveau client', `
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label required">Nom / Raison sociale</label>
          <input type="text" class="form-control" id="qc-nom"
            placeholder="Nom complet ou raison sociale" autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select class="form-control" id="qc-type">
            <option value="">— Choisir —</option>
            ${typeOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Île</label>
          <select class="form-control" id="qc-ile">
            <option value="">— Choisir —</option>
            ${ileOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" class="form-control" id="qc-tel" placeholder="87 xx xx xx" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="qc-email" placeholder="exemple@mail.pf" />
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Adresse</label>
          <input type="text" class="form-control" id="qc-adresse" placeholder="Quartier, PK, BP…" />
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button class="btn btn-ghost" id="qc-cancel">Annuler</button>
        <button class="btn btn-primary" id="qc-save">✔ Créer et sélectionner</button>
      </div>
    `);

    document.getElementById('qc-cancel')?.addEventListener('click', () => closeModal());
    document.getElementById('qc-save')?.addEventListener('click', async () => {
      const nom = (document.getElementById('qc-nom')?.value || '').trim();
      if (!nom) { toast('Le nom est obligatoire.', 'error'); return; }

      /* 1 — Sauvegarde localStorage (instantanée) */
      const newClient = Store.create('contacts', {
        nom,
        type:      document.getElementById('qc-type')?.value    || '',
        ile:       document.getElementById('qc-ile')?.value     || '',
        telephone: document.getElementById('qc-tel')?.value     || '',
        email:     document.getElementById('qc-email')?.value   || '',
        adresse:   document.getElementById('qc-adresse')?.value || ''
      });
      Store.addAuditLog(`Créé client "${nom}" (création rapide)`, 'ventes');

      /* 2 — Injecter et sélectionner dans le select */
      closeModal();
      const sel = document.getElementById(selectId);
      if (sel) {
        const opt    = document.createElement('option');
        opt.value    = newClient.id;
        opt.text     = newClient.nom;
        opt.selected = true;
        sel.appendChild(opt);
      }

      /* 3 — Vérifier la sync MySQL et afficher le statut */
      if (window.MYSQL) {
        try {
          const ping = await window.MYSQL.ping();
          if (ping.ok) {
            toast(`✅ Client "${_esc(nom)}" créé — enregistré dans la base MySQL.`, 'success');
          } else {
            toast(`⚠ Client "${_esc(nom)}" créé en local — MySQL hors-ligne (sera sync à la reconnexion).`, 'warning');
          }
        } catch (_) {
          toast(`⚠ Client "${_esc(nom)}" créé en local — MySQL non disponible.`, 'warning');
        }
      } else {
        toast(`Client "${_esc(nom)}" créé.`, 'success');
      }
    });
  }

  /* ================================================================
     MODULE CLIENTS
     Liste, fiche détaillée, formulaire création/modification
     ================================================================ */

  /* ---- Liste des clients ---- */
  function _renderClientsList(toolbar, area) {
    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-client">+ Nouveau client</button>`;

    document.getElementById('btn-new-client')?.addEventListener('click', () => {
      _openClientModal(null, toolbar, area);
    });

    _drawClientsList('', toolbar, area);
  }

  /* Filtre actif sur la liste clients */
  let _clientTypeFilter = 'Tous';
  let _clientIleFilter  = 'Toutes';

  function _drawClientsList(query, toolbar, area) {
    const tous    = Store.getAll('contacts');
    const q       = (query || '').toLowerCase();

    /* Filtrage texte + type + île */
    const filtered = tous.filter(c => {
      const matchQ   = !q
        || (c.nom       || '').toLowerCase().includes(q)
        || (c.email     || '').toLowerCase().includes(q)
        || (c.telephone || '').toLowerCase().includes(q)
        || (c.mobile    || '').toLowerCase().includes(q);
      const matchType = _clientTypeFilter === 'Tous' || c.type === _clientTypeFilter;
      const matchIle  = _clientIleFilter  === 'Toutes' || c.ile === _clientIleFilter;
      return matchQ && matchType && matchIle;
    });

    /* Listes uniques pour les selects */
    const types = ['Tous', ...new Set(tous.map(c => c.type).filter(Boolean))];
    const iles  = ['Toutes', ...new Set(tous.map(c => c.ile).filter(Boolean))];

    /* Stats CA par client depuis les factures */
    const factures     = Store.getAll('factures');
    const clientStats  = {};
    factures.forEach(f => {
      if (!f.contactId) return;
      if (!clientStats[f.contactId]) clientStats[f.contactId] = { nb: 0, ca: 0 };
      clientStats[f.contactId].nb++;
      clientStats[f.contactId].ca += (f.totalTTC || 0);
    });

    const hasActiveFilter = _clientTypeFilter !== 'Tous' || _clientIleFilter !== 'Toutes' || q;

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Clients
          <span style="font-size:0.65em;color:var(--text-muted);font-weight:400;margin-left:6px;">
            ${filtered.length} / ${tous.length}
          </span>
        </div>
      </div>

      <!-- Barre de filtres compacte -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
        <div style="position:relative;flex:1;min-width:180px;max-width:280px;">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:13px;pointer-events:none;">🔍</span>
          <input type="text" id="cl-search"
            placeholder="Nom, email, téléphone…"
            class="form-control"
            style="height:34px;padding-left:32px;font-size:13px;border-radius:8px;border:1px solid var(--border);"
            value="${_esc(query)}" />
        </div>

        <select id="cl-type-select" class="form-control"
          style="height:34px;width:155px;font-size:13px;border-radius:8px;border:1px solid var(--border);
                 color:${_clientTypeFilter !== 'Tous' ? 'var(--accent-blue)' : 'inherit'};
                 font-weight:${_clientTypeFilter !== 'Tous' ? '600' : '400'};">
          ${types.map(t => `<option value="${_esc(t)}"${t === _clientTypeFilter ? ' selected' : ''}>${_esc(t)}</option>`).join('')}
        </select>

        <select id="cl-ile-select" class="form-control"
          style="height:34px;width:135px;font-size:13px;border-radius:8px;border:1px solid var(--border);
                 color:${_clientIleFilter !== 'Toutes' ? 'var(--accent-blue)' : 'inherit'};
                 font-weight:${_clientIleFilter !== 'Toutes' ? '600' : '400'};">
          ${iles.map(i => `<option value="${_esc(i)}"${i === _clientIleFilter ? ' selected' : ''}>${_esc(i)}</option>`).join('')}
        </select>

        ${hasActiveFilter
          ? `<button id="cl-clear" title="Effacer les filtres"
              style="height:34px;padding:0 12px;border-radius:8px;border:1px solid var(--border);
                     background:transparent;color:var(--text-muted);font-size:12px;cursor:pointer;
                     display:flex;align-items:center;gap:4px;white-space:nowrap;transition:all .15s;"
              onmouseover="this.style.borderColor='var(--accent-red)';this.style.color='var(--accent-red)';"
              onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)';">
              ✕ Effacer
            </button>`
          : ''}
      </div>

      ${filtered.length === 0
        ? `<div class="table-empty"><div class="empty-icon">👥</div>
            <p>Aucun client pour ces filtres.</p>
            ${hasActiveFilter ? `<button id="cl-clear-empty" class="btn btn-ghost btn-sm" style="margin-top:8px;">Effacer les filtres</button>` : ''}
           </div>`
        : `<div class="card" style="overflow:auto;">
            <table class="table" id="clients-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Île</th>
                  <th>Téléphone / Mobile</th>
                  <th>Email</th>
                  <th>VIP</th>
                  <th style="text-align:center;">Factures</th>
                  <th>CA Total</th>
                  <th>Créé le</th>
                </tr>
              </thead>
              <tbody>
                ${filtered.map(c => {
                  const stats = clientStats[c.id] || { nb: 0, ca: 0 };
                  return `
                  <tr style="cursor:pointer;" data-cid="${_esc(c.id)}">
                    <td><strong>${_esc(c.nom)}</strong></td>
                    <td style="font-size:0.82em;">${_esc(c.type || '—')}</td>
                    <td style="font-size:0.82em;">${_esc(c.ile  || '—')}</td>
                    <td style="font-size:0.82em;">${_esc(c.mobile || c.telephone || '—')}</td>
                    <td style="font-size:0.82em;">${_esc(c.email || '—')}</td>
                    <td style="text-align:center;">${c.vip ? '⭐' : '—'}</td>
                    <td style="text-align:center;">${stats.nb || '—'}</td>
                    <td class="mono" style="font-size:0.82em;">${stats.ca > 0 ? _fmt(stats.ca) + ' XPF' : '—'}</td>
                    <td style="font-size:0.82em;">${c._createdAt ? _fmtDate(c._createdAt) : '—'}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
           </div>`
      }`;

    const _refresh = () => {
      const q2 = document.getElementById('cl-search')?.value || '';
      _drawClientsList(q2, toolbar, area);
    };
    const _clearAll = () => {
      _clientTypeFilter = 'Tous';
      _clientIleFilter  = 'Toutes';
      _drawClientsList('', toolbar, area);
    };

    /* Recherche en temps réel */
    document.getElementById('cl-search')?.addEventListener('input', _refresh);

    /* Select Type */
    document.getElementById('cl-type-select')?.addEventListener('change', (e) => {
      _clientTypeFilter = e.target.value;
      _refresh();
    });

    /* Select Île */
    document.getElementById('cl-ile-select')?.addEventListener('change', (e) => {
      _clientIleFilter = e.target.value;
      _refresh();
    });

    /* Bouton Effacer */
    document.getElementById('cl-clear')?.addEventListener('click', _clearAll);
    document.getElementById('cl-clear-empty')?.addEventListener('click', _clearAll);

    /* Clic sur une ligne → fiche client */
    area.querySelectorAll('[data-cid]').forEach(row => {
      row.addEventListener('click', () => {
        _renderClientFiche(row.dataset.cid, toolbar, area);
      });
    });
  }

  /* ---- Fiche client ---- */
  function _renderClientFiche(contactId, toolbar, area) {
    const c = Store.getById('contacts', contactId);
    if (!c) { toast('Client introuvable.', 'error'); return; }

    /* Factures du client */
    const mesFactures = Store.getAll('factures').filter(f => f.contactId === contactId);

    /* Historique des remises : toutes les lignes avec remise > 0 */
    const remiseHistory = [];
    mesFactures.forEach(f => {
      (f.lignes || []).forEach(l => {
        if ((l.remise || 0) > 0) {
          remiseHistory.push({
            date:         f.date,
            ref:          f.ref,
            article:      l.description || '—',
            qte:          l.qte || 1,
            prixUnit:     l.prixUnitaire || 0,
            remise:       l.remise,
            montantRemise: Math.round((l.qte || 1) * (l.prixUnitaire || 0) * (l.remise / 100))
          });
        }
      });
    });

    /* Synthèse remises par taux */
    const parTaux = {};
    remiseHistory.forEach(r => {
      const k = r.remise + '%';
      if (!parTaux[k]) parTaux[k] = { taux: r.remise, nb: 0, total: 0 };
      parTaux[k].nb++;
      parTaux[k].total += r.montantRemise;
    });

    /* Synthèse par article (description) */
    const parArticle = {};
    remiseHistory.forEach(r => {
      const k = r.article;
      if (!parArticle[k]) parArticle[k] = { article: r.article, nb: 0, total: 0 };
      parArticle[k].nb++;
      parArticle[k].total += r.montantRemise;
    });

    const caTotal     = mesFactures.reduce((s, f) => s + (f.totalTTC || 0), 0);
    const totalRemise = remiseHistory.reduce((s, r) => s + r.montantRemise, 0);

    toolbar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-back-clients">← Clients</button>
      <button class="btn btn-secondary btn-sm" id="btn-edit-client">✏ Modifier</button>`;

    document.getElementById('btn-back-clients')?.addEventListener('click', () => {
      _renderClientsList(toolbar, area);
    });
    document.getElementById('btn-edit-client')?.addEventListener('click', () => {
      _openClientModal(contactId, toolbar, area);
    });

    area.innerHTML = `
      <!-- En-tête client -->
      <div class="page-header">
        <div class="page-title">👤 ${_esc(c.nom)}</div>
        <div class="page-subtitle">${_esc(c.type || 'Client')}${c.ile ? ' · ' + _esc(c.ile) : ''}</div>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:1.6em;">🧾</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-blue);">${mesFactures.length}</div>
          <div style="font-size:0.78em;color:var(--text-muted);">Factures</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:1.6em;">💰</div>
          <div style="font-size:1.2em;font-weight:700;color:var(--accent-green);font-family:monospace;">${_fmt(caTotal)}</div>
          <div style="font-size:0.78em;color:var(--text-muted);">CA Total TTC</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:1.6em;">🏷️</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-orange);">${remiseHistory.length}</div>
          <div style="font-size:0.78em;color:var(--text-muted);">Lignes remisées</div>
        </div>
        <div class="card" style="padding:16px;text-align:center;">
          <div style="font-size:1.6em;">💸</div>
          <div style="font-size:1.2em;font-weight:700;color:var(--accent-red);font-family:monospace;">${totalRemise > 0 ? '−' + _fmt(totalRemise) : '0 XPF'}</div>
          <div style="font-size:0.78em;color:var(--text-muted);">Total remises</div>
        </div>
      </div>

      <!-- Informations + Synthèse remises par taux -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">

        <!-- Infos -->
        <div class="card">
          <div class="card-header"><div class="card-title">Informations</div></div>
          <div style="padding:14px 16px;">
            <table style="width:100%;border-collapse:collapse;">
              ${_clientInfoRow('Type',            c.type)}
              ${_clientInfoRow('Téléphone',       c.telephone)}
              ${_clientInfoRow('Email',           c.email)}
              ${_clientInfoRow('Île',             c.ile)}
              ${_clientInfoRow('Adresse',         c.adresse)}
              ${_clientInfoRow('Interlocuteur',   c.interlocuteur)}
              ${_clientInfoRow('SIRET',           c.siret)}
              ${c.dateNaissance ? _clientInfoRow('Date de naissance', _fmtDate(c.dateNaissance)) : ''}
              ${_clientInfoRow('Créé le', c._createdAt ? _fmtDate(c._createdAt) : '—')}
            </table>
          </div>
        </div>

        <!-- Remises par taux -->
        <div class="card">
          <div class="card-header"><div class="card-title">Remises accordées par taux</div></div>
          <div style="padding:14px 16px;">
            ${Object.keys(parTaux).length === 0
              ? '<p style="color:var(--text-muted);font-size:0.85em;text-align:center;padding:16px 0;">Aucune remise accordée à ce client.</p>'
              : Object.values(parTaux)
                  .sort((a, b) => b.taux - a.taux)
                  .map(t => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
                  <div>
                    <span style="font-weight:700;color:var(--accent-orange);font-size:1em;">Remise ${t.taux}%</span>
                    <span style="color:var(--text-muted);font-size:0.8em;margin-left:8px;">(${t.nb} ligne${t.nb > 1 ? 's' : ''})</span>
                  </div>
                  <span style="font-family:monospace;color:var(--accent-red);font-weight:600;">−${_fmt(t.total)}</span>
                </div>`).join('')
            }
          </div>
        </div>
      </div>

      <!-- Remises par article -->
      ${Object.keys(parArticle).length > 0 ? `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><div class="card-title">Remises par article</div></div>
        <div style="overflow:auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Article</th>
                <th style="text-align:center;">Nb occurrences</th>
                <th>Total remisé</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(parArticle).sort((a, b) => b.total - a.total).map(a => `
              <tr>
                <td>${_esc(a.article)}</td>
                <td style="text-align:center;">${a.nb}</td>
                <td class="mono" style="color:var(--accent-red);">−${_fmt(a.total)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>` : ''}

      <!-- Historique détaillé des remises -->
      <div class="card">
        <div class="card-header"><div class="card-title">Historique détaillé des remises</div></div>
        ${remiseHistory.length === 0
          ? '<div class="table-empty" style="padding:24px;"><p>Aucune remise enregistrée pour ce client.</p></div>'
          : `<div style="overflow:auto;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Facture</th>
                    <th>Article</th>
                    <th style="text-align:center;">Qté</th>
                    <th>Prix unit.</th>
                    <th style="text-align:center;">Remise %</th>
                    <th>Montant remisé</th>
                  </tr>
                </thead>
                <tbody>
                  ${remiseHistory
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(r => `
                  <tr>
                    <td>${_fmtDate(r.date)}</td>
                    <td><span class="col-ref">${_esc(r.ref)}</span></td>
                    <td>${_esc(r.article)}</td>
                    <td style="text-align:center;">${r.qte}</td>
                    <td class="mono">${_fmt(r.prixUnit)}</td>
                    <td style="text-align:center;color:var(--accent-orange);font-weight:700;">${r.remise}%</td>
                    <td class="mono" style="color:var(--accent-red);">−${_fmt(r.montantRemise)}</td>
                  </tr>`).join('')}
                </tbody>
              </table>
             </div>`
        }
      </div>`;
  }

  /** Ligne info pour la fiche client */
  function _clientInfoRow(label, value) {
    if (!value) return '';
    return `
      <tr>
        <td style="color:var(--text-muted);font-size:0.82em;padding:5px 10px 5px 0;width:42%;vertical-align:top;">${_esc(label)}</td>
        <td style="font-size:0.88em;padding:5px 0;">${_esc(value)}</td>
      </tr>`;
  }

  /* ---- Modal création / modification client (alignée avec CRM Contacts) ---- */
  function _openClientModal(contactId, toolbar, area) {
    const c    = contactId ? Store.getById('contacts', contactId) : null;
    const isNew = !c;

    const typeOpts = CLIENT_TYPES.map(t =>
      `<option value="${_esc(t)}" ${c?.type === t ? 'selected' : ''}>${_esc(t)}</option>`
    ).join('');
    const ileOpts = ILES_PF.map(ile =>
      `<option value="${_esc(ile)}" ${c?.ile === ile ? 'selected' : ''}>${_esc(ile)}</option>`
    ).join('');

    showModal(isNew ? 'Nouveau client' : 'Modifier : ' + c.nom, `
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label required">Nom / Raison sociale</label>
          <input type="text" class="form-control" id="cl-nom"
            value="${_esc(c?.nom || '')}" placeholder="Nom complet ou raison sociale" />
        </div>
        <div class="form-group">
          <label class="form-label">Type de client</label>
          <select class="form-control" id="cl-type">
            <option value="">— Choisir —</option>${typeOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Île</label>
          <select class="form-control" id="cl-ile">
            <option value="">— Choisir —</option>${ileOpts}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Téléphone fixe</label>
          <input type="tel" class="form-control" id="cl-tel"
            value="${_esc(c?.telephone || '')}" placeholder="40 xx xx xx" />
        </div>
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input type="tel" class="form-control" id="cl-mobile"
            value="${_esc(c?.mobile || '')}" placeholder="87 xx xx xx" />
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="cl-email"
            value="${_esc(c?.email || '')}" placeholder="exemple@mail.pf" />
        </div>
        <div class="form-group">
          <label class="form-label">Date de naissance</label>
          <input type="date" class="form-control" id="cl-datenaissance"
            value="${c?.dateNaissance || ''}" />
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Adresse</label>
          <input type="text" class="form-control" id="cl-adresse"
            value="${_esc(c?.adresse || '')}" placeholder="Quartier, PK, BP…" />
        </div>
        <div class="form-group">
          <label class="form-label">Interlocuteur principal</label>
          <input type="text" class="form-control" id="cl-interlocuteur"
            value="${_esc(c?.interlocuteur || '')}" placeholder="Prénom Nom" />
        </div>
        <div class="form-group">
          <label class="form-label">N° Tahiti / Registre commerce</label>
          <input type="text" class="form-control" id="cl-numerotahiti"
            value="${_esc(c?.numeroTahiti || c?.siret || '')}" placeholder="N° d'identification" />
        </div>
        <div class="form-group" style="grid-column:1/-1;display:flex;align-items:center;gap:10px;">
          <input type="checkbox" id="cl-vip" ${c?.vip ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
          <label for="cl-vip" style="cursor:pointer;font-size:0.88em;">⭐ Client VIP</label>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:20px;">
        <button class="btn btn-ghost" id="cl-cancel">Annuler</button>
        <button class="btn btn-primary" id="cl-save">${isNew ? '+ Créer le client' : '✔ Sauvegarder'}</button>
      </div>
    `);

    document.getElementById('cl-cancel')?.addEventListener('click', () => closeModal());
    document.getElementById('cl-save')?.addEventListener('click', () => _saveClient(contactId, toolbar, area));
  }

  /* ---- Sauvegarde client ---- */
  function _saveClient(contactId, toolbar, area) {
    const nom = (document.getElementById('cl-nom')?.value || '').trim();
    if (!nom) { toast('Le nom est obligatoire.', 'error'); return; }

    const record = {
      nom,
      type:          document.getElementById('cl-type')?.value          || '',
      ile:           document.getElementById('cl-ile')?.value           || '',
      telephone:     document.getElementById('cl-tel')?.value           || '',
      mobile:        document.getElementById('cl-mobile')?.value        || '',
      email:         document.getElementById('cl-email')?.value         || '',
      dateNaissance: document.getElementById('cl-datenaissance')?.value || '',
      adresse:       document.getElementById('cl-adresse')?.value       || '',
      interlocuteur: document.getElementById('cl-interlocuteur')?.value || '',
      numeroTahiti:  document.getElementById('cl-numerotahiti')?.value  || '',
      vip:           document.getElementById('cl-vip')?.checked         || false
    };

    let savedId = contactId;
    if (contactId) {
      Store.update('contacts', contactId, record);
      Store.addAuditLog(`Modifié client "${nom}"`, 'ventes');
      toast('Client mis à jour.', 'success');
    } else {
      const newC = Store.create('contacts', record);
      Store.addAuditLog(`Créé client "${nom}"`, 'ventes');
      toast('Client créé.', 'success');
      savedId = newC.id;
    }

    closeModal();
    _renderClientFiche(savedId, toolbar, area);
  }

  /* ================================================================
     POINT D'ENTRÉE PUBLIC
     init(toolbar, area, viewId) — appelé par app.js
     ================================================================ */

  /* ----------------------------------------------------------------
     PARAMÈTRES DE MISE EN FORME DES DOCUMENTS
     ---------------------------------------------------------------- */
  function _getDocParams() {
    const defaults = {
      entreprise:  'High Coffee Shirt',
      slogan:      'Impression DTF & Transferts — Papeete, Tahiti',
      adresse:     'Papeete, Polynésie française',
      telephone:   '+689',
      email:       'highcoffeeshirt@gmail.com',
      website:     '',
      gmailFrom:   'highcoffeeshirt@gmail.com',
      logoUrl:     '',
      accentColor: '#4a5fff',
      footerText:  'Merci de votre confiance.',
      conditions:  'Paiement à réception de facture. TVA 16%.',
    };
    try {
      const saved = JSON.parse(localStorage.getItem('hcs_doc_params') || 'null');
      return saved ? Object.assign({}, defaults, saved) : defaults;
    } catch(_) { return defaults; }
  }

  function _renderDocParams(toolbar, area) {
    const p = _getDocParams();
    toolbar.innerHTML = `<span style="font-weight:600;font-size:14px;">⚙ Paramètres documents</span>`;

    area.innerHTML = `
      <div style="max-width:640px;margin:0 auto;padding:24px 0;">
        <div class="form-section">
          <div class="form-section-title">Identité de l'entreprise</div>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Nom de l'entreprise</label>
              <input class="form-control" id="dp-entreprise" value="${_esc(p.entreprise)}">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Slogan / sous-titre</label>
              <input class="form-control" id="dp-slogan" value="${_esc(p.slogan)}">
            </div>
            <div class="form-group">
              <label class="form-label">Adresse</label>
              <input class="form-control" id="dp-adresse" value="${_esc(p.adresse)}">
            </div>
            <div class="form-group">
              <label class="form-label">Téléphone</label>
              <input class="form-control" id="dp-telephone" value="${_esc(p.telephone)}">
            </div>
            <div class="form-group">
              <label class="form-label">Email de contact</label>
              <input class="form-control" type="email" id="dp-email" value="${_esc(p.email)}">
            </div>
            <div class="form-group">
              <label class="form-label">Site web</label>
              <input class="form-control" id="dp-website" value="${_esc(p.website)}">
            </div>
            <div class="form-group">
              <label class="form-label">Gmail d'envoi (bouton email)</label>
              <input class="form-control" type="email" id="dp-gmail" value="${_esc(p.gmailFrom)}" placeholder="votre@gmail.com">
            </div>
            <div class="form-group">
              <label class="form-label">URL Logo (image)</label>
              <input class="form-control" id="dp-logo" value="${_esc(p.logoUrl)}" placeholder="https://… ou data:image/…">
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Mise en forme visuelle</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Couleur principale</label>
              <div style="display:flex;gap:8px;align-items:center;">
                <input type="color" id="dp-color" value="${p.accentColor}"
                  style="width:44px;height:36px;border:none;cursor:pointer;border-radius:6px;">
                <input class="form-control" id="dp-color-txt" value="${_esc(p.accentColor)}"
                  placeholder="#4a5fff" style="font-family:monospace;">
              </div>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Textes du document</div>
          <div class="form-grid">
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Pied de page</label>
              <input class="form-control" id="dp-footer" value="${_esc(p.footerText)}">
            </div>
            <div class="form-group" style="grid-column:1/-1;">
              <label class="form-label">Conditions générales / mentions légales</label>
              <textarea class="form-control" id="dp-conditions" rows="3" style="resize:vertical;">${_esc(p.conditions)}</textarea>
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;">
          <button class="btn btn-ghost" id="dp-preview">👁 Aperçu</button>
          <button class="btn btn-primary" id="dp-save">✔ Enregistrer</button>
        </div>
      </div>`;

    /* Sync color picker ↔ text input */
    document.getElementById('dp-color')?.addEventListener('input', (e) => {
      const t = document.getElementById('dp-color-txt');
      if (t) t.value = e.target.value;
    });
    document.getElementById('dp-color-txt')?.addEventListener('input', (e) => {
      const c = document.getElementById('dp-color');
      if (c && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) c.value = e.target.value;
    });

    /* Enregistrer */
    document.getElementById('dp-save')?.addEventListener('click', () => {
      const params = {
        entreprise:  document.getElementById('dp-entreprise')?.value.trim() || p.entreprise,
        slogan:      document.getElementById('dp-slogan')?.value.trim()     || '',
        adresse:     document.getElementById('dp-adresse')?.value.trim()    || '',
        telephone:   document.getElementById('dp-telephone')?.value.trim()  || '',
        email:       document.getElementById('dp-email')?.value.trim()      || '',
        website:     document.getElementById('dp-website')?.value.trim()    || '',
        gmailFrom:   document.getElementById('dp-gmail')?.value.trim()      || '',
        logoUrl:     document.getElementById('dp-logo')?.value.trim()       || '',
        accentColor: document.getElementById('dp-color-txt')?.value.trim()  || '#4a5fff',
        footerText:  document.getElementById('dp-footer')?.value.trim()     || '',
        conditions:  document.getElementById('dp-conditions')?.value.trim() || '',
      };
      localStorage.setItem('hcs_doc_params', JSON.stringify(params));
      toast('Paramètres documents sauvegardés.', 'success');
    });

    /* Aperçu rapide */
    document.getElementById('dp-preview')?.addEventListener('click', () => {
      /* Sauvegarder d'abord */
      document.getElementById('dp-save')?.click();
      /* Créer un devis fictif pour la preview */
      const fakeDevis = {
        ref: 'DEV-2026-APERCU', statut: 'Brouillon', date: new Date().toISOString().slice(0,10),
        client: 'Client Exemple', contactId: null,
        lignes: [{ description: 'Produit exemple', qte: 2, prixUnitaire: 2500, remise: 0, tauxTVA: 16 }],
        totalHT: 5000, totalTVA: 800, totalTTC: 5800, notes: ''
      };
      if (window.SalesQuotes && window.SalesQuotes._previewDevis) {
        window.SalesQuotes._previewDevis(fakeDevis, toolbar, area);
      } else {
        console.warn('[DocParams] SalesQuotes._previewDevis non disponible');
      }
    });
  }

  function init(toolbar, area, viewId) {
    /* Changement de vue → reset mode liste */
    if (viewId !== _state.view) {
      _state.mode      = 'list';
      _state.currentId = null;
      _state.lignes    = [];
      _state.paiements = [];
    }
    _state.view = viewId;

    /* Mode formulaire (navigation interne) — délégué aux modules compagnons */
    if (_state.mode === 'form') {
      switch (viewId) {
        case 'quotes':
          if (window.SalesQuotes) window.SalesQuotes._renderForm(toolbar, area);
          else _renderFallback(area, 'SalesQuotes');
          break;
        case 'orders':
          if (window.SalesOrders) window.SalesOrders._renderForm(toolbar, area);
          else _renderFallback(area, 'SalesOrders');
          break;
        case 'invoices':
          if (window.SalesInvoices) window.SalesInvoices._renderForm(toolbar, area);
          else _renderFallback(area, 'SalesInvoices');
          break;
      }
      return;
    }

    /* Mode liste — délégué aux modules compagnons */
    switch (viewId) {
      case 'clients':      _renderClientsList(toolbar, area);                    break;
      case 'quotes':
        if (window.SalesQuotes) window.SalesQuotes._renderList(toolbar, area);
        else _renderFallback(area, 'SalesQuotes');
        break;
      case 'orders':
        if (window.SalesOrders) window.SalesOrders._renderList(toolbar, area);
        else _renderFallback(area, 'SalesOrders');
        break;
      case 'invoices':
        if (window.SalesInvoices) window.SalesInvoices._renderList(toolbar, area);
        else _renderFallback(area, 'SalesInvoices');
        break;
      case 'receipts':
        if (window.SalesOrders) window.SalesOrders._renderReceiptsList(toolbar, area);
        else _renderFallback(area, 'SalesOrders');
        break;
      case 'sales-report':
        if (window.SalesReport) window.SalesReport._renderReport(toolbar, area);
        else _renderFallback(area, 'SalesReport');
        break;
      case 'doc-params':   _renderDocParams(toolbar, area);                       break;
      default:
        area.innerHTML = `
          <div class="table-empty">
            <div class="empty-icon">🛒</div>
            <p>Vue Ventes "${_esc(viewId)}" inconnue.</p>
          </div>`;
    }

    function _renderFallback(area, moduleName) {
      area.innerHTML = `<div style="padding:24px;color:var(--accent-red,#ff6b6b);">
        Module <strong>${moduleName}</strong> non chargé — vérifiez la console.</div>`;
      console.error('[Sales.init] module manquant :', moduleName, '— Vérifiez que le fichier est bien déployé sur le serveur.');
    }
  }

  /* ================================================================
     DÉDUCTION STOCK AUTOMATIQUE (Étape 7)
     Appelée quand une facture est payée / créée depuis commande
     ================================================================ */
  function _deductStockFromLines(lignes) {
    if (!Array.isArray(lignes)) return;
    const produits = Store.getAll('produits');
    lignes.forEach(l => {
      const desc  = (l.description || l.produit || '').toLowerCase().trim();
      const qte   = Number(l.qte) || 0;
      if (!desc || qte <= 0) return;
      /* Chercher le produit par correspondance de nom */
      const prod = produits.find(p =>
        (p.nom || '').toLowerCase().trim() === desc ||
        (p.ref || '').toLowerCase().trim() === desc
      );
      if (prod && prod.stock !== undefined) {
        const newStock = Math.max(0, (Number(prod.stock) || 0) - qte);
        Store.update('produits', prod.id, { stock: newStock });
      }
    });
  }

  /* ================================================================
     MOCKUP PROJET — upload, aperçu, auto-récup MockupForge
     ================================================================ */

  /* Compresse un File image en DataURL JPEG (max maxPx px) */
  function _imgToDataUrl(file, maxPx) {
    maxPx = maxPx || 800;
    return new Promise(function(resolve) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          let w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w > h) { h = Math.round(h * maxPx / w); w = maxPx; }
            else       { w = Math.round(w * maxPx / h); h = maxPx; }
          }
          const cvs = document.createElement('canvas');
          cvs.width = w; cvs.height = h;
          cvs.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(cvs.toDataURL('image/jpeg', 0.82));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Redessine la grille de thumbnails dans #mockup-preview-zone */
  /* Lightbox plein écran pour les vignettes mockup */
  function _openMockupLightbox(idx) {
    const urls = _mockupUrls;
    if (!urls || !urls[idx]) return;
    let current = idx;

    /* Overlay */
    const overlay = document.createElement('div');
    overlay.id = 'mockup-lightbox';
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:10100;',
      'background:rgba(0,0,0,.92);',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'cursor:zoom-out;'
    ].join('');

    function render() {
      const m = urls[current];
      overlay.innerHTML = `
        <!-- Fermer -->
        <button id="lb-close"
          style="position:fixed;top:16px;right:20px;background:none;border:none;
                 color:#fff;font-size:28px;cursor:pointer;line-height:1;z-index:1;">✕</button>

        <!-- Navigation gauche -->
        ${urls.length > 1 ? `
        <button id="lb-prev"
          style="position:fixed;left:12px;top:50%;transform:translateY(-50%);
                 background:rgba(255,255,255,.15);border:none;color:#fff;font-size:28px;
                 width:44px;height:44px;border-radius:50%;cursor:pointer;z-index:1;">‹</button>` : ''}

        <!-- Image principale -->
        <img src="${m.dataUrl}"
             style="max-width:92vw;max-height:82vh;object-fit:contain;
                    border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,.6);
                    transition:opacity .15s;" />

        <!-- Navigation droite -->
        ${urls.length > 1 ? `
        <button id="lb-next"
          style="position:fixed;right:12px;top:50%;transform:translateY(-50%);
                 background:rgba(255,255,255,.15);border:none;color:#fff;font-size:28px;
                 width:44px;height:44px;border-radius:50%;cursor:pointer;z-index:1;">›</button>` : ''}

        <!-- Légende -->
        <div style="margin-top:12px;color:rgba(255,255,255,.7);font-size:12px;text-align:center;">
          ${_esc(m.nom || '')}
          ${m.source ? ' — ' + _esc(m.source) : ''}
          ${m.date   ? ' — ' + _esc(m.date)   : ''}
          ${urls.length > 1 ? `<span style="margin-left:12px;opacity:.5;">${current+1} / ${urls.length}</span>` : ''}
        </div>

        <!-- Miniatures -->
        ${urls.length > 1 ? `
        <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;justify-content:center;">
          ${urls.map((u, i) => `
            <img src="${u.dataUrl}"
                 data-lb-thumb="${i}"
                 style="width:52px;height:52px;object-fit:cover;border-radius:4px;cursor:pointer;
                        opacity:${i === current ? '1' : '.45'};
                        border:2px solid ${i === current ? 'var(--caramel,#c4813a)' : 'transparent'};
                        transition:opacity .15s,border-color .15s;" />`).join('')}
        </div>` : ''}`;

      /* Événements boutons */
      overlay.querySelector('#lb-close')?.addEventListener('click', e => { e.stopPropagation(); overlay.remove(); });
      overlay.querySelector('#lb-prev')?.addEventListener('click',  e => { e.stopPropagation(); current = (current - 1 + urls.length) % urls.length; render(); });
      overlay.querySelector('#lb-next')?.addEventListener('click',  e => { e.stopPropagation(); current = (current + 1) % urls.length; render(); });
      overlay.querySelectorAll('[data-lb-thumb]').forEach(th => {
        th.addEventListener('click', e => { e.stopPropagation(); current = parseInt(th.dataset.lbThumb, 10); render(); });
      });
    }

    render();

    /* Fermer en cliquant sur le fond */
    overlay.addEventListener('click', () => overlay.remove());

    /* Fermer avec Échap, naviguer avec flèches clavier */
    function onKey(e) {
      if (e.key === 'Escape')      { overlay.remove(); document.removeEventListener('keydown', onKey); }
      if (e.key === 'ArrowRight')  { current = (current + 1) % urls.length; render(); }
      if (e.key === 'ArrowLeft')   { current = (current - 1 + urls.length) % urls.length; render(); }
    }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('remove', () => document.removeEventListener('keydown', onKey));

    document.body.appendChild(overlay);
  }

  function _refreshMockupZone() {
    const zone = document.getElementById('mockup-preview-zone');
    if (!zone) return;
    const urls = _mockupUrls;
    if (!urls || urls.length === 0) {
      zone.innerHTML = '<span style="color:var(--text-muted);font-size:12px;padding:8px;">Aucun mockup</span>';
      return;
    }
    zone.innerHTML = urls.map((m, i) => `
      <div style="position:relative;display:inline-block;margin:4px;">
        <img src="${m.dataUrl}" alt="${_esc(m.nom||'')}"
             style="width:88px;height:88px;object-fit:cover;border-radius:6px;
                    border:2px solid transparent;cursor:zoom-in;transition:border-color .15s,transform .15s;"
             title="Cliquer pour zoomer"
             data-mockup-zoom="${i}"
             onmouseover="this.style.borderColor='var(--caramel,#c4813a)';this.style.transform='scale(1.06)'"
             onmouseout="this.style.borderColor='transparent';this.style.transform='scale(1)'" />
        <button type="button"
                style="position:absolute;top:2px;right:2px;background:#e63946;color:#fff;
                       border:none;border-radius:50%;width:18px;height:18px;font-size:10px;
                       line-height:18px;text-align:center;cursor:pointer;padding:0;"
                data-mockup-del="${i}" title="Supprimer">✕</button>
        <div style="font-size:9px;color:var(--text-muted);text-align:center;max-width:88px;
                    overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${_esc(m.nom||m.source||'')}</div>
      </div>`).join('');

    /* Zoom au clic */
    zone.querySelectorAll('[data-mockup-zoom]').forEach(img => {
      img.addEventListener('click', function() {
        _openMockupLightbox(parseInt(this.dataset.mockupZoom, 10));
      });
    });

    /* Supprimer */
    zone.querySelectorAll('[data-mockup-del]').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.dataset.mockupDel, 10);
        _mockupUrls = _mockupUrls.filter((_, j) => j !== idx);
        _refreshMockupZone();
      });
    });
  }

  /* Noms lisibles des produits MockupForge */
  const _MFW_PROD_NAMES = {
    tshirt: 'T-Shirt 👕', polo: 'Polo 👔', hoodie: 'Hoodie 🧥',
    casquette: 'Casquette 🧢', bonnet: 'Bonnet 🎩', totebag: 'Tote Bag 👜',
    mug: 'Mug ☕', sticker: 'Sticker 🏷️', affiche: 'Affiche 🖼️',
    sweat: 'Sweat 👕', veste: 'Veste 🧥', short: 'Short 🩳',
  };

  /* Picker collections MockupForge depuis localStorage mfw_collections_v1 */
  function _showMockupCollectionPicker() {
    let collections = [];
    try {
      collections = JSON.parse(localStorage.getItem('mfw_collections_v1') || '[]');
    } catch (_) {}

    /* ── Overlay ── */
    const dlg = document.createElement('div');
    dlg.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.75);' +
      'display:flex;align-items:center;justify-content:center;';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--surface,#1e1008);border:1px solid var(--border,#3b1f0e);' +
      'border-radius:12px;width:min(480px,95vw);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;';
    dlg.appendChild(box);
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });

    /* ── Étape 1 : grille des collections ── */
    function showCollections() {
      if (collections.length === 0) {
        box.innerHTML = `
          <div style="padding:24px;text-align:center;">
            <div style="font-size:36px;margin-bottom:12px;">🛍️</div>
            <div style="font-size:15px;font-weight:700;color:var(--cream,#f5ede0);margin-bottom:6px;">
              Aucune collection MockupForge</div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
              Créez des collections dans MockupForge v12 (Mode Admin).</div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
              <button id="mf-upload-direct" class="btn btn-primary btn-sm">📤 Upload direct</button>
              <button id="mf-close" class="btn btn-ghost btn-sm">Fermer</button>
            </div>
          </div>`;
        box.querySelector('#mf-close')?.addEventListener('click', () => dlg.remove());
        box.querySelector('#mf-upload-direct')?.addEventListener('click', () => {
          dlg.remove();
          document.getElementById('mockup-file-input')?.click();
        });
        return;
      }

      box.innerHTML = `
        <div style="padding:14px 16px;border-bottom:1px solid var(--border,#3b1f0e);
                    display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:14px;font-weight:700;color:var(--cream,#f5ede0);">
            🔍 MockupForge — Collections</div>
          <button id="mf-close"
            style="background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:12px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${collections.map(c => {
            const nb = (c.products || []).length;
            const col = c.color || '#c4813a';
            return `
              <div data-coll-id="${_esc(c.id)}"
                   style="background:var(--bg-elevated,#2a1508);border:2px solid ${col}33;
                          border-radius:8px;padding:12px;cursor:pointer;transition:border-color .15s;"
                   onmouseover="this.style.borderColor='${col}'"
                   onmouseout="this.style.borderColor='${col}33'">
                <div style="font-size:24px;margin-bottom:6px;">${c.icon || '📦'}</div>
                <div style="font-size:13px;font-weight:700;color:var(--cream,#f5ede0);
                            margin-bottom:3px;">${_esc(c.name || 'Collection')}</div>
                <div style="font-size:11px;color:var(--text-muted);">
                  ${nb} produit${nb > 1 ? 's' : ''}</div>
              </div>`;
          }).join('')}
        </div>
        <div style="padding:10px 16px;border-top:1px solid var(--border,#3b1f0e);
                    display:flex;justify-content:flex-end;gap:8px;">
          <button id="mf-upload-direct" class="btn btn-ghost btn-sm">📤 Upload direct</button>
        </div>`;

      box.querySelector('#mf-close')?.addEventListener('click', () => dlg.remove());
      box.querySelector('#mf-upload-direct')?.addEventListener('click', () => {
        dlg.remove();
        document.getElementById('mockup-file-input')?.click();
      });
      box.querySelectorAll('[data-coll-id]').forEach(card => {
        card.addEventListener('click', () => {
          const coll = collections.find(c => c.id === card.dataset.collId);
          if (coll) showProducts(coll);
        });
      });
    }

    /* ── Étape 2 : produits d'une collection + file pick ── */
    function showProducts(coll) {
      const prods = coll.products || [];
      box.innerHTML = `
        <div style="padding:14px 16px;border-bottom:1px solid var(--border,#3b1f0e);
                    display:flex;align-items:center;gap:10px;">
          <button id="mf-back"
            style="background:none;border:none;color:var(--caramel,#c4813a);font-size:18px;cursor:pointer;">‹</button>
          <div style="font-size:14px;font-weight:700;color:var(--cream,#f5ede0);flex:1;">
            ${coll.icon || '📦'} ${_esc(coll.name)}</div>
          <button id="mf-close"
            style="background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;">✕</button>
        </div>
        <div style="padding:12px;overflow-y:auto;">
          ${prods.length === 0 ? '<div style="color:var(--text-muted);padding:16px;text-align:center;">Aucun produit dans cette collection.</div>' : ''}
          <div id="mf-prod-list" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            ${prods.map(p => {
              const nom = _MFW_PROD_NAMES[p.prodId] || (_esc(p.prodId) || 'Produit');
              return `
                <label data-prod-id="${_esc(p.prodId)}"
                       style="display:flex;align-items:center;gap:8px;padding:10px;
                              background:var(--bg-elevated,#2a1508);border:2px solid transparent;
                              border-radius:8px;cursor:pointer;transition:border-color .15s;"
                       onmouseover="this.style.borderColor='var(--caramel,#c4813a)'"
                       onmouseout="if(!this.querySelector('input').checked) this.style.borderColor='transparent'">
                  <input type="radio" name="mf-prod" value="${_esc(p.prodId)}"
                         style="accent-color:var(--caramel,#c4813a);" />
                  <span style="font-size:13px;color:var(--cream,#f5ede0);">${nom}</span>
                </label>`;
            }).join('')}
          </div>
          <div style="background:var(--bg-elevated,#2a1508);border-radius:8px;padding:12px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
              📂 Sélectionner le fichier PNG archivé dans Dropbox :</div>
            <input type="file" id="mf-file-pick" accept="image/*"
                   style="width:100%;font-size:12px;" />
          </div>
        </div>
        <div style="padding:10px 16px;border-top:1px solid var(--border,#3b1f0e);
                    display:flex;justify-content:flex-end;gap:8px;">
          <button id="mf-attach" class="btn btn-primary btn-sm">📎 Attacher au devis</button>
        </div>`;

      /* Mettre en valeur le produit sélectionné */
      box.querySelectorAll('input[name="mf-prod"]').forEach(radio => {
        radio.addEventListener('change', () => {
          box.querySelectorAll('[data-prod-id]').forEach(lbl => {
            lbl.style.borderColor = lbl.querySelector('input')?.checked
              ? 'var(--caramel,#c4813a)' : 'transparent';
          });
        });
      });

      box.querySelector('#mf-back')?.addEventListener('click', showCollections);
      box.querySelector('#mf-close')?.addEventListener('click', () => dlg.remove());
      box.querySelector('#mf-attach')?.addEventListener('click', async () => {
        const checked = box.querySelector('input[name="mf-prod"]:checked');
        const fileInp = box.querySelector('#mf-file-pick');
        if (!fileInp || !fileInp.files.length) {
          toast('Choisissez le fichier PNG du mockup archivé.', 'warning'); return;
        }
        const prodId  = checked ? checked.value : '';
        const prodNom = (prodId && _MFW_PROD_NAMES[prodId]) || prodId || coll.name;
        const dataUrl = await _imgToDataUrl(fileInp.files[0]);
        _mockupUrls = [..._mockupUrls, {
          dataUrl,
          nom:    `${_esc(coll.name)} — ${prodNom}`,
          date:   new Date().toISOString().slice(0, 10),
          source: 'MockupForge'
        }];
        _refreshMockupZone();
        dlg.remove();
        toast('Mockup attaché au devis.', 'success');
      });
    }

    showCollections();
  }

  /* Attache les événements de la zone mockup (upload + MockupForge + init) */
  function _bindMockupEvents(doc) {
    /* Initialiser l'état depuis le document en cours */
    _mockupUrls = Array.isArray(doc?.mockupUrls) ? [...doc.mockupUrls] : [];
    _refreshMockupZone();

    /* Bouton Upload */
    document.getElementById('btn-mockup-upload')?.addEventListener('click', () => {
      document.getElementById('mockup-file-input')?.click();
    });

    /* Sélection de fichier(s) */
    document.getElementById('mockup-file-input')?.addEventListener('change', async function() {
      const files = Array.from(this.files || []);
      for (const file of files) {
        const dataUrl = await _imgToDataUrl(file);
        _mockupUrls = [..._mockupUrls, {
          dataUrl,
          nom:    file.name,
          date:   new Date().toISOString().slice(0, 10),
          source: 'Upload'
        }];
      }
      _refreshMockupZone();
      this.value = '';
    });

    /* Bouton MockupForge — collections enregistrées */
    document.getElementById('btn-mockup-auto')?.addEventListener('click', () => {
      _showMockupCollectionPicker();
    });
  }

  /* ================================================================
     DÉTECTION TYPE DE PRODUCTION
     Analyse les lignes d'un devis pour déterminer la technique dominante
     ================================================================ */
  function _detectTypeProduction(lignes) {
    if (!Array.isArray(lignes) || lignes.length === 0) return 'Production';
    const scores = { DTF: 0, Vinyle: 0, Flock: 0, Sticker: 0, Broderie: 0, Sublimation: 0 };
    const patterns = {
      DTF:         /\bdtf\b|transfert|film|gang\s*sheet/i,
      Vinyle:      /\bvinyle\b|vinyl|oracal|flex|signe|covering|d[ée]coupe/i,
      Flock:       /\bflock\b|velour|velvet/i,
      Sticker:     /\bsticker\b|autocollant|[ée]tiquette|label/i,
      Broderie:    /\bbroderie\b|broder|embroid/i,
      Sublimation: /\bsublimation\b|sublim/i,
    };
    lignes.forEach(l => {
      const texte = ((l.produit || '') + ' ' + (l.description || '') + ' ' + (l.technique || '')).toLowerCase();
      for (const [type, re] of Object.entries(patterns)) {
        if (re.test(texte)) scores[type] += (l.qte || 1);
      }
    });
    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'Production';
    const dominant = Object.entries(scores).find(([, v]) => v === max);
    /* Vérifier si plusieurs techniques ont le même score → "Mixte" */
    const nbMax = Object.values(scores).filter(v => v === max).length;
    return nbMax > 1 ? 'Mixte' : dominant[0];
  }

  /* ================================================================
     PUSH PLANNING CARD
     Crée un Ordre de Fabrication depuis un devis / commande confirmé
     ================================================================ */
  function _pushPlanningCard(doc, ref) {
    if (!doc) return;
    try {
      const typeProduction = _detectTypeProduction(doc.lignes);
      /* Utilise le même compteur que Manufacturing._genRefOF() */
      const annee = new Date().getFullYear();
      const refOF = `OF-${annee}-${String(Store.nextCounter('of')).padStart(5, '0')}`;

      /* Postes par défaut selon le type détecté */
      const posteMap = {
        DTF:         'Atelier DTF USA',
        Vinyle:      'Découpe SignMaster',
        Flock:       'Presse Transfert',
        Sticker:     'Découpe SignMaster',
        Broderie:    'Broderie',
        Sublimation: 'Presse Sublimation',
        Mixte:       'BN20 Yannick',
        Production:  'BN20 Yannick',
      };
      const posteNom = posteMap[typeProduction] || 'BN20 Yannick';
      const postes   = Store.getAll('postes');
      const poste    = postes.find(p => p.nom === posteNom) || postes[0] || null;

      /* Résumé lisible du produit principal + quantité totale */
      const lignes = doc.lignes || [];
      const produitLabel = lignes.length > 0
        ? (lignes[0].produit || lignes[0].description || 'Production')
          + (lignes.length > 1 ? ` (+${lignes.length - 1} art.)` : '')
        : (typeProduction + ' — ' + (doc.client || ''));
      const quantiteTotale = lignes.reduce((s, l) => s + (Number(l.qte) || 0), 0) || 1;

      const mockupUrls = Array.isArray(doc.mockupUrls) ? doc.mockupUrls : [];
      const dateFin    = doc.dateLivraison || doc.dateExpiration || '';

      Store.create('ordresFab', {
        reference:       refOF,
        devisOrigineRef: ref || doc.ref || '',
        devisOrigineId:  doc.id || '',
        client:          doc.client || '',
        typeProduction,
        /* Champs attendus par Manufacturing */
        produit:         produitLabel,
        quantite:        quantiteTotale,
        posteId:         poste ? poste.id : '',
        poste:           poste ? poste.nom : posteNom,
        statut:          'Prêt',
        priorite:        'Moyenne',
        progression:     0,
        assigneA:        '',
        dateDebut:       new Date().toISOString().slice(0, 10),
        dateFin,
        lignes,
        mockupUrls,
        totalTTC:        doc.totalTTC || 0,
        notes:           `OF généré depuis ${doc.ref || ref || 'devis'} — Client : ${doc.client || ''}`,
      });

      /* ── Carte planning-dashboard (hcs_planning) ── */
      try {
        const typeMap = {
          DTF: 'dtf', Vinyle: 'vinyle', Flock: 'vinyle', Sticker: 'vinyle',
          Broderie: 'casquette', Sublimation: 'dtf', Mixte: 'multi', Production: 'dtf'
        };
        const planLignes = lignes.map(l => ({
          qte:         Number(l.qte)  || 1,
          produit:     l.produit || l.description || '',
          technique:   l.technique   || typeProduction,
          notesDesign: l.notesDesign || ''
        }));
        /* Priorité selon le délai restant */
        const msDeadline = dateFin ? new Date(dateFin).getTime() - Date.now() : Infinity;
        const priority   = msDeadline < 48 * 3600 * 1000 ? 'urgent' : 'normal';

        const planCard = {
          id:        'erp-' + refOF,
          client:    doc.client || '',
          ref:       doc.ref || ref || refOF,
          canal:     'ERP',
          desc:      produitLabel + (doc.client ? ' — ' + doc.client : ''),
          type:      typeMap[typeProduction] || 'dtf',
          machine:   posteNom,
          qty:       quantiteTotale,
          deadline:  dateFin ? new Date(dateFin).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
          priority,
          notes:     doc.notes || '',
          col:       'attente',
          createdAt: new Date().toISOString(),
          mockupUrls,
          lignes:    planLignes,
        };
        const planning = JSON.parse(localStorage.getItem('hcs_planning') || '[]');
        /* Éviter les doublons si le devis est re-confirmé */
        const existIdx = planning.findIndex(p => p.id === planCard.id);
        if (existIdx >= 0) { planning[existIdx] = { ...planning[existIdx], ...planCard }; }
        else               { planning.push(planCard); }
        localStorage.setItem('hcs_planning', JSON.stringify(planning));

        /* Sync MySQL si disponible (non-bloquant) */
        if (window.MYSQL) {
          const mysqlPayload = {
            store_id:       planCard.id,
            client:         planCard.client   || '',
            ref:            planCard.ref      || '',
            canal:          planCard.canal    || '',
            desc:           planCard.desc     || '',
            type:           planCard.type     || 'dtf',
            machine:        planCard.machine  || '',
            qty:            planCard.qty      || 1,
            deadline:       planCard.deadline || null,
            priority:       planCard.priority || 'normal',
            notes:          planCard.notes    || '',
            col:            planCard.col      || 'attente',
            lignes:         JSON.stringify(planCard.lignes     || []),
            mockup_urls:    JSON.stringify(planCard.mockupUrls || []),
            checklist_prod: JSON.stringify([]),
            reservation:    JSON.stringify(null),
          };
          const existMysqlId = existIdx >= 0 ? planning[existIdx]._mysql_id : null;
          const mysqlOp = existMysqlId
            ? window.MYSQL.update('planning_commandes', existMysqlId, mysqlPayload)
            : window.MYSQL.create('planning_commandes', mysqlPayload);
          mysqlOp.then(res => {
            if (res && res.id) {
              const pl = JSON.parse(localStorage.getItem('hcs_planning') || '[]');
              const i  = pl.findIndex(p => p.id === planCard.id);
              if (i >= 0) { pl[i]._mysql_id = res.id; localStorage.setItem('hcs_planning', JSON.stringify(pl)); }
            }
          }).catch(() => {});
        }
      } catch(ePlan) {
        console.warn('[_pushPlanningCard] hcs_planning write error:', ePlan);
      }

      toast(`🏭 OF ${refOF} créé — carte ajoutée au planning`, 'info', 5000);
    } catch (e) {
      console.warn('[_pushPlanningCard] erreur création OF :', e);
    }
  }

  /* ================================================================
     BRIDGE — expose les fonctions partagées aux modules compagnons
     (sales-quotes.js, sales-orders.js, sales-invoices.js, sales-report.js)
     ================================================================ */
  window._SalesCore = {
    /* État interne partagé */
    _state,
    get _paiementsDevis()  { return _paiementsDevis; },
    set _paiementsDevis(v) { _paiementsDevis = v; },
    get _mockupUrls()      { return _mockupUrls; },
    set _mockupUrls(v)     { _mockupUrls = v; },

    /* Constantes métier */
    STATUTS_DEVIS, BADGE_DEVIS,
    STATUTS_CMD,   BADGE_CMD,
    STATUTS_FAC,   BADGE_FAC,
    STATUTS_BL,    BADGE_BL,
    REG_MODES,     REG_ICONS,
    METHODES_PAIEMENT, TYPES_PAIEMENT,
    CLIENT_TYPES,  ILES_PF,

    /* Utilitaires */
    _esc,
    _badge,
    _fmt,
    _fmtDate,
    _calcTotaux,
    _totalPaiements,
    _genRef,
    _safeFilename,
    _sauverDocDropbox,
    _contactNom,
    _produitOptions,
    _goList,
    _goForm,
    _getDocParams,
    _detectTypeProduction,
    _pushPlanningCard,
    _creerReservationFournisseur,

    /* Table de lignes */
    _renderLineTable,
    _bindLineTableEvents,
    _refreshLineTable,
    _renderTotalsBlock,
    _applyRemiseClient,
    _applyPalierPrix,
    _calcTVAParTaux,

    /* Kanban générique */
    _drawKanban,
    _renderKanbanCard,

    /* Suivi BDC + header formulaire */
    _renderSuiviBDC,
    _renderFormHeader,

    /* Mockup */
    _bindMockupEvents,
    _refreshMockupZone,

    /* Création rapide client */
    _bindClientSelectCreation,
    _openQuickClientModal,

    /* Déduction stock */
    _deductStockFromLines,

    /* Accès au module Sales principal (résolu après init) */
    Sales: () => window.Sales,
  };

  return { init };

})();

window.Sales = Sales;
