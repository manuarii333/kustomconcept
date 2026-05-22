/* ================================================================
   HCS ERP — js/modules/purchases.js
   Module Achats : fournisseurs, bons de commande, rapport achats.
   Pattern IIFE — exposé via window.Purchases
   ================================================================ */

'use strict';

const Purchases = (() => {

  /* ----------------------------------------------------------------
     État interne du module
     ---------------------------------------------------------------- */
  const _state = {
    view:        'suppliers',  // vue active
    mode:        'list',       // 'list' | 'form'
    currentId:   null,         // id du bon de commande en cours
    lignes:      [],           // lignes de la commande en édition
    tauxTVA:     0.16,         // 0 | 0.13 | 0.16
    droitDouane: 0,            // droits/taxes douane non déductibles (cpt 445100)
    tvaImport:   0,            // TVA douane déductible (cpt 445660, inclus dans HT)
    prorataPro:  100           // % utilisation professionnelle (0-100)
  };

  /* ----------------------------------------------------------------
     Constantes
     ---------------------------------------------------------------- */
  const STATUTS_PO = ['Réservation', 'Brouillon', 'Envoyé', 'Confirmé', 'Reçu', 'Annulé'];

  const STATUT_COLORS = {
    'Réservation': 'purple',
    'Brouillon':   'gray',
    'Envoyé':      'blue',
    'Confirmé':    'orange',
    'Reçu':        'green',
    'Annulé':      'red'
  };

  /* ================================================================
     POINT D'ENTRÉE — init(toolbar, area, viewId)
     ================================================================ */
  function init(toolbar, area, viewId) {
    /* Changement de vue → revenir en mode liste */
    if (viewId !== _state.view) {
      _state.view      = viewId;
      _state.mode      = 'list';
      _state.currentId = null;
      _state.lignes    = [];
    }

    switch (_state.view) {
      case 'suppliers':      _renderSuppliers(toolbar, area);     break;
      case 'po':             _renderPO(toolbar, area);            break;
      case 'purchase-report':_renderPurchaseReport(toolbar, area);break;
      default:               _renderSuppliers(toolbar, area);
    }
  }

  /* ================================================================
     VUE : FOURNISSEURS
     ================================================================ */
  function _renderSuppliers(toolbar, area) {
    /* --- Toolbar --- */
    toolbar.innerHTML = `
      <button class="btn btn-primary" id="btn-new-supplier">
        + Nouveau fournisseur
      </button>`;

    toolbar.querySelector('#btn-new-supplier')
      .addEventListener('click', () => _openSupplierForm(null));

    /* --- Table --- */
    const fournisseurs = Store.getAll('fournisseurs');

    area.innerHTML = '<div id="purchases-suppliers-table"></div>';
    renderTable('purchases-suppliers-table', {
      title: 'Fournisseurs',
      data: fournisseurs,
      searchable: true,
      columns: [
        { key: 'nom',            label: 'Nom',        type: 'text',  sortable: true },
        { key: 'contact',        label: 'Contact',    type: 'text'  },
        { key: 'email',          label: 'Email',      type: 'text'  },
        { key: 'telephone',      label: 'Téléphone',  type: 'text'  },
        { key: 'pays',           label: 'Pays',       type: 'text'  },
        { key: 'delaiLivraison', label: 'Délai (j)',  type: 'text'  },
        { key: 'conditions',     label: 'Conditions', type: 'text'  },
        {
          key: '_actions', label: '', type: 'actions',
          actions: [
            { label: '✏️ Modifier',   className: 'btn-ghost', onClick: (row) => _openSupplierForm(row) },
            { label: '🗑 Supprimer',   className: 'btn-ghost danger', onClick: (row) => _deleteSupplier(row) }
          ]
        }
      ],
      emptyMsg: 'Aucun fournisseur enregistré.',
      onRowClick: (row) => _openSupplierForm(row)
    });
  }

  /* Formulaire fournisseur (modal) */
  function _openSupplierForm(fournisseur) {
    const isNew = !fournisseur;
    const titre = isNew ? 'Nouveau fournisseur' : 'Modifier fournisseur';

    const fields = [
      { name: 'nom',            label: 'Nom *',              type: 'text',   required: true,  cols: 2 },
      { name: 'contact',        label: 'Interlocuteur',      type: 'text',   cols: 2 },
      { name: 'email',          label: 'Email',              type: 'email',  cols: 1 },
      { name: 'telephone',      label: 'Téléphone',          type: 'tel',    cols: 1 },
      { name: 'pays',           label: 'Pays',               type: 'text',   cols: 1 },
      { name: 'devise',         label: 'Devise',             type: 'text',   cols: 1 },
      { name: 'delaiLivraison', label: 'Délai livraison (j)',type: 'number', cols: 1 },
      { name: 'conditions',     label: 'Conditions paiement',type: 'text',   cols: 1 },
      { name: 'notes',          label: 'Notes',              type: 'textarea',cols: 2 }
    ];

    showFormModal(titre, fields, fournisseur || {}, (data) => {
      if (isNew) {
        Store.create('fournisseurs', data);
        toastSuccess('Fournisseur créé.');
      } else {
        Store.update('fournisseurs', fournisseur.id, data);
        toastSuccess('Fournisseur mis à jour.');
      }
      _renderSuppliers(
        document.getElementById('toolbar-actions'),
        document.getElementById('view-content')
      );
    }, 'lg');
  }

  /* Suppression fournisseur */
  function _deleteSupplier(fournisseur) {
    showDeleteConfirm(fournisseur.nom, () => {
      Store.remove('fournisseurs', fournisseur.id);
      toastSuccess('Fournisseur supprimé.');
      _renderSuppliers(
        document.getElementById('toolbar-actions'),
        document.getElementById('view-content')
      );
    });
  }

  /* ================================================================
     VUE : BONS DE COMMANDE ACHAT
     ================================================================ */
  function _renderPO(toolbar, area) {
    if (_state.mode === 'form') {
      _renderPOForm(toolbar, area);
    } else {
      _renderPOList(toolbar, area);
    }
  }

  /* ---- Liste des BCA ---- */
  function _renderPOList(toolbar, area) {
    toolbar.innerHTML = `
      <button class="btn btn-primary" id="btn-new-po">
        + Nouveau bon de commande
      </button>
      <button class="btn btn-ghost" id="btn-taux-change" title="Configurer les taux de conversion des devises vers XPF">⚙️ Taux de change</button>`;

    toolbar.querySelector('#btn-taux-change').addEventListener('click', _modalTauxChange);
    toolbar.querySelector('#btn-new-po').addEventListener('click', () => {
      _state.mode      = 'form';
      _state.currentId = null;
      _state.lignes    = [_newLigne()];
      _renderPOForm(toolbar, area);
    });

    const bons = Store.getAll('bonsAchat');

    area.innerHTML = '<div id="purchases-po-table"></div>';
    renderTable('purchases-po-table', {
      title: 'Bons de commande achat',
      data: bons,
      searchable: true,
      columns: [
        { key: 'reference',   label: 'Référence',   type: 'text',  sortable: true },
        { key: 'fournisseur', label: 'Fournisseur', type: 'text',  sortable: true },
        { key: 'date',        label: 'Date',         type: 'date',  sortable: true },
        {
          key: 'totalTTC', label: 'Total TTC', type: 'money',
          render: (row) => fmt(row.totalTTC || 0)
        },
        {
          key: 'statut', label: 'Statut', type: 'badge',
          badgeMap: STATUT_COLORS
        },
        {
          key: '_actions', label: '', type: 'actions',
          actions: [
            { label: '👁 Ouvrir', className: 'btn-ghost', onClick: (row) => _openPO(row) }
          ]
        }
      ],
      emptyMsg: 'Aucun bon de commande.',
      onRowClick: (row) => _openPO(row)
    });
  }

  /* Ouvrir un BC existant */
  function _openPO(bon) {
    _state.mode        = 'form';
    _state.currentId   = bon.id;
    _state.lignes      = deepClone(bon.lignes || [_newLigne()]);
    _state.tauxTVA     = typeof bon.tauxTVA === 'number' ? bon.tauxTVA : (bon.tvaApplicable === false ? 0 : 0.16);
    _state.droitDouane = bon.droitDouane || 0;
    _state.tvaImport   = bon.tvaImport   || 0;
    _state.prorataPro  = typeof bon.prorataPro === 'number' ? bon.prorataPro : 100;
    _renderPOForm(
      document.getElementById('toolbar-actions'),
      document.getElementById('view-content')
    );
  }

  /* ---- Formulaire BCA ---- */
  function _renderPOForm(toolbar, area) {
    const isNew = !_state.currentId;
    const bon   = isNew ? null : Store.getById('bonsAchat', _state.currentId);
    const statut = bon ? bon.statut : 'Brouillon';

    /* ---- Toolbar ---- */
    let toolbarHtml = `<button class="btn btn-ghost" id="btn-po-back">← Retour</button>`;

    if (statut === 'Brouillon') {
      toolbarHtml += `<button class="btn btn-primary" id="btn-save-po">💾 Enregistrer</button>`;
      toolbarHtml += `<button class="btn btn-secondary" id="btn-send-po">📤 Envoyer</button>`;
      toolbarHtml += `<button class="btn btn-ghost" id="btn-import-facture" title="Importer une facture fournisseur (OCR Claude)">📄 Importer facture</button>`;
    }
    if (statut === 'Envoyé') {
      toolbarHtml += `<button class="btn btn-primary" id="btn-save-po">💾 Enregistrer</button>`;
      toolbarHtml += `<button class="btn btn-secondary" id="btn-confirm-po">✅ Confirmer</button>`;
      toolbarHtml += `<button class="btn btn-ghost" id="btn-import-facture" title="Importer une facture fournisseur (OCR Claude)">📄 Importer facture</button>`;
    }
    if (statut === 'Confirmé') {
      toolbarHtml += `<button class="btn btn-success" id="btn-receive-po">📦 Marquer reçu</button>`;
    }
    if (statut !== 'Reçu' && statut !== 'Annulé') {
      toolbarHtml += `<button class="btn btn-ghost danger" id="btn-cancel-po">✕ Annuler</button>`;
    }

    toolbar.innerHTML = toolbarHtml;

    /* Listeners toolbar */
    toolbar.querySelector('#btn-po-back').addEventListener('click', () => {
      _state.mode = 'list';
      _renderPOList(toolbar, area);
    });

    const btnSave    = toolbar.querySelector('#btn-save-po');
    const btnSend    = toolbar.querySelector('#btn-send-po');
    const btnConfirm = toolbar.querySelector('#btn-confirm-po');
    const btnReceive = toolbar.querySelector('#btn-receive-po');
    const btnCancel  = toolbar.querySelector('#btn-cancel-po');

    if (btnSave)    btnSave.addEventListener('click',    () => _savePO('Brouillon'));
    if (btnSend)    btnSend.addEventListener('click',    () => _savePO('Envoyé'));
    if (btnConfirm) btnConfirm.addEventListener('click', () => _savePO('Confirmé'));
    if (btnReceive) btnReceive.addEventListener('click', () => _receivePO());
    if (btnCancel)  btnCancel.addEventListener('click',  () => {
      showConfirm('Annuler ce bon de commande ?', () => {
        _savePO('Annulé');
      }, null, 'Annuler le BC', true);
    });

    const btnImport = toolbar.querySelector('#btn-import-facture');
    if (btnImport) btnImport.addEventListener('click', () => _importerFactureOCR(statut));

    /* ---- Fournisseurs pour le select ---- */
    const fournisseurs = Store.getAll('fournisseurs');
    const foptions = fournisseurs.map(f => ({ value: f.nom, label: f.nom }));

    /* ---- Données actuelles ---- */
    const ref    = bon ? bon.reference : _genRef();
    const fnom   = bon ? bon.fournisseur : '';
    const date   = bon ? bon.date : new Date().toISOString().slice(0, 10);
    const notes  = bon ? (bon.notes || '') : '';
    const echeance = bon ? (bon.echeance || '') : '';

    /* ---- HTML du formulaire ---- */
    area.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:24px 0;">

        <!-- En-tête -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;">
          <div>
            <div style="font-size:22px;font-weight:700;color:var(--text-primary);">${_escP(ref)}</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">
              Statut :
              <span style="font-weight:600;color:${_badgeColor(statut)};">${statut}</span>
            </div>
          </div>
        </div>

        <!-- Champs principaux -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
          <div class="form-group">
            <label class="form-label">Fournisseur *</label>
            <select id="po-fournisseur" class="form-input" ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}>
              <option value="">— Sélectionner —</option>
              ${foptions.map(o => `<option value="${_escP(o.value)}" ${fnom === o.value ? 'selected' : ''}>${_escP(o.label)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date commande</label>
            <input id="po-date" type="date" class="form-input" value="${date}"
              ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}>
          </div>
          <div class="form-group">
            <label class="form-label">Date échéance</label>
            <input id="po-echeance" type="date" class="form-input" value="${echeance}"
              ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}>
          </div>
        </div>

        <!-- Table des lignes -->
        <div style="margin-bottom:24px;">
          <div style="font-size:13px;font-weight:600;color:var(--text-secondary);
            text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px;">
            Lignes de commande
          </div>
          <table style="width:100%;border-collapse:collapse;" id="po-line-table">
            <thead>
              <tr style="border-bottom:1px solid var(--border);">
                <th style="${_th()}">Produit</th>
                <th style="${_th()}">Description</th>
                <th style="${_th()} text-align:right;">Qté</th>
                <th style="${_th()} text-align:right;">Coût HT (XPF)</th>
                <th style="${_th()} text-align:center;">TVA</th>
                <th style="${_th()} text-align:right;">Total HT</th>
                ${statut !== 'Reçu' && statut !== 'Annulé' ? `<th style="${_th()}"></th>` : ''}
              </tr>
            </thead>
            <tbody id="po-lignes-body">
              ${_renderLignesHTML(statut)}
            </tbody>
          </table>
          ${statut !== 'Reçu' && statut !== 'Annulé' ? `
          <button id="btn-add-ligne" class="btn btn-ghost" style="margin-top:10px;">
            + Ajouter une ligne
          </button>` : ''}
        </div>

        <!-- Totaux -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
          <div style="min-width:340px;border:1px solid var(--border);border-radius:8px;padding:16px;">

            <!-- TVA par défaut nouvelles lignes -->
            <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);">
              <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:4px;">
                TVA par défaut (nouvelles lignes)
              </label>
              <select id="po-tva-select" ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}
                style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;
                       background:var(--bg-secondary);color:var(--text-primary);font-size:13px;">
                <option value="0"    ${_state.tauxTVA === 0    ? 'selected' : ''}>0 % — Étranger / hors Polynésie</option>
                <option value="0.13" ${_state.tauxTVA === 0.13 ? 'selected' : ''}>13 % — Services (Polynésie)</option>
                <option value="0.16" ${_state.tauxTVA === 0.16 ? 'selected' : ''}>16 % — Produits / marchandises (Polynésie)</option>
              </select>
            </div>

            <!-- Total HT -->
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;">
              <span style="color:var(--text-secondary);">Total HT</span>
              <span id="po-total-ht" style="font-family:var(--font-mono);">0 XPF</span>
            </div>

            <!-- Détail TVA par taux (injecté dynamiquement) -->
            <div id="po-tva-breakdown" style="margin-bottom:6px;"></div>

            <!-- Prorata pro -->
            <div id="po-prorata-wrap" style="margin-bottom:8px;padding:8px;
                 background:var(--bg-tertiary,rgba(255,255,255,.04));border-radius:6px;display:none;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <label style="font-size:12px;color:var(--text-secondary);flex:1;">Prorata utilisation pro</label>
                <input id="po-prorata" type="number" min="0" max="100" step="5"
                  value="${_state.prorataPro}"
                  ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}
                  style="width:65px;padding:3px 6px;border:1px solid var(--border);border-radius:5px;
                         background:var(--bg-secondary);color:var(--text-primary);font-size:13px;text-align:right;">
                <span style="font-size:13px;color:var(--text-secondary);">%</span>
              </div>
              <div id="po-prorata-detail" style="font-size:11px;"></div>
            </div>

            <!-- Débours inclus dans HT (transitaire) -->
            <div style="margin-bottom:6px;padding:10px;border:1px solid var(--border);
                 border-radius:6px;background:var(--bg-tertiary,rgba(255,255,255,.03));">
              <div style="font-size:11px;font-weight:600;color:var(--text-secondary);
                   text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">
                Débours inclus dans HT (transitaire)
              </div>

              <!-- Droits de douane -->
              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:1px;">
                  <span style="color:var(--text-secondary);">Droits / taxes douane</span>
                  <input id="po-droit-douane" type="number" min="0" step="1"
                    value="${_state.droitDouane || 0}"
                    ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}
                    style="width:110px;padding:3px 7px;border:1px solid var(--border);border-radius:5px;
                           background:var(--bg-secondary);color:var(--text-primary);
                           font-family:var(--font-mono);font-size:13px;text-align:right;">
                </div>
                <div style="font-size:11px;color:var(--text-muted,#888);text-align:right;">
                  ✗ Non déductible — cpt 445100
                </div>
              </div>

              <!-- TVA import déductible -->
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:1px;">
                  <span style="color:var(--text-secondary);">TVA import (douane)</span>
                  <input id="po-tva-import" type="number" min="0" step="1"
                    value="${_state.tvaImport || 0}"
                    ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}
                    style="width:110px;padding:3px 7px;border:1px solid var(--border);border-radius:5px;
                           background:var(--bg-secondary);color:var(--text-primary);
                           font-family:var(--font-mono);font-size:13px;text-align:right;">
                </div>
                <div style="font-size:11px;color:var(--accent-green,#4caf50);text-align:right;">
                  ✓ Déductible — cpt 445660 (inclus dans HT)
                </div>
              </div>
            </div>

            <!-- Total TTC -->
            <div style="display:flex;justify-content:space-between;font-size:16px;
              font-weight:700;border-top:1px solid var(--border);padding-top:10px;">
              <span style="color:var(--text-primary);">Total TTC</span>
              <span id="po-total-ttc" style="font-family:var(--font-mono);color:var(--accent-blue);">0 XPF</span>
            </div>

          </div>
        </div>

        <!-- Notes -->
        <div class="form-group" style="margin-bottom:24px;">
          <label class="form-label">Notes internes</label>
          <textarea id="po-notes" class="form-input" rows="3"
            style="resize:vertical;"
            ${statut === 'Reçu' || statut === 'Annulé' ? 'disabled' : ''}
            placeholder="Instructions au fournisseur, références internes…">${notes}</textarea>
        </div>

      </div>`;

    /* Bind événements lignes */
    _bindPOLigneEvents(statut);
    _updatePOTotaux();
  }

  /* Génère le HTML des lignes */
  function _renderLignesHTML(statut) {
    const produits = Store.getAll('produits');
    const readonly = statut === 'Reçu' || statut === 'Annulé';

    return _state.lignes.map((l, i) => {
      const totalLigne = (l.qte || 0) * (l.prixUnitaire || 0);
      return `
        <tr data-idx="${i}" style="border-bottom:1px solid var(--border-subtle);">
          <td style="${_td()}">
            ${readonly
              ? `<span>${_escP(l.produitNom || '—')}</span>`
              : `<select class="form-input ligne-produit" data-idx="${i}"
                  style="font-size:13px;padding:6px 8px;">
                  <option value="">— Aucun —</option>
                  ${produits.map(p =>
                    `<option value="${p.id}" ${l.produitId === p.id ? 'selected' : ''}>
                      ${_escP(p.emoji || '')} ${_escP(p.nom)}</option>`
                  ).join('')}
                </select>`
            }
          </td>
          <td style="${_td()}">
            ${readonly
              ? `<span>${_escP(l.description || '')}</span>`
              : `<input class="form-input ligne-desc" data-idx="${i}" type="text"
                  value="${_escP(l.description || '')}" placeholder="Description…"
                  style="font-size:13px;padding:6px 8px;">`
            }
          </td>
          <td style="${_td()} text-align:right;width:80px;">
            ${readonly
              ? `<span>${l.qte || 0}</span>`
              : `<input class="form-input ligne-qte" data-idx="${i}" type="number"
                  value="${l.qte || 1}" min="1"
                  style="font-size:13px;padding:6px 8px;text-align:right;width:70px;">`
            }
          </td>
          <td style="${_td()} text-align:right;width:150px;">
            ${readonly
              ? `<span>${fmt(l.prixUnitaire || 0)}</span>`
              : `<input class="form-input ligne-prix" data-idx="${i}" type="number"
                  value="${l.prixUnitaire || 0}" min="0"
                  style="font-size:13px;padding:6px 8px;text-align:right;width:120px;">`
            }
          </td>
          <td style="${_td()} text-align:center;width:80px;">
            ${(() => {
              const lt = typeof l.tauxTVA === 'number' ? l.tauxTVA : (_state.tauxTVA || 0);
              if (readonly) {
                return `<span style="font-size:12px;font-weight:600;">${lt === 0 ? '0%' : lt === 0.13 ? '13%' : '16%'}</span>`;
              }
              return `<select class="form-input ligne-tva" data-idx="${i}"
                style="font-size:12px;padding:4px 5px;width:72px;">
                <option value="0"    ${lt === 0    ? 'selected':''}>0%</option>
                <option value="0.13" ${lt === 0.13 ? 'selected':''}>13%</option>
                <option value="0.16" ${lt === 0.16 ? 'selected':''}>16%</option>
              </select>`;
            })()}
          </td>
          <td style="${_td()} text-align:right;font-family:var(--font-mono);font-size:13px;"
            id="po-ligne-total-${i}">
            ${fmt(totalLigne)}
          </td>
          ${!readonly ? `
          <td style="${_td()} width:40px;">
            <button class="btn btn-ghost danger btn-del-ligne" data-idx="${i}"
              style="padding:4px 8px;font-size:12px;">✕</button>
          </td>` : ''}
        </tr>`;
    }).join('');
  }

  /* Bind événements sur la table des lignes */
  function _bindPOLigneEvents(statut) {
    if (statut === 'Reçu' || statut === 'Annulé') return;

    const tbody = document.getElementById('po-lignes-body');
    if (!tbody) return;

    /* Délégation sur le tbody */
    tbody.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      if (isNaN(idx)) return;

      if (e.target.classList.contains('ligne-produit')) {
        const produitId = e.target.value;
        if (produitId) {
          const produit = Store.getById('produits', produitId);
          if (produit) {
            _state.lignes[idx].produitId    = produitId;
            _state.lignes[idx].produitNom   = produit.nom;
            _state.lignes[idx].description  = produit.nom;
            _state.lignes[idx].prixUnitaire = produit.cout || 0;
          }
        } else {
          _state.lignes[idx].produitId  = null;
          _state.lignes[idx].produitNom = '';
        }
        _refreshPOLignes(statut);
      }
      if (e.target.classList.contains('ligne-qte')) {
        _state.lignes[idx].qte = parseFloat(e.target.value) || 0;
        _updateLigneTotaux(idx);
        _updatePOTotaux();
      }
      if (e.target.classList.contains('ligne-prix')) {
        _state.lignes[idx].prixUnitaire = parseFloat(e.target.value) || 0;
        _updateLigneTotaux(idx);
        _updatePOTotaux();
      }
      if (e.target.classList.contains('ligne-tva')) {
        _state.lignes[idx].tauxTVA = parseFloat(e.target.value) || 0;
        _updatePOTotaux();
      }
      if (e.target.classList.contains('ligne-desc')) {
        _state.lignes[idx].description = e.target.value;
      }
    });

    tbody.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      if (isNaN(idx)) return;
      if (e.target.classList.contains('ligne-qte') ||
          e.target.classList.contains('ligne-prix')) {
        const val = parseFloat(e.target.value) || 0;
        if (e.target.classList.contains('ligne-qte')) _state.lignes[idx].qte = val;
        else _state.lignes[idx].prixUnitaire = val;
        _updateLigneTotaux(idx);
        _updatePOTotaux();
      }
    });

    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-del-ligne');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx);
      if (_state.lignes.length > 1) {
        _state.lignes.splice(idx, 1);
        _refreshPOLignes(statut);
        _updatePOTotaux();
      } else {
        toastWarning('Au moins une ligne est requise.');
      }
    });

    const btnAdd = document.getElementById('btn-add-ligne');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        _state.lignes.push(_newLigne());
        _refreshPOLignes(statut);
      });
    }

    /* Sélecteur taux TVA */
    const selTVA = document.getElementById('po-tva-select');
    if (selTVA) {
      selTVA.addEventListener('change', () => {
        _state.tauxTVA = parseFloat(selTVA.value) || 0;
        _updatePOTotaux();
      });
    }

    /* Droits de douane */
    const inpDD = document.getElementById('po-droit-douane');
    if (inpDD) {
      inpDD.addEventListener('input', () => {
        _state.droitDouane = parseFloat(inpDD.value) || 0;
        _updatePOTotaux();
      });
    }

    /* TVA import déductible */
    const inpTVAImp = document.getElementById('po-tva-import');
    if (inpTVAImp) {
      inpTVAImp.addEventListener('input', () => {
        _state.tvaImport = parseFloat(inpTVAImp.value) || 0;
        _updatePOTotaux();
      });
    }

    /* Prorata pro */
    const inpProrata = document.getElementById('po-prorata');
    if (inpProrata) {
      inpProrata.addEventListener('input', () => {
        _state.prorataPro = Math.min(100, Math.max(0, parseFloat(inpProrata.value) || 100));
        _updatePOTotaux();
      });
    }
  }

  /* ================================================================
     IMPORT FACTURE OCR — Claude (Image / PDF / CSV)
     ================================================================ */
  function _importerFactureOCR(statut) {
    const apiKey = localStorage.getItem('hcs_anthropic_key') || '';
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      toast('Clé API Claude non configurée — renseignez-la dans le Scanner OCR (Outils HCS).', 'error', 5000);
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'ocr-import-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:12px;
                  padding:28px;width:500px;max-width:95vw;display:flex;flex-direction:column;gap:16px;">
        <div style="font-size:16px;font-weight:700;color:var(--text-primary);">
          📄 Importer une facture fournisseur
        </div>
        <p style="font-size:13px;color:var(--text-muted);">
          Formats acceptés : <strong>Image</strong> (JPG, PNG, WebP) · <strong>PDF</strong> · <strong>CSV</strong>
        </p>

        <div id="ocr-drop" style="border:2px dashed var(--border);border-radius:8px;padding:28px 16px;
                text-align:center;cursor:pointer;transition:border-color .2s;min-height:120px;
                display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;">
          <div id="ocr-preview-wrap" style="display:none;width:100%;">
            <img id="ocr-preview-img" style="max-height:140px;max-width:100%;border-radius:6px;object-fit:contain;display:none;">
            <div id="ocr-preview-icon" style="font-size:48px;display:none;"></div>
            <p id="ocr-preview-name" style="font-size:12px;color:var(--text-muted);margin-top:6px;"></p>
            <div id="ocr-csv-preview" style="display:none;text-align:left;font-size:11px;font-family:monospace;
              background:var(--bg-base);border:1px solid var(--border);border-radius:6px;padding:8px;
              max-height:100px;overflow:auto;color:var(--text-secondary);margin-top:6px;white-space:pre;"></div>
          </div>
          <div id="ocr-drop-hint" style="color:var(--text-muted);font-size:13px;">
            📁 Cliquez ou glissez un fichier ici<br>
            <span style="font-size:11px;opacity:.6;">Image · PDF · CSV</span>
          </div>
        </div>
        <input type="file" id="ocr-file-input" accept="image/*,.pdf,.csv,.txt" style="display:none;">

        <div id="ocr-status" style="display:none;font-size:13px;color:var(--accent-blue);"></div>
        <div id="ocr-error"  style="display:none;font-size:13px;color:var(--accent-red);"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="ocr-btn-cancel" class="btn btn-ghost">Annuler</button>
          <button id="ocr-btn-analyser" class="btn btn-primary" disabled>🔍 Analyser et importer</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    /* fileData : { kind: 'image'|'pdf'|'csv', base64, mimeType, text, name } */
    let fileData = null;

    const dropZone = overlay.querySelector('#ocr-drop');
    dropZone.addEventListener('click', () => overlay.querySelector('#ocr-file-input').click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent-blue)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)'; });
    dropZone.addEventListener('drop', e => {
      e.preventDefault(); dropZone.style.borderColor = 'var(--border)';
      if (e.dataTransfer.files[0]) _loadFile(e.dataTransfer.files[0]);
    });
    overlay.querySelector('#ocr-file-input').addEventListener('change', e => {
      if (e.target.files[0]) _loadFile(e.target.files[0]);
    });

    function _showPreview(kind, name, size) {
      overlay.querySelector('#ocr-drop-hint').style.display    = 'none';
      overlay.querySelector('#ocr-preview-wrap').style.display = 'block';
      overlay.querySelector('#ocr-preview-name').textContent   = name + ' — ' + (size / 1024).toFixed(0) + ' Ko';
      overlay.querySelector('#ocr-btn-analyser').disabled      = false;
    }

    function _loadFile(file) {
      const name = file.name.toLowerCase();
      const isCSV = name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv' || file.type === 'text/plain';
      const isPDF = name.endsWith('.pdf') || file.type === 'application/pdf';
      const isImg = file.type.startsWith('image/');

      if (isCSV) {
        const reader = new FileReader();
        reader.onload = ev => {
          fileData = { kind: 'csv', text: ev.target.result, name: file.name };
          _showPreview('csv', file.name, file.size);
          overlay.querySelector('#ocr-preview-icon').textContent  = '📊';
          overlay.querySelector('#ocr-preview-icon').style.display = 'block';
          const csvPrev = overlay.querySelector('#ocr-csv-preview');
          csvPrev.style.display = 'block';
          csvPrev.textContent = ev.target.result.split('\n').slice(0, 6).join('\n');
        };
        reader.readAsText(file);

      } else if (isPDF) {
        const reader = new FileReader();
        reader.onload = ev => {
          const base64 = btoa(String.fromCharCode(...new Uint8Array(ev.target.result)));
          fileData = { kind: 'pdf', base64, mimeType: 'application/pdf', name: file.name };
          _showPreview('pdf', file.name, file.size);
          overlay.querySelector('#ocr-preview-icon').textContent  = '📋';
          overlay.querySelector('#ocr-preview-icon').style.display = 'block';
        };
        reader.readAsArrayBuffer(file);

      } else if (isImg) {
        const reader = new FileReader();
        reader.onload = ev => {
          const dataUrl = ev.target.result;
          fileData = { kind: 'image', base64: dataUrl.split(',')[1], mimeType: dataUrl.split(';')[0].split(':')[1], name: file.name };
          _showPreview('image', file.name, file.size);
          const img = overlay.querySelector('#ocr-preview-img');
          img.src = dataUrl; img.style.display = 'block';
        };
        reader.readAsDataURL(file);

      } else {
        overlay.querySelector('#ocr-error').style.display = 'block';
        overlay.querySelector('#ocr-error').textContent = '❌ Format non supporté. Utilisez une image, un PDF ou un CSV.';
      }
    }

    overlay.querySelector('#ocr-btn-cancel').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#ocr-btn-analyser').addEventListener('click', async () => {
      if (!fileData) return;
      const statusEl = overlay.querySelector('#ocr-status');
      const errorEl  = overlay.querySelector('#ocr-error');
      const btnA     = overlay.querySelector('#ocr-btn-analyser');

      btnA.disabled = true;
      statusEl.style.display = 'block';
      statusEl.textContent = fileData.kind === 'csv'
        ? '⏳ Lecture du CSV par Claude…'
        : '⏳ Analyse en cours avec Claude Vision…';
      errorEl.style.display = 'none';

      const prompt = `Tu es un expert comptable. Analyse ce document fournisseur et extrais les informations en JSON strict.

Réponds UNIQUEMENT avec ce JSON valide (sans markdown, sans explication) :
{
  "fournisseur": "nom exact du fournisseur",
  "date": "YYYY-MM-DD",
  "numero": "numéro de facture ou commande",
  "devise": "USD ou EUR ou XPF ou autre code ISO",
  "articles": [
    {"description": "libellé produit/service", "quantite": 1, "prix_unitaire_ht": 0}
  ],
  "notes": "observations importantes ou null"
}

RÈGLES CRITIQUES pour prix_unitaire_ht :
- Capture le PRIX UNITAIRE APRÈS REMISE visible sur la ligne (ex: si $11.99 est barré et $8.89 affiché, utilise 8.89)
- Copie le NOMBRE COMPLET incluant la partie entière ET décimale (ex: 8.89, jamais 0.89 ni .89)
- Si le document montre "$8.89" tu dois retourner 8.89 (pas 0.89, pas 89)
- Pour quantité : utilise la quantité réelle commandée
- Pour devise : USD si symbole $, EUR si symbole €, sinon XPF
- Si une information est absente, mets null.`;

      /* Construction du contenu selon le type de fichier */
      let messageContent;
      if (fileData.kind === 'image') {
        messageContent = [
          { type: 'image', source: { type: 'base64', media_type: fileData.mimeType, data: fileData.base64 } },
          { type: 'text', text: prompt }
        ];
      } else if (fileData.kind === 'pdf') {
        messageContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData.base64 } },
          { type: 'text', text: prompt }
        ];
      } else {
        /* CSV : texte brut inclus dans le prompt */
        const csvContent = fileData.text.slice(0, 8000); /* limite sécurité */
        messageContent = [{
          type: 'text',
          text: `${prompt}\n\nVoici le contenu du fichier CSV :\n\`\`\`\n${csvContent}\n\`\`\``
        }];
      }

      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: fileData.kind === 'csv' ? 'claude-haiku-4-5-20251001' : 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            messages: [{ role: 'user', content: messageContent }]
          })
        });

        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error?.message || 'Erreur API ' + resp.status);
        }

        const data    = await resp.json();
        const raw     = (data.content[0]?.text || '').trim();
        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const json    = JSON.parse(cleaned);

        _appliquerDonneesOCR(json, statut);
        statusEl.textContent = '✅ Import réussi — vérifiez et complétez les données.';
        setTimeout(() => overlay.remove(), 1200);

      } catch (err) {
        btnA.disabled = false;
        statusEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = '❌ ' + err.message;
      }
    });
  }

  /* Modal configuration des taux de change */
  function _modalTauxChange() {
    const DEFAUTS = { USD: 119, EUR: 119, GBP: 150, AUD: 77, CAD: 87, JPY: 0.79 };
    const stockes = JSON.parse(localStorage.getItem('hcs_taux_change') || '{}');
    const taux = Object.assign({}, DEFAUTS, stockes);

    const lignes = Object.entries(taux).map(([devise, val]) => `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <label style="width:50px;font-weight:600;color:var(--text-primary);">${devise}</label>
        <span style="color:var(--text-secondary);flex:1;">1 ${devise} =</span>
        <input id="taux-${devise}" type="number" step="0.01" min="0" value="${val}"
          style="width:100px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;
                 background:var(--bg-secondary);color:var(--text-primary);text-align:right;">
        <span style="color:var(--text-secondary);">XPF</span>
      </div>`).join('');

    const html = `
      <div style="padding:4px 0;">
        <p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">
          Ces taux sont utilisés pour convertir les montants lors de l'import OCR d'une facture.
        </p>
        ${lignes}
        <p style="color:var(--text-secondary);font-size:12px;margin-top:12px;">
          Défauts : USD=119, EUR=119, GBP=150, AUD=77, CAD=87, JPY=0.79
        </p>
        <div class="modal-footer" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border);
             display:flex;justify-content:flex-end;gap:8px;">
          <button class="btn btn-ghost" id="modal-reset-taux">↺ Réinitialiser</button>
          <button class="btn btn-primary" id="modal-save-taux">💾 Enregistrer</button>
        </div>
      </div>`;

    showModal('⚙️ Taux de change → XPF', html, null, '', 'md');

    setTimeout(() => {
      const btnReset = document.getElementById('modal-reset-taux');
      const btnSave  = document.getElementById('modal-save-taux');
      if (btnReset) btnReset.addEventListener('click', () => {
        localStorage.removeItem('hcs_taux_change');
        Object.entries(DEFAUTS).forEach(([dev, val]) => {
          const el = document.getElementById(`taux-${dev}`);
          if (el) el.value = val;
        });
        toast('Taux réinitialisés aux valeurs par défaut.', 'info');
      });
      if (btnSave) btnSave.addEventListener('click', () => {
        const nouveaux = {};
        Object.keys(DEFAUTS).forEach(dev => {
          const el = document.getElementById(`taux-${dev}`);
          if (el) nouveaux[dev] = parseFloat(el.value) || DEFAUTS[dev];
        });
        localStorage.setItem('hcs_taux_change', JSON.stringify(nouveaux));
        closeModal();
        toast('Taux de change enregistrés.', 'success');
      });
    }, 50);
  }

  /* Applique les données OCR dans le formulaire BC */
  function _appliquerDonneesOCR(json, statut) {
    /* Taux de conversion vers XPF — lit localStorage, fallback sur les défauts */
    const DEFAUTS = { USD: 119, EUR: 119, GBP: 150, AUD: 77, CAD: 87, JPY: 0.79 };
    const stockes = JSON.parse(localStorage.getItem('hcs_taux_change') || '{}');
    const TAUX = Object.assign({}, DEFAUTS, stockes);
    const devise  = (json.devise || 'XPF').toUpperCase();
    const taux    = TAUX[devise] || 1;
    const convertir = devise !== 'XPF' && taux !== 1;

    /* Fournisseur — cherche correspondance dans la liste */
    if (json.fournisseur) {
      const sel = document.getElementById('po-fournisseur');
      if (sel) {
        const nomLower = json.fournisseur.toLowerCase();
        let bestOpt = null;
        for (const opt of sel.options) {
          if (opt.value && opt.value.toLowerCase().includes(nomLower.slice(0, 6))) {
            bestOpt = opt; break;
          }
        }
        if (bestOpt) sel.value = bestOpt.value;
      }
    }

    /* Date */
    if (json.date) {
      const dateEl = document.getElementById('po-date');
      if (dateEl) dateEl.value = json.date;
    }

    /* Notes — inclut le taux appliqué si conversion */
    const notesEl = document.getElementById('po-notes');
    if (notesEl) {
      let note = json.notes ? 'OCR: ' + json.notes : '';
      if (convertir) note = `[Converti ${devise}→XPF @ ${taux}] ` + note;
      if (note) notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + note;
    }

    /* Lignes produits avec conversion devise */
    if (Array.isArray(json.articles) && json.articles.length > 0) {
      const produits = Store.getAll('produits');
      _state.lignes = json.articles.map(a => {
        const descLower   = (a.description || '').toLowerCase();
        const produit     = produits.find(p => descLower.includes((p.nom || '').toLowerCase().slice(0, 5)));
        const prixSource  = parseFloat(a.prix_unitaire_ht) || 0;
        const prixXPF     = convertir ? Math.round(prixSource * taux) : prixSource;
        return {
          produitId:    produit ? produit.id : null,
          produitNom:   produit ? produit.nom : '',
          description:  a.description || '',
          qte:          parseFloat(a.quantite) || 1,
          prixUnitaire: prixXPF
        };
      });
    }

    /* Facture étrangère → TVA 0% automatiquement */
    if (convertir) {
      _state.tauxTVA = 0;
      const sel = document.getElementById('po-tva-select');
      if (sel) sel.value = '0';
    }

    _refreshPOLignes(statut);
    _updatePOTotaux();
    const msg = convertir
      ? `📄 Facture importée — prix convertis ${devise} → XPF (taux ${taux}) · TVA désactivée (fournisseur étranger). Vérifiez avant d'enregistrer.`
      : `📄 Facture importée — vérifiez les données avant d'enregistrer.`;
    toast(msg, 'success', 5000);
  }

  /* Rafraîchit le tableau des lignes (sans rerender tout le formulaire) */
  function _refreshPOLignes(statut) {
    const tbody = document.getElementById('po-lignes-body');
    if (tbody) tbody.innerHTML = _renderLignesHTML(statut);
    _bindPOLigneEvents(statut);
    _updatePOTotaux();
  }

  /* Met à jour le total d'une ligne individuelle */
  function _updateLigneTotaux(idx) {
    const l     = _state.lignes[idx];
    const total = (l.qte || 0) * (l.prixUnitaire || 0);
    const el    = document.getElementById(`po-ligne-total-${idx}`);
    if (el) el.textContent = fmt(total);
  }

  /* Recalcule et affiche les totaux HT/TVA/TTC */
  function _updatePOTotaux() {
    /* Agréger HT par taux de TVA ligne par ligne */
    const groupes = {};
    _state.lignes.forEach(l => {
      const t  = typeof l.tauxTVA === 'number' ? l.tauxTVA : (_state.tauxTVA || 0);
      const ht = (l.qte || 0) * (l.prixUnitaire || 0);
      groupes[t] = (groupes[t] || 0) + ht;
    });

    const totalHT  = Object.values(groupes).reduce((s, v) => s + v, 0);
    let   totalTVA = 0;
    Object.entries(groupes).forEach(([t, base]) => { totalTVA += base * parseFloat(t); });
    totalTVA = Math.round(totalTVA);

    const droitDD  = _state.droitDouane || 0;
    const totalTTC = Math.round(totalHT + totalTVA + droitDD);
    const prorata  = Math.min(100, Math.max(0, _state.prorataPro ?? 100)) / 100;
    const tvaDed   = Math.round(totalTVA * prorata);
    const tvaND    = totalTVA - tvaDed;
    const hasTVA   = totalTVA > 0;

    /* Affichage totaux */
    const elHT  = document.getElementById('po-total-ht');
    const elTTC = document.getElementById('po-total-ttc');
    if (elHT)  elHT.textContent  = fmt(Math.round(totalHT));
    if (elTTC) elTTC.textContent = fmt(totalTTC);

    /* Détail TVA par taux */
    const elBreakdown = document.getElementById('po-tva-breakdown');
    if (elBreakdown) {
      const taux = Object.keys(groupes).map(Number).sort((a, b) => b - a);
      elBreakdown.innerHTML = taux.map(t => {
        const base   = Math.round(groupes[t]);
        const tvaAmt = Math.round(groupes[t] * t);
        const pct    = t === 0 ? '0%' : t === 0.13 ? '13%' : '16%';
        const note   = t === 0
          ? `<div style="font-size:11px;color:#888;margin-bottom:4px;">Non applicable — fournisseur étranger</div>`
          : `<div style="font-size:11px;color:var(--accent-green,#4caf50);margin-bottom:4px;">✓ Déductible — cpt 445660</div>`;
        return `
          <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);">
            <span>Base HT ${pct}</span><span style="font-family:var(--font-mono);">${fmt(base)} XPF</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:2px;">
            <span style="color:var(--text-secondary);">TVA ${pct}</span>
            <span style="font-family:var(--font-mono);">${fmt(tvaAmt)} XPF</span>
          </div>${note}`;
      }).join('');
    }

    /* Prorata — visible si TVA > 0 */
    const elWrap   = document.getElementById('po-prorata-wrap');
    const elDetail = document.getElementById('po-prorata-detail');
    if (elWrap)   elWrap.style.display = hasTVA ? 'block' : 'none';
    if (elDetail && hasTVA) {
      elDetail.innerHTML = prorata >= 1
        ? `<span style="color:var(--accent-green,#4caf50);">✓ 100% déductible — cpt 445660 : ${fmt(tvaDed)} XPF</span>`
        : `<span style="color:var(--accent-green,#4caf50);">✓ Déductible 445660 : ${fmt(tvaDed)} XPF</span><br>` +
          `<span style="color:var(--accent-orange,#f0a030);">⚠ En charge 607000 : ${fmt(tvaND)} XPF</span>`;
    }
  }

  /* Sauvegarde le BC avec le statut indiqué */
  function _savePO(statut) {
    const fournisseur = document.getElementById('po-fournisseur')?.value;
    if (!fournisseur) { toastError('Veuillez sélectionner un fournisseur.'); return; }

    const date      = document.getElementById('po-date')?.value    || new Date().toISOString().slice(0,10);
    const echeance  = document.getElementById('po-echeance')?.value || '';
    const notes     = document.getElementById('po-notes')?.value    || '';

    /* Lire les descriptions saisies manuellement */
    document.querySelectorAll('.ligne-desc').forEach((el, i) => {
      if (_state.lignes[i]) _state.lignes[i].description = el.value;
    });

    const totalHT     = _state.lignes.reduce((s, l) => s + (l.qte || 0) * (l.prixUnitaire || 0), 0);
    const tauxTVA     = _state.tauxTVA || 0;
    const totalTVA    = Math.round(totalHT * tauxTVA);
    const prorataPro  = Math.min(100, Math.max(0, _state.prorataPro ?? 100));
    const tvaDed      = Math.round(totalTVA * prorataPro / 100);
    const tvaND       = totalTVA - tvaDed;
    const droitDouane = Math.round(_state.droitDouane || 0);
    const totalTTC    = Math.round(totalHT + totalTVA + droitDouane);

    const tvaImport = Math.round(_state.tvaImport || 0);

    const data = {
      fournisseur,
      date,
      echeance,
      notes,
      statut,
      tauxTVA,
      prorataPro,
      tvaDed,
      tvaND,
      droitDouane,
      tvaImport,
      lignes:   deepClone(_state.lignes),
      totalHT:  Math.round(totalHT),
      totalTVA,
      totalTTC
    };

    if (_state.currentId) {
      Store.update('bonsAchat', _state.currentId, data);
      toastSuccess('Bon de commande mis à jour.');
    } else {
      const ref = _genRef();
      const created = Store.create('bonsAchat', { ...data, reference: ref });
      _state.currentId = created.id;
      toastSuccess('Bon de commande créé.');
    }

    /* Re-render le formulaire pour refléter le nouveau statut */
    _renderPOForm(
      document.getElementById('toolbar-actions'),
      document.getElementById('view-content')
    );
  }

  /* Marquer le BC comme reçu → mise à jour stock + mouvements + comptabilité */
  function _receivePO() {
    if (!_state.currentId) return;
    const bon = Store.getById('bonsAchat', _state.currentId);
    if (!bon) return;

    showConfirm(
      `Confirmer la réception de "${bon.reference}" ?\nLes stocks seront mis à jour automatiquement.`,
      () => {
        const today = new Date().toISOString().slice(0, 10);

        /* 1. Mise à jour du stock pour chaque ligne ayant un produitId */
        bon.lignes.forEach(ligne => {
          if (!ligne.produitId) return;
          const produit = Store.getById('produits', ligne.produitId);
          if (!produit) return;

          const newStock = (produit.stock || 0) + (ligne.qte || 0);
          Store.update('produits', ligne.produitId, { stock: newStock });

          /* 2. Enregistrement du mouvement de stock */
          Store.create('mouvements', {
            date:        today,
            produitId:   ligne.produitId,
            produitNom:  produit.nom,
            type:        'Entrée',
            quantite:    ligne.qte,
            motif:       `Réception BC ${bon.reference}`,
            reference:   bon.reference
          });
        });

        /* 3. Écritures comptables */
        const now      = new Date().toISOString();
        const tva      = bon.totalTVA   || 0;
        const dd       = bon.droitDouane || 0;
        const tauxTVA  = bon.tauxTVA    || 0;

        /* Débit 607 — Achats de marchandises HT */
        Store.create('ecritures', {
          date: today, createdAt: now,
          compte:  '607000',
          libelle: `Achat HT - ${bon.reference} / ${bon.fournisseur}`,
          debit:   bon.totalHT, credit: 0,
          reference: bon.reference, type: 'achat'
        });

        /* Débit 445660 — TVA déductible par taux (avec prorata pro) */
        const prorataPro = bon.prorataPro ?? 100;
        const prorata    = prorataPro / 100;
        /* Agréger TVA par taux depuis les lignes */
        const tvaGroupes = {};
        (bon.lignes || []).forEach(l => {
          const t  = typeof l.tauxTVA === 'number' ? l.tauxTVA : (bon.tauxTVA || 0);
          const ht = (l.qte || 0) * (l.prixUnitaire || 0);
          tvaGroupes[t] = (tvaGroupes[t] || 0) + ht * t;
        });
        let totalTVAND = 0;
        Object.entries(tvaGroupes).forEach(([t, montant]) => {
          const tx  = parseFloat(t);
          const m   = Math.round(montant);
          const ded = Math.round(m * prorata);
          const nd  = m - ded;
          totalTVAND += nd;
          if (tx > 0 && ded > 0) {
            Store.create('ecritures', {
              date: today, createdAt: now,
              compte:  '445660',
              libelle: `TVA déductible ${Math.round(tx * 100)}% (${prorataPro}% pro) - ${bon.reference}`,
              debit:   ded, credit: 0,
              reference: bon.reference, type: 'achat'
            });
          }
        });
        /* Débit 607000 — TVA non déductible (prorata perso) → en charge */
        if (totalTVAND > 0) {
          Store.create('ecritures', {
            date: today, createdAt: now,
            compte:  '607000',
            libelle: `TVA non déductible (usage perso ${100 - prorataPro}%) - ${bon.reference}`,
            debit:   totalTVAND, credit: 0,
            reference: bon.reference, type: 'achat'
          });
        }

        /* Débit 445100 — Droits de douane / taxes (non déductibles) */
        if (dd > 0) {
          Store.create('ecritures', {
            date: today, createdAt: now,
            compte:  '445100',
            libelle: `Droits douane / taxes - ${bon.reference}`,
            debit:   dd, credit: 0,
            reference: bon.reference, type: 'achat'
          });
        }

        /* Débit 445660 — TVA import payée à la douane (déductible, incluse dans HT) */
        const tvaImport = bon.tvaImport || 0;
        if (tvaImport > 0) {
          Store.create('ecritures', {
            date: today, createdAt: now,
            compte:  '445660',
            libelle: `TVA import déductible (douane) - ${bon.reference}`,
            debit:   tvaImport, credit: 0,
            reference: bon.reference, type: 'achat'
          });
          /* Réduire le coût 607000 du même montant (déjà inclus dans HT) */
          Store.create('ecritures', {
            date: today, createdAt: now,
            compte:  '607000',
            libelle: `Correction TVA import (extrait HT) - ${bon.reference}`,
            debit:   0, credit: tvaImport,
            reference: bon.reference, type: 'achat'
          });
        }

        /* Crédit 401 — Fournisseurs (TTC = HT + TVA + droits douane) */
        Store.create('ecritures', {
          date: today, createdAt: now,
          compte:  '401000',
          libelle: `Fournisseur - ${bon.fournisseur} / ${bon.reference}`,
          debit:   0, credit: bon.totalTTC,
          reference: bon.reference, type: 'achat'
        });

        /* 4. Statut → Reçu */
        Store.update('bonsAchat', _state.currentId, { statut: 'Reçu', dateReception: today });
        toastSuccess('Réception enregistrée. Stocks et comptabilité mis à jour.');

        _renderPOForm(
          document.getElementById('toolbar-actions'),
          document.getElementById('view-content')
        );
      },
      null,
      'Confirmer réception',
      false
    );
  }

  /* ================================================================
     VUE : RAPPORT ACHATS
     ================================================================ */
  function _renderPurchaseReport(toolbar, area) {
    toolbar.innerHTML = `
      <button class="btn btn-ghost" id="btn-export-achats">⬇ Exporter</button>`;

    const bons     = Store.getAll('bonsAchat');
    const now      = new Date();
    const mois     = now.getMonth();
    const annee    = now.getFullYear();

    /* Filtrage mois courant */
    const bonsMois = bons.filter(b => {
      if (!b.date) return false;
      const d = new Date(b.date);
      return d.getMonth() === mois && d.getFullYear() === annee;
    });

    const totalMois   = bonsMois.reduce((s, b) => s + (b.totalTTC || 0), 0);
    const nbCmds      = bonsMois.length;
    const recus       = bons.filter(b => b.statut === 'Reçu');
    const nbRecus     = recus.length;

    /* Top fournisseur (tous temps) */
    const foMap = {};
    bons.forEach(b => {
      if (b.fournisseur) {
        foMap[b.fournisseur] = (foMap[b.fournisseur] || 0) + (b.totalTTC || 0);
      }
    });
    const topFo = Object.entries(foMap).sort((a, b) => b[1] - a[1])[0];

    /* Délai moyen livraison (jours) */
    let delaiMoyen = 0;
    const fournisseurs = Store.getAll('fournisseurs');
    if (fournisseurs.length > 0) {
      const total = fournisseurs.reduce((s, f) => s + (parseInt(f.delaiLivraison) || 0), 0);
      delaiMoyen = Math.round(total / fournisseurs.length);
    }

    area.innerHTML = `
      <div style="padding:24px 0;max-width:1100px;margin:0 auto;">
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:24px;">
          Rapport Achats — ${now.toLocaleDateString('fr-FR', { month:'long', year:'numeric' })}
        </div>

        <!-- KPI -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px;">
          <div id="kpi-achats-mois"></div>
          <div id="kpi-nb-cmds"></div>
          <div id="kpi-top-fo"></div>
          <div id="kpi-delai-moyen"></div>
        </div>

        <!-- Graphiques -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;">
          <div style="background:var(--bg-surface);border:1px solid var(--border);
            border-radius:12px;padding:20px;">
            <div id="chart-achats-fournisseur"></div>
          </div>
          <div style="background:var(--bg-surface);border:1px solid var(--border);
            border-radius:12px;padding:20px;">
            <div id="chart-achats-statuts"></div>
          </div>
        </div>

        <!-- Derniers BC -->
        <div style="background:var(--bg-surface);border:1px solid var(--border);
          border-radius:12px;padding:20px;">
          <div style="font-size:14px;font-weight:600;color:var(--text-secondary);
            margin-bottom:16px;">Derniers bons de commande</div>
          <div id="table-derniers-bc"></div>
        </div>
      </div>`;

    /* Stat cards */
    statCard('kpi-achats-mois', {
      icon: '💰', value: fmt(Math.round(totalMois)),
      label: 'Achats du mois', color: 'var(--accent-blue)'
    });
    statCard('kpi-nb-cmds', {
      icon: '📋', value: nbCmds,
      label: 'Commandes mois', color: 'var(--accent-orange)'
    });
    statCard('kpi-top-fo', {
      icon: '🏆',
      value: topFo ? truncate(topFo[0], 18) : '—',
      label: 'Top fournisseur',
      color: 'var(--accent-green)',
      sub: topFo ? fmt(Math.round(topFo[1])) : ''
    });
    statCard('kpi-delai-moyen', {
      icon: '⏱', value: delaiMoyen + 'j',
      label: 'Délai moyen livraison', color: 'var(--accent-violet)'
    });

    /* Bar chart fournisseurs */
    const foEntries = Object.entries(foMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    barChart('chart-achats-fournisseur', {
      title: 'Achats par fournisseur',
      labels: foEntries.map(e => e[0]),
      values: foEntries.map(e => e[1]),
      formatter: (v) => fmt(Math.round(v)),
      colors: ['#4a5fff','#00d4aa','#ffc857','#ff6b6b','#b07bff','#00b4d8']
    });

    /* Pie chart statuts */
    const statutMap = {};
    bons.forEach(b => {
      statutMap[b.statut] = (statutMap[b.statut] || 0) + 1;
    });
    const statutColors = {
      'Brouillon': '#4a5270',
      'Envoyé':    '#4a5fff',
      'Confirmé':  '#ffc857',
      'Reçu':      '#00d4aa',
      'Annulé':    '#ff6b6b'
    };
    pieChart('chart-achats-statuts', {
      title: 'Répartition des statuts',
      segments: Object.entries(statutMap).map(([s, count]) => ({
        label: s, value: count, color: statutColors[s] || '#4a5270'
      })),
      size: 140,
      donut: true
    });

    /* Table derniers BC */
    const derniers = [...bons].sort((a, b) =>
      new Date(b.date || 0) - new Date(a.date || 0)
    ).slice(0, 10);

    renderTable('table-derniers-bc', {
      data: derniers,
      columns: [
        { key: 'reference',   label: 'Référence',   type: 'text'  },
        { key: 'fournisseur', label: 'Fournisseur', type: 'text'  },
        { key: 'date',        label: 'Date',         type: 'date'  },
        { key: 'totalTTC',    label: 'Total TTC',    type: 'money', render: (r) => fmt(r.totalTTC||0) },
        { key: 'statut',      label: 'Statut',       type: 'badge', badgeMap: STATUT_COLORS }
      ],
      emptyMsg: 'Aucun bon de commande.',
      onRowClick: (row) => {
        _state.view = 'po';
        _openPO(row);
        init(
          document.getElementById('toolbar-actions'),
          document.getElementById('view-content'),
          'po'
        );
      }
    });
  }

  /* ================================================================
     UTILITAIRES PRIVÉS
     ================================================================ */

  /* Nouvelle ligne vide */
  function _newLigne() {
    return { produitId: null, produitNom: '', description: '', qte: 1, prixUnitaire: 0, tauxTVA: _state.tauxTVA };
  }

  /* Génère une référence ACH-YYYY-NNNNN */
  function _genRef() {
    const annee = new Date().getFullYear();
    const num   = Store.nextCounter('ach');
    return `ACH-${annee}-${String(num).padStart(5, '0')}`;
  }

  /* Couleur du badge statut */
  function _badgeColor(statut) {
    const map = {
      'Brouillon': 'var(--text-muted)',
      'Envoyé':    'var(--accent-blue)',
      'Confirmé':  'var(--accent-orange)',
      'Reçu':      'var(--accent-green)',
      'Annulé':    'var(--accent-red)'
    };
    return map[statut] || 'var(--text-secondary)';
  }

  /* Styles communs th/td */
  function _th() {
    return 'padding:8px 12px;font-size:12px;font-weight:600;color:var(--text-secondary);' +
      'text-transform:uppercase;letter-spacing:.06em;';
  }
  function _td() {
    return 'padding:8px 12px;font-size:14px;color:var(--text-primary);';
  }

  /* Échappement HTML */
  function _escP(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ================================================================
     API PUBLIQUE
     ================================================================ */
  return { init };

})();

window.Purchases = Purchases;
