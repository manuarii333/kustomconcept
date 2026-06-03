/* ================================================================
   HCS ERP — js/modules/sales-quotes.js
   Module Devis — dépend de sales.js (window._SalesCore)
   Contient : _renderQuotesList, _renderQuoteForm et toutes
   les fonctions propres aux devis.
   ================================================================ */
'use strict';

window.SalesQuotes = (() => {
  /* Référence au core partagé — disponible après le chargement de sales.js */
  const C = () => window._SalesCore;

  /* IDs des devis sélectionnés pour action groupée */
  let _selectedQuoteIds = new Set();

  function _updateBulkDeleteBtn() {
    const btn = document.getElementById('btn-delete-selected-quotes');
    if (!btn) return;
    btn.style.display = _selectedQuoteIds.size > 0 ? '' : 'none';
    btn.textContent = `🗑 Supprimer (${_selectedQuoteIds.size})`;
  }

  /* ================================================================
     VUE DEVIS (QUOTES)
     ================================================================ */

  /* ---- Liste des devis ---- */
  function _renderQuotesList(toolbar, area) {
    let allDevis = Store.getAll('devis');
    const isKanban = C()._state.listMode === 'kanban';

    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-quote">+ Nouveau Devis</button>
      <button class="btn btn-ghost btn-sm" id="btn-sync-mysql-devis" title="Importer les devis créés via n8n/API">↓ Sync MySQL</button>
      <button class="btn btn-ghost btn-sm" id="btn-dedup-devis" title="Supprimer les doublons (même référence)" style="color:var(--accent-orange,#e09a4f);">🧹 Doublons</button>
      <button class="btn btn-danger btn-sm" id="btn-delete-selected-quotes" style="display:none;">🗑 Supprimer (0)</button>
      <select class="form-control" id="filter-quote-statut"
        style="height:28px;width:140px;font-size:12px;">
        <option value="">Tous les statuts</option>
        ${C().STATUTS_DEVIS.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <input type="text" id="filter-quote-client" placeholder="🔍 Client..."
        class="form-control" style="height:28px;width:140px;font-size:12px;">
      <input type="date" id="filter-quote-from" title="Date début"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <input type="date" id="filter-quote-to" title="Date fin"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <div style="display:flex;gap:4px;margin-left:4px;">
        <button class="btn ${!isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-q-list">☰</button>
        <button class="btn ${isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-q-kanban">⊞</button>
      </div>`;

    const _applyQuoteFilters = () => {
      const statut = document.getElementById('filter-quote-statut')?.value || '';
      const client = (document.getElementById('filter-quote-client')?.value || '').toLowerCase();
      const from   = document.getElementById('filter-quote-from')?.value || '';
      const to     = document.getElementById('filter-quote-to')?.value || '';
      let filtered = allDevis;
      if (statut) filtered = filtered.filter(d => d.statut === statut);
      if (client) filtered = filtered.filter(d => (d.client || '').toLowerCase().includes(client));
      if (from)   filtered = filtered.filter(d => (d.date || '') >= from);
      if (to)     filtered = filtered.filter(d => (d.date || '') <= to);
      if (isKanban) C()._drawKanban(filtered, C().STATUTS_DEVIS, C().BADGE_DEVIS, 'quotes', toolbar, area);
      else _drawQuotesTable(filtered, toolbar, area);
    };

    document.getElementById('btn-new-quote')
      ?.addEventListener('click', () => C()._goForm('quotes', null, toolbar, area));

    document.getElementById('btn-sync-mysql-devis')
      ?.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '⏳ Sync...';
        const result = await Store.syncFromMySQL(['devis']);
        this.disabled = false;
        this.textContent = '↓ Sync MySQL';
        if (result.synced > 0) {
          if (typeof showToast === 'function') showToast(`${result.synced} devis importé(s) depuis MySQL`, 'success');
          allDevis = Store.getAll('devis');
          _applyQuoteFilters();
        } else {
          if (typeof showToast === 'function') showToast('Aucun nouveau devis à importer', 'info');
        }
      });
    document.getElementById('btn-dedup-devis')?.addEventListener('click', () => {
      /* Priorité statut : Confirmé > Envoyé > Brouillon > Annulé */
      const RANK = { 'Confirmé': 4, 'Envoyé': 3, 'Brouillon': 2, 'Annulé': 1 };
      const res = Store.deduplicateCollection(
        'devis',
        r => r.ref,                              /* clé de groupe = numéro de devis */
        r => (RANK[r.statut] || 0) * 1e12        /* statut d'abord, puis plus récent */
          + new Date(r._updatedAt || r.date || 0).getTime()
      );
      allDevis = Store.getAll('devis');
      _applyQuoteFilters();
      if (res.removed > 0) {
        if (typeof showToast === 'function')
          showToast(`🧹 ${res.removed} doublon(s) supprimé(s), ${res.kept} devis conservé(s).`, 'success');
      } else {
        if (typeof showToast === 'function') showToast('Aucun doublon détecté.', 'info');
      }
    });

    document.getElementById('btn-q-list')?.addEventListener('click', () => {
      C()._state.listMode = 'list'; _renderQuotesList(toolbar, area);
    });
    document.getElementById('btn-q-kanban')?.addEventListener('click', () => {
      C()._state.listMode = 'kanban'; _renderQuotesList(toolbar, area);
    });
    document.getElementById('filter-quote-statut')?.addEventListener('change', _applyQuoteFilters);
    document.getElementById('filter-quote-client')?.addEventListener('input', _applyQuoteFilters);
    document.getElementById('filter-quote-from')?.addEventListener('change', _applyQuoteFilters);
    document.getElementById('filter-quote-to')?.addEventListener('change', _applyQuoteFilters);

    /* Réinitialiser la sélection à chaque ouverture de la vue */
    _selectedQuoteIds.clear();

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Devis</div>
        <div class="page-subtitle">${allDevis.length} document(s)</div>
      </div>
      <div id="sales-quotes-table"></div>`;

    if (isKanban) C()._drawKanban(allDevis, C().STATUTS_DEVIS, C().BADGE_DEVIS, 'quotes', toolbar, area);
    else _drawQuotesTable(allDevis, toolbar, area);

    /* Délégation événements checkboxes — une seule fois par instanciation de la vue */
    const tblContainer = document.getElementById('sales-quotes-table');
    if (tblContainer && !isKanban) {
      tblContainer.addEventListener('change', (e) => {
        if (e.target.id === 'chk-all-quotes') {
          /* Tout cocher / décocher */
          const checked = e.target.checked;
          tblContainer.querySelectorAll('.chk-quote').forEach(chk => {
            chk.checked = checked;
            if (checked) _selectedQuoteIds.add(chk.dataset.id);
            else          _selectedQuoteIds.delete(chk.dataset.id);
          });
        } else if (e.target.classList.contains('chk-quote')) {
          const id = e.target.dataset.id;
          if (e.target.checked) _selectedQuoteIds.add(id);
          else                   _selectedQuoteIds.delete(id);
          /* Mettre à jour l'état du chk-all (coché / indéterminé / vide) */
          const allChks     = tblContainer.querySelectorAll('.chk-quote');
          const nbChecked   = [...allChks].filter(c => c.checked).length;
          const headerChk   = document.getElementById('chk-all-quotes');
          if (headerChk) {
            headerChk.checked       = nbChecked === allChks.length && allChks.length > 0;
            headerChk.indeterminate = nbChecked > 0 && nbChecked < allChks.length;
          }
        }
        _updateBulkDeleteBtn();
      });
    }

    /* Suppression groupée */
    document.getElementById('btn-delete-selected-quotes')?.addEventListener('click', () => {
      const count = _selectedQuoteIds.size;
      if (!count) return;
      showConfirm(
        `Supprimer ${count} devis sélectionné(s) ? Cette action est irréversible.`,
        () => {
          _selectedQuoteIds.forEach(id => Store.remove('devis', id));
          _selectedQuoteIds.clear();
          allDevis = Store.getAll('devis');
          toast(`${count} devis supprimé(s).`, 'success');
          _applyQuoteFilters();
        }
      );
    });
  }

  function _drawQuotesTable(data, toolbar, area) {
    renderTable('sales-quotes-table', {
      searchable: true,
      sortable:   true,
      data,
      columns: [
        {
          key:   '_sel',
          label: '<input type="checkbox" id="chk-all-quotes" title="Tout sélectionner" style="cursor:pointer;width:16px;height:16px;">',
          width: '40px',
          render: (v, row) =>
            `<input type="checkbox" class="chk-quote" data-id="${row.id}"
              ${_selectedQuoteIds.has(row.id) ? 'checked' : ''}
              onclick="event.stopPropagation()"
              style="cursor:pointer;width:16px;height:16px;">`
        },
        { key: 'ref',      label: 'Numéro',    render: (v) => `<span class="col-ref">${C()._esc(v)}</span>` },
        { key: 'date',     label: 'Date',       type: 'date' },
        { key: 'client',   label: 'Client',     type: 'text' },
        { key: 'dateExpiration', label: 'Validité', type: 'date' },
        { key: 'modeReglement', label: 'Règlement', render: (v, row) => {
            const parts = [];
            if (v) parts.push(`<span class="chip no-dot">${C().REG_ICONS[v] || '💰'} ${C()._esc(v)}</span>`);
            if (row.resteAPayer > 0.01)
              parts.push(`<span style="color:var(--accent-red);font-size:11px;font-weight:600;">
                Reste ${C()._fmt(row.resteAPayer)}</span>`);
            else if (row.totalRegle > 0)
              parts.push(`<span style="color:var(--accent-green);font-size:11px;">✔ Soldé</span>`);
            return parts.length ? `<div style="display:flex;flex-direction:column;gap:2px;">${parts.join('')}</div>`
                                : '<span style="color:var(--text-muted)">—</span>';
          }
        },
        { key: 'totalTTC', label: 'Total TTC',  render: (v) => `<span class="mono">${C()._fmt(v)}</span>` },
        { key: 'statut',   label: 'Statut',     type: 'badge', badgeMap: C().BADGE_DEVIS },
        { type: 'actions', width: '60px', actions: [
            { label: '🗑', className: 'btn btn-ghost btn-sm', onClick: (row) => {
                showConfirm(`Supprimer le devis ${row.ref || row.id} ?`, () => {
                  Store.remove('devis', row.id);
                  _selectedQuoteIds.delete(row.id);
                  toast('Devis supprimé.', 'success');
                  C()._goList('quotes', toolbar, area);
                });
              }
            }
          ]
        }
      ],
      onRowClick: (item) => C()._goForm('quotes', item.id, toolbar, area),
      emptyMsg:   'Aucun devis. Cliquez sur "+ Nouveau Devis" pour commencer.',
      afterRender: () => {
        /* Synchroniser l'état du chk-all après chaque re-rendu (tri, filtre, recherche) */
        const tblCont   = document.getElementById('sales-quotes-table');
        const allChks   = tblCont ? [...tblCont.querySelectorAll('.chk-quote')] : [];
        const nbChecked = allChks.filter(c => c.checked).length;
        const headerChk = document.getElementById('chk-all-quotes');
        if (headerChk) {
          headerChk.checked       = allChks.length > 0 && nbChecked === allChks.length;
          headerChk.indeterminate = nbChecked > 0 && nbChecked < allChks.length;
        }
        _updateBulkDeleteBtn();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     MOCKUP PROJET — fonctions partagées devis / facture
     ══════════════════════════════════════════════════════════════ */

  /* ---- Formulaire devis ---- */
  function _renderQuoteForm(toolbar, area) {
    const isNew = !C()._state.currentId;
    const doc   = isNew ? null : Store.getById('devis', C()._state.currentId);

    if (!isNew && !doc) {
      toast('Devis introuvable.', 'error');
      return C()._goList('quotes', toolbar, area);
    }

    C()._state.lignes = doc ? doc.lignes.map(l => ({ ...l })) : [];

    /* Résolution automatique noms→IDs pour les devis créés par workflow/API */
    if (doc) {
      /* CLIENT : résoudre depuis doc.client / doc.clientNom si contactId manquant */
      if (!doc.contactId && (doc.client || doc.clientNom)) {
        const _needle = (doc.client || doc.clientNom || '').toLowerCase().trim();
        const _found  = Store.getAll('contacts').find(c =>
          (c.nom || '').toLowerCase().trim() === _needle ||
          (c.nom || '').toLowerCase().includes(_needle) ||
          _needle.includes((c.nom || '').toLowerCase())
        );
        if (_found) doc.contactId = _found.id;
      }

      /* PRODUITS : résoudre produitId depuis l.produit / l.nom dans chaque ligne */
      const _allProduits = Store.getAll('produits');
      C()._state.lignes = C()._state.lignes.map(l => {
        if (l.produitId) return l; /* déjà résolu */
        const _nomLigne = (l.produit || l.nom || l.description || '').toLowerCase().trim();
        if (!_nomLigne) return l;
        const _match = _allProduits.find(p => {
          const _n = (p.nom || '').toLowerCase();
          return _n === _nomLigne || _nomLigne.startsWith(_n) || _n.split(' ').some(w => w.length > 3 && _nomLigne.includes(w));
        });
        return _match ? { ...l, produitId: _match.id } : l;
      });
    }

    const ref    = doc?.ref    || C()._genRef('DEV', 'devis');
    const statut = doc?.statut || 'Brouillon';

    /* Toolbar : retour + boutons d'actions */
    toolbar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-back">← Retour</button>
      ${_quoteActionBtns(statut, isNew, doc)}`;

    document.getElementById('btn-back')
      ?.addEventListener('click', () => C()._goList('quotes', toolbar, area));

    const reglChip = (() => {
      if (!doc?.paiementsDevis?.length && !doc?.modeReglement) return '';
      const chips = [];
      if (doc.modeReglement) {
        const icon = C().REG_ICONS[doc.modeReglement] || '💰';
        chips.push(`<span class="chip no-dot">${icon} ${C()._esc(doc.modeReglement)}</span>`);
      }
      if (doc.totalRegle > 0) {
        chips.push(`<span class="chip no-dot" style="color:var(--accent-green);">✔ Réglé : ${C()._fmt(doc.totalRegle)}</span>`);
      }
      if (doc.resteAPayer > 0.01) {
        chips.push(`<span class="chip no-dot" style="color:var(--accent-red);">Reste : ${C()._fmt(doc.resteAPayer)}</span>`);
      }
      return chips.join('');
    })();

    area.innerHTML = `
      ${C()._renderFormHeader(ref, statut, C().BADGE_DEVIS, reglChip)}
      ${isNew ? '' : C()._renderSuiviBDC(doc, 'devis')}

      <!-- Informations générales -->
      <div class="form-section">
        <div class="form-section-title">Informations générales</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select class="form-control" id="q-client" required>
              <option value="">— Choisir un client —</option>
              <option value="__new__" style="color:var(--accent-blue);font-weight:600;">➕ Créer nouveau client</option>
              ${Store.getAll('contacts').map(c =>
                `<option value="${c.id}" ${doc?.contactId === c.id ? 'selected' : ''}>${C()._esc(c.nom)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Date du devis</label>
            <input type="date" class="form-control" id="q-date"
              value="${doc?.date || new Date().toISOString().slice(0,10)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Validité jusqu'au</label>
            <input type="date" class="form-control" id="q-validite"
              value="${doc?.dateExpiration || ''}" />
          </div>
          <div class="form-group span-full">
            <label class="form-label">Notes / Conditions</label>
            <textarea class="form-control" id="q-notes" rows="2"
              placeholder="Délais, conditions particulières…">${C()._esc(doc?.notes || '')}</textarea>
          </div>
          <div class="form-group span-full" style="margin-top:4px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <label class="form-label" style="margin-bottom:0;">🖼 Mockup projet</label>
              <div style="display:flex;gap:6px;">
                <button type="button" class="btn btn-ghost btn-sm" id="btn-mockup-upload"
                        title="Uploader une image depuis votre ordinateur">📤 Upload</button>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-mockup-auto"
                        title="Récupérer un mockup archivé depuis MockupForge">🔍 MockupForge</button>
                <input type="file" id="mockup-file-input" accept="image/*" style="display:none;" multiple />
              </div>
            </div>
            <div id="mockup-preview-zone"
                 style="display:flex;gap:8px;flex-wrap:wrap;min-height:50px;
                        border:1px dashed var(--border,#333);border-radius:6px;
                        padding:8px;align-items:flex-start;"></div>
          </div>
        </div>
      </div>

      <!-- Articles -->
      <div class="form-section">
        <div class="form-section-title">Articles</div>
        ${C()._renderLineTable(C()._state.lignes)}
      </div>

      <!-- Totaux -->
      <div class="form-section" style="padding:0;">
        ${C()._renderTotalsBlock(C()._state.lignes)}
      </div>

      <!-- Règlement -->
      <div class="form-section" id="reglement-section">
        <div class="form-section-title">Règlement</div>
        <div id="reg-lines"></div>
        <button class="btn-add-line" id="btn-add-reg" style="margin-top:8px;">
          + Ajouter un mode de règlement
        </button>
        <div id="reg-totaux" style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px;"></div>
      </div>

      <!-- Pied de formulaire -->
      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
        <button class="btn btn-ghost" id="q-cancel">Annuler</button>
        <button class="btn btn-primary" id="q-save">✔ Sauvegarder</button>
      </div>`;

    /* Initialiser les lignes de règlement depuis le doc existant */
    C()._paiementsDevis = doc?.paiementsDevis ? doc.paiementsDevis.map(p => ({ ...p })) : [];
    _renderReglementLines(area);
    _refreshReglementTotaux(area);
    _bindReglementEvents(area);

    C()._bindLineTableEvents();
    _bindQuoteFormEvents(isNew, doc, ref, toolbar, area);
  }

  /* ----------------------------------------------------------------
     RÈGLEMENT DEVIS — affichage, calcul et interactions
     ---------------------------------------------------------------- */

  /** Redessine la liste des lignes de règlement dans le DOM */
  function _renderReglementLines(area) {
    const container = area.querySelector('#reg-lines');
    if (!container) return;
    if (C()._paiementsDevis.length === 0) {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:12px;margin-bottom:4px;">
        Aucun règlement enregistré — cliquez sur "+ Ajouter" ci-dessous.</p>`;
      return;
    }
    container.innerHTML = C()._paiementsDevis.map((p, i) => `
      <div class="reglement-line" data-idx="${i}"
           style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <select class="form-control reg-mode" data-idx="${i}"
                style="width:180px;flex-shrink:0;">
          ${C().REG_MODES.map(m =>
            `<option value="${m}" ${p.mode === m ? 'selected' : ''}>
              ${C().REG_ICONS[m]} ${m}
            </option>`
          ).join('')}
        </select>
        <div class="input-suffix" style="flex:1;max-width:200px;">
          <input type="number" class="form-control reg-montant" data-idx="${i}"
                 value="${p.montant || ''}" min="0" placeholder="0"
                 style="text-align:right;" />
          <span class="suffix-label">XPF</span>
        </div>
        <button class="btn btn-ghost btn-sm btn-rem-reg" data-idx="${i}"
                title="Supprimer cette ligne" style="flex-shrink:0;">✕</button>
      </div>`).join('');
  }

  /** Recalcule et affiche le résumé règlement + reste à payer */
  function _refreshReglementTotaux(area) {
    const box = area.querySelector('#reg-totaux');
    if (!box) return;
    const totalTTC    = C()._calcTotaux(C()._state.lignes).totalTTC || 0;
    const totalRegle  = C()._paiementsDevis.reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
    const reste       = totalTTC - totalRegle;
    const resteColor  = reste > 0.01  ? 'var(--accent-red)'
                      : reste < -0.01 ? 'var(--accent-orange)'
                      : 'var(--accent-green)';
    const resteLabel  = reste > 0.01  ? 'Reste à payer'
                      : reste < -0.01 ? 'Trop-perçu'
                      : 'Solde';

    box.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <div style="display:flex;gap:32px;font-size:13px;">
          <span style="color:var(--text-secondary);">Total TTC</span>
          <span class="mono" style="font-weight:600;">${C()._fmt(totalTTC)}</span>
        </div>
        <div style="display:flex;gap:32px;font-size:13px;">
          <span style="color:var(--text-secondary);">Total réglé</span>
          <span class="mono" style="font-weight:600;">${C()._fmt(totalRegle)}</span>
        </div>
        <div style="display:flex;gap:32px;align-items:center;font-size:14px;
                    font-weight:700;border-top:1px solid var(--border);
                    padding-top:8px;margin-top:2px;">
          <span style="color:${resteColor};">${resteLabel}</span>
          <span class="mono" style="color:${resteColor};">${C()._fmt(Math.abs(reste))}</span>
        </div>
        ${totalRegle > 0 && reste > 0.01 ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;
                    padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;
                    border-radius:var(--radius-md);font-size:12px;">
          <span>📄</span>
          <span style="color:var(--accent-orange);">
            <strong>Facture partielle</strong> de ${C()._fmt(totalRegle)} sera générée à la sauvegarde —
            reste <strong>${C()._fmt(reste)}</strong> à régler.
          </span>
        </div>` : ''}
        ${totalRegle > 0 && reste <= 0.01 ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;
                    padding:8px 12px;background:#F0FDF4;border:1px solid #BBF7D0;
                    border-radius:var(--radius-md);font-size:12px;">
          <span>✅</span>
          <span style="color:var(--accent-green);">
            <strong>Facture totale</strong> sera générée et le devis passera en Confirmé à la sauvegarde.
          </span>
        </div>` : ''}
        ${reste < -0.01 ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;
                    padding:8px 12px;background:#FEF2F2;border:1px solid #FECACA;
                    border-radius:var(--radius-md);font-size:12px;">
          <span>⚠️</span>
          <span style="color:var(--accent-red);">Montant réglé supérieur au total — vérifiez les montants.</span>
        </div>` : ''}
      </div>`;
  }

  /** Gère les événements de la section règlement (ajout, suppression, saisie) */
  function _bindReglementEvents(area) {
    /* Ajouter une ligne */
    area.querySelector('#btn-add-reg')?.addEventListener('click', () => {
      C()._paiementsDevis.push({ mode: C().REG_MODES[0], montant: '' });
      _renderReglementLines(area);
      _refreshReglementTotaux(area);
      _bindReglementEvents(area);
    });

    /* Suppression ligne */
    area.querySelectorAll('.btn-rem-reg').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        C()._paiementsDevis.splice(idx, 1);
        _renderReglementLines(area);
        _refreshReglementTotaux(area);
        _bindReglementEvents(area);
      });
    });

    /* Changement mode */
    area.querySelectorAll('.reg-mode').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = parseInt(sel.dataset.idx);
        C()._paiementsDevis[idx].mode = sel.value;
      });
    });

    /* Saisie montant → recalcul en temps réel */
    area.querySelectorAll('.reg-montant').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.idx);
        C()._paiementsDevis[idx].montant = parseFloat(inp.value) || 0;
        _refreshReglementTotaux(area);
        /* Rebind uniquement le bouton facture partielle (pas toute la section) */
        area.querySelector('#btn-facture-partielle')?.addEventListener('click', () => {
          const currentDoc = Store.getById('devis', C()._state.currentId);
          if (!currentDoc) { toast('Sauvegardez d\'abord le devis.', 'warning'); return; }
          const totalTTC   = C()._calcTotaux(C()._state.lignes).totalTTC || 0;
          const totalRegle = C()._paiementsDevis.reduce((s, p) => s + (parseFloat(p.montant)||0), 0);
          _createPartialInvoice(currentDoc, totalTTC - totalRegle, area);
        });
      });
    });
  }

  /** Crée une facture (Brouillon) reprenant toutes les lignes du devis */
  function _createPartialInvoice(devis, reste, area) {
    const ref    = C()._genRef('FAC', 'factures');
    const totaux = C()._calcTotaux(devis.lignes);
    Store.create('factures', {
      ref,
      _type:        'Facture',
      contactId:    devis.contactId,
      client:       devis.client,
      date:         new Date().toISOString().slice(0, 10),
      statut:       'Brouillon',
      devisId:      devis.id,
      lignes:       devis.lignes,
      paiements:    [],
      ...totaux,
      notes:        `Facture — ${devis.ref} — Reste à régler : ${C()._fmt(reste)}`
    });
    toast(`📄 Facture ${ref} créée depuis ${devis.ref} (reste : ${C()._fmt(reste)}).`, 'success');
  }

  /**
   * Génère ou met à jour la facture liée à un devis réglé.
   */
  function _genererFactureDepuisDevis(devis, paiementsDevis, totalRegle, resteAPayer, totauxDevis) {
    const isTotal = resteAPayer <= 0.01;

    /* Paiements à enregistrer dans la facture */
    const facPaiements = paiementsDevis.map((p, i) => ({
      id:      `pay-${Date.now()}-${i}`,
      date:    new Date().toISOString().slice(0, 10),
      methode: p.mode,
      montant: p.montant,
      type:    'Paiement'
    }));

    /* Toujours reprendre les lignes complètes du devis.
       Le paiement partiel est tracké via paiements[] — reste = totalTTC - Σpaiements */
    const lignesFac = devis.lignes;
    const totauxFac = totauxDevis;
    const facStatut = isTotal ? 'Payé' : 'Payé partiel';
    const typeLabel = isTotal ? 'totale' : 'partielle';

    const today   = new Date().toISOString().slice(0, 10);
    const facData = {
      _type:      'Facture',
      contactId:  devis.contactId,
      client:     devis.client,
      client_nom: devis.client,      /* MySQL: colonne legacy */
      client_id:  devis.contactId,   /* MySQL: colonne legacy */
      date:       today,
      statut:     facStatut,
      devisId:    devis.id,
      devis_id:   devis.id,          /* MySQL: colonne legacy */
      lignes:     lignesFac,
      paiements:  facPaiements,
      notes:      `Facture ${typeLabel} — ${devis.ref}${resteAPayer > 0.01 ? ` — Reste à payer : ${C()._fmt(resteAPayer)}` : ''}`,
      ...totauxFac,
      total_ht:   totauxFac.totalHT,  /* MySQL: colonne legacy */
      total_ttc:  totauxFac.totalTTC, /* MySQL: colonne legacy */
      total_tva:  totauxFac.totalTVA, /* MySQL: colonne legacy */
    };

    /* Cherche une facture déjà liée à ce devis */
    const existante = Store.getAll('factures').find(f => f.devisId === devis.id);
    let facRef;

    if (existante) {
      /* Mise à jour de la facture existante */
      facRef = existante.ref;
      Store.update('factures', existante.id, facData);
      toast(`📄 Facture ${facRef} mise à jour (${typeLabel}, ${C()._fmt(totalRegle)} réglé).`, 'info');
    } else {
      /* Création d'une nouvelle facture */
      facRef = C()._genRef('FAC', 'factures');
      Store.create('factures', { ref: facRef, ...facData });
      toast(`📄 Facture ${facRef} créée (${typeLabel}, ${C()._fmt(totalRegle)} réglé).`, 'success');
    }

    /* Marquer le devis comme facturé */
    Store.update('devis', devis.id, { statut: 'Facturé' });

    /* ----------------------------------------------------------------
       ÉCRITURES COMPTABLES AUTOMATIQUES
       Supprimer les écritures précédentes de cette pièce, puis recréer
       ---------------------------------------------------------------- */
    const now = new Date().toISOString();

    /* Nettoyer les anciennes écritures automatiques pour cette pièce */
    Store.getAll('ecritures')
      .filter(e => e.pieceRef === facRef && e.type === 'vente')
      .forEach(e => Store.remove('ecritures', e.id));

    /* 1 — Constatation de la vente : Débit Clients / Crédit Ventes + TVA */
    const totalHT  = totauxFac.totalHT  || 0;
    const totalTVA = (totauxFac.totalTTC || 0) - totalHT;
    const totalTTC = totauxFac.totalTTC  || 0;

    Store.create('ecritures', {
      date: today, createdAt: now,
      compte:   '411000',
      journal:  'Ventes',
      libelle:  `Vente — ${devis.client} / ${facRef}`,
      debit:    Math.round(totalTTC),
      credit:   0,
      pieceRef: facRef,
      type:     'vente'
    });
    Store.create('ecritures', {
      date: today, createdAt: now,
      compte:   '700000',
      journal:  'Ventes',
      libelle:  `CA — ${devis.client} / ${facRef}`,
      debit:    0,
      credit:   Math.round(totalHT),
      pieceRef: facRef,
      type:     'vente'
    });
    if (totalTVA > 0) {
      Store.create('ecritures', {
        date: today, createdAt: now,
        compte:   '445700',
        journal:  'Ventes',
        libelle:  `TVA collectée — ${facRef}`,
        debit:    0,
        credit:   Math.round(totalTVA),
        pieceRef: facRef,
        type:     'vente'
      });
    }

    /* 2 — Règlements reçus : Débit Trésorerie / Crédit Clients */
    const COMPTE_TRESORERIE = {
      'Espèces':   '530000', // Caisse
      'Chèque':    '512000',
      'Virement':  '512000',
      'CB':        '512000',
      'Carte':     '512000',
      'Mobile':    '512000',
      'Mixte':     '512000'
    };

    facPaiements.forEach(p => {
      const compteTresor = COMPTE_TRESORERIE[p.methode] || '512000';
      const libTresor    = compteTresor === '530000' ? 'Caisse' : 'Banque';

      /* Débit trésorerie */
      Store.create('ecritures', {
        date: today, createdAt: now,
        compte:   compteTresor,
        journal:  'Trésorerie',
        libelle:  `${libTresor} — ${p.methode} / ${facRef}`,
        debit:    Math.round(p.montant || 0),
        credit:   0,
        pieceRef: facRef,
        type:     'vente'
      });
      /* Crédit 411 Clients */
      Store.create('ecritures', {
        date: today, createdAt: now,
        compte:   '411000',
        journal:  'Trésorerie',
        libelle:  `Règlement ${devis.client} — ${facRef}`,
        debit:    0,
        credit:   Math.round(p.montant || 0),
        pieceRef: facRef,
        type:     'vente'
      });
    });
  }

  function _quoteActionBtns(statut, isNew, doc = null) {
    if (isNew) return '';

    /* Vérifie si une facture ou commande est déjà liée à ce devis */
    const factureLiee  = doc ? Store.getAll('factures').find(f => f.devisId === doc.id) : null;
    const commandeLiee = doc ? Store.getAll('commandes').find(c => c.quoteId === doc.id) : null;

    const btns = [];
    btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="apercu" title="Aperçu du document devis">📄 Aperçu</button>`);
    if (statut === 'Brouillon') {
      btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="envoyer">📤 Envoyer</button>`);
    }
    if (['Brouillon', 'Envoyé'].includes(statut)) {
      btns.push(`<button class="btn btn-success btn-sm" data-q-action="confirmer">✔ Confirmer</button>`);
      btns.push(`<button class="btn btn-danger btn-sm"  data-q-action="annuler">✕ Annuler</button>`);
    }
    if (['Envoyé', 'Confirmé', 'Facturé'].includes(statut)) {
      if (factureLiee) {
        /* Facture déjà créée → lien direct, bouton désactivé */
        btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="voir-facture" data-linked-id="${factureLiee.id}"
          title="Ouvrir la facture liée ${factureLiee.ref}" style="color:var(--accent-green);">
          🧾 ${C()._esc(factureLiee.ref)} ↗</button>`);
      } else {
        btns.push(`<button class="btn btn-success btn-sm" data-q-action="facturer" title="Convertir en facture">🧾 → Facture</button>`);
      }
    }
    if (statut === 'Confirmé') {
      if (commandeLiee) {
        btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="voir-commande" data-linked-id="${commandeLiee.id}"
          title="Ouvrir la commande liée ${commandeLiee.reference || commandeLiee.ref}" style="color:var(--accent-blue);">
          📦 ${C()._esc(commandeLiee.reference || commandeLiee.ref)} ↗</button>`);
      } else {
        btns.push(`<button class="btn btn-primary btn-sm" data-q-action="convertir">📦 → Commande</button>`);
      }
    }
    if (['Confirmé'].includes(statut) || factureLiee) {
      btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="recreer-planning"
        title="Recréer / mettre à jour la carte dans le planning de production" style="color:var(--accent-orange,#FF6B00);">
        ♻️ Planning</button>`);
    }
    btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="analyser-marges" title="Analyser les marges de ce devis">⬡ Marges</button>`);
    btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="dupliquer" title="Dupliquer ce devis (nouveau brouillon)">⎘ Dupliquer</button>`);
    btns.push(`<button class="btn btn-ghost btn-sm" data-q-action="supprimer" style="color:var(--accent-red);margin-left:8px;" title="Supprimer ce devis">🗑 Supprimer</button>`);
    return btns.join('');
  }

  function _bindQuoteFormEvents(isNew, doc, ref, toolbar, area) {
    /* Création rapide client depuis la liste déroulante */
    C()._bindClientSelectCreation('q-client');

    /* Mockup projet */
    C()._bindMockupEvents(doc, area);

    /* Re-peupler le select client après sync MySQL (contacts chargés async) */
    (async () => {
      await new Promise(r => setTimeout(r, 500));
      const sel = document.getElementById('q-client');
      if (!sel) return;
      const currentVal = sel.value;
      const contacts = Store.getAll('contacts');
      if (contacts.length + 2 > sel.options.length) {
        while (sel.options.length > 2) sel.remove(2);
        contacts.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.text  = C()._esc(c.nom);
          opt.selected = c.id === currentVal || c.id === doc?.contactId;
          sel.appendChild(opt);
        });
      }
    })();

    /* Remise client spéciale : appliquée dès la sélection */
    document.getElementById('q-client')?.addEventListener('change', () => {
      C()._applyRemiseClient('q-client');
    });

    /* Sauvegarder — guard anti double-clic */
    document.getElementById('q-save')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (btn.disabled) return;
      btn.disabled = true;
      btn.textContent = '…';
      setTimeout(() => { if (btn) { btn.disabled = false; btn.textContent = '✔ Sauvegarder'; } }, 3000);

      const contactId = document.getElementById('q-client')?.value;
      if (!contactId || contactId === '__new__') {
        btn.disabled = false; btn.textContent = '✔ Sauvegarder';
        toast('Veuillez sélectionner un client.', 'error'); return;
      }
      if (C()._state.lignes.length === 0) {
        btn.disabled = false; btn.textContent = '✔ Sauvegarder';
        toast('Ajoutez au moins un article.', 'error'); return;
      }

      /* Collecter les montants saisis dans le DOM (évite désync) */
      area.querySelectorAll('.reg-montant').forEach(inp => {
        const idx = parseInt(inp.dataset.idx);
        if (C()._paiementsDevis[idx]) C()._paiementsDevis[idx].montant = parseFloat(inp.value) || 0;
      });
      area.querySelectorAll('.reg-mode').forEach(sel => {
        const idx = parseInt(sel.dataset.idx);
        if (C()._paiementsDevis[idx]) C()._paiementsDevis[idx].mode = sel.value;
      });

      const paiementsDevis = C()._paiementsDevis.filter(p => p.montant > 0);
      const totalRegle  = paiementsDevis.reduce((s, p) => s + (p.montant || 0), 0);
      const totaux      = C()._calcTotaux(C()._state.lignes);
      const resteAPayer = Math.max(0, (totaux.totalTTC || 0) - totalRegle);

      /* Mode de règlement principal (pour la liste) */
      const modeReglement = paiementsDevis.length === 1
        ? paiementsDevis[0].mode
        : paiementsDevis.length > 1 ? 'Mixte' : '';

      /* Si un règlement est saisi → confirmer automatiquement le devis */
      const statutFinal = (totalRegle > 0 && (doc?.statut || 'Brouillon') !== 'Annulé')
        ? 'Confirmé'
        : (doc?.statut || 'Brouillon');

      const clientNom = C()._contactNom(contactId);
      const dateExp   = document.getElementById('q-validite')?.value || '';
      const record = {
        ref,
        _type:           'Devis',
        contactId,
        client:          clientNom,
        client_nom:      clientNom,      /* MySQL: colonne legacy */
        client_id:       contactId,      /* MySQL: colonne legacy */
        date:            document.getElementById('q-date')?.value || '',
        dateExpiration:  dateExp,
        date_expiration: dateExp,        /* MySQL: colonne legacy */
        date_validite:   dateExp,        /* MySQL: colonne legacy */
        modeReglement,
        mode_reglement:  modeReglement,  /* MySQL: colonne legacy */
        paiementsDevis,
        paiements_devis: paiementsDevis, /* MySQL: colonne legacy */
        totalRegle,
        total_regle:     totalRegle,     /* MySQL: colonne legacy */
        resteAPayer,
        reste_a_payer:   resteAPayer,    /* MySQL: colonne legacy */
        notes:           document.getElementById('q-notes')?.value || '',
        mockupUrls:      C()._mockupUrls,
        statut:          statutFinal,
        lignes:          C()._state.lignes,
        ...totaux,
        total_ht:        totaux.totalHT,  /* MySQL: colonne legacy */
        total_ttc:       totaux.totalTTC, /* MySQL: colonne legacy */
        total_tva:       totaux.totalTVA, /* MySQL: colonne legacy */
      };

      /* 1 — Sauvegarder le devis */
      let savedDevis;
      if (isNew) {
        savedDevis = Store.create('devis', record);
        toast('Devis créé.', 'success');
        C()._sauverDocDropbox && C()._createDropboxFolder && C()._createDropboxFolder(record.client);
      } else {
        Store.update('devis', doc.id, record);
        savedDevis = { ...record, id: doc.id };
        toast('Devis sauvegardé.', 'success');
      }

      /* 2 — Flux tendu : réservation fournisseur si le devis est confirmé */
      if (savedDevis.statut === 'Confirmé') {
        C()._creerReservationFournisseur(savedDevis);
        /* Pousser une carte dans le planning de production (règlement ou confirmation manuelle) */
        C()._pushPlanningCard(savedDevis, savedDevis.ref);

        /* P3-2 : Décrémenter le stock uniquement lors du premier passage en Confirmé
           (doc?.statut est l'ancien statut avant sauvegarde) */
        if (doc?.statut !== 'Confirmé' && typeof Inventory !== 'undefined' && Array.isArray(savedDevis.lignes)) {
          savedDevis.lignes.forEach(ligne => {
            if (ligne.produitId && (ligne.qte || ligne.quantite) > 0) {
              Inventory.sortieStock(
                ligne.produitId,
                ligne.qte || ligne.quantite,
                'Devis confirmé',
                savedDevis.ref
              );
            }
          });
        }
      }

      /* 3 — Si règlement > 0 : générer ou mettre à jour la facture */
      if (totalRegle > 0) {
        _genererFactureDepuisDevis(savedDevis, paiementsDevis, totalRegle, resteAPayer, totaux);
      }

      C()._goList('quotes', toolbar, area);
    });

    document.getElementById('q-cancel')
      ?.addEventListener('click', () => C()._goList('quotes', toolbar, area));

    /* Boutons d'action statut */
    toolbar.querySelectorAll('[data-q-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.qAction;

        if (action === 'apercu') {
          _previewDevis(doc, toolbar, area);
          return;
        }

        if (action === 'convertir') {
          _convertQuoteToOrder(doc, toolbar, area);
          return;
        }

        if (action === 'facturer') {
          _createInvoiceFromQuote(doc, toolbar, area);
          return;
        }

        if (action === 'voir-facture') {
          const facId = btn.dataset.linkedId;
          if (facId) { C()._goForm('invoices', facId, toolbar, area); }
          return;
        }

        if (action === 'voir-commande') {
          const cmdId = btn.dataset.linkedId;
          if (cmdId) { C()._goForm('orders', cmdId, toolbar, area); }
          return;
        }

        if (action === 'analyser-marges') {
          const target = window.location.pathname.includes('/apps/') ? 'devis-analyser.html' : 'apps/devis-analyser.html';
          window.open(`${target}?id=${encodeURIComponent(doc.id)}`, '_blank');
          return;
        }

        if (action === 'dupliquer') {
          const newRef = C()._genRef('DEV', 'devis');
          const copy = {
            ...doc,
            id:              undefined,
            ref:             newRef,
            statut:          'Brouillon',
            date:            new Date().toISOString().slice(0, 10),
            dateExpiration:  '',
            paiementsDevis:  [],
            totalRegle:      0,
            resteAPayer:     0,
            modeReglement:   '',
            lignes:          (doc.lignes || []).map(l => ({ ...l })),
          };
          const saved = Store.add('devis', copy);
          toast(`Devis dupliqué : ${newRef}`, 'success');
          C()._goForm('quotes', saved.id, toolbar, area);
          return;
        }

        if (action === 'recreer-planning') {
          const docActuel = Store.getById('devis', doc.id) || doc;
          showConfirm(
            `Recréer la carte planning pour "${docActuel.ref}" ?\nSi une carte existe déjà elle sera mise à jour.`,
            () => {
              C()._pushPlanningCard(docActuel, docActuel.ref);
            }
          );
          return;
        }

        if (action === 'supprimer') {
          showConfirm(`Supprimer le devis ${doc.ref} ? Cette action est irréversible.`, () => {
            Store.remove('devis', doc.id);
            toast(`Devis ${doc.ref} supprimé.`, 'success');
            C()._goList('quotes', toolbar, area);
          });
          return;
        }

        const newStatut = { envoyer: 'Envoyé', confirmer: 'Confirmé', annuler: 'Annulé' }[action];
        if (newStatut) {
          showConfirm(`Passer ce devis en "${newStatut}" ?`, () => {
            Store.update('devis', doc.id, { statut: newStatut });
            toast(`Devis ${newStatut.toLowerCase()}.`, 'success');
            if (newStatut === 'Confirmé') {
              /* Réservation fournisseur local dès confirmation */
              C()._creerReservationFournisseur({ ...doc, statut: 'Confirmé' });
              /* Carte planning de production */
              C()._pushPlanningCard({ ...doc, statut: 'Confirmé' }, doc.ref);

              /* P3-2 : Décrémenter le stock pour chaque article du devis */
              if (typeof Inventory !== 'undefined' && Array.isArray(doc.lignes)) {
                doc.lignes.forEach(ligne => {
                  if (ligne.produitId && (ligne.qte || ligne.quantite) > 0) {
                    Inventory.sortieStock(
                      ligne.produitId,
                      ligne.qte || ligne.quantite,
                      'Devis confirmé',
                      doc.ref
                    );
                  }
                });
              }

              /* P3-1 : Écritures comptables si des paiements sont déjà enregistrés */
              if (doc.totalRegle > 0 && Array.isArray(doc.paiementsDevis) && doc.paiementsDevis.length > 0) {
                const totauxDoc = {
                  totalHT:  doc.totalHT  || 0,
                  totalTTC: doc.totalTTC || 0,
                  totalTVA: doc.totalTVA || 0
                };
                _genererFactureDepuisDevis(
                  { ...doc, statut: 'Confirmé' },
                  doc.paiementsDevis,
                  doc.totalRegle,
                  doc.resteAPayer || 0,
                  totauxDoc
                );
              }
            }
            C()._goList('quotes', toolbar, area);
          });
        }
      });
    });
  }

  /* ----------------------------------------------------------------
     APERÇU DEVIS — document mis en forme + options impression / facture
     ---------------------------------------------------------------- */

  function _previewDevis(devis, toolbar, area) {
    const contact      = Store.getById('contacts', devis.contactId) || {};
    const peutFacturer = ['Envoyé', 'Confirmé'].includes(devis.statut);
    const p            = C()._getDocParams();

    /* Calcul des totaux ligne par ligne pour affichage détaillé */
    const lignesHtml = (devis.lignes || []).map(l => {
      const brut   = (l.qte || 0) * (l.prixUnitaire || 0);
      const remise = brut * ((l.remise || 0) / 100);
      const ht     = brut - remise;
      const taux   = (l.tauxTVA !== undefined ? l.tauxTVA : 16);
      const tva    = Math.round(ht * taux / 100);
      const ttc    = Math.round(ht + tva);
      return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">
            ${C()._esc(l.produit || l.description || '—')}
            ${l.description && l.produit ? `<br><span style="color:#6b7280;font-size:11px;">${C()._esc(l.description)}</span>` : ''}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${l.qte || 0}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-family:monospace;">${C()._fmt(l.prixUnitaire || 0)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${l.remise ? l.remise + ' %' : '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">${taux} %</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:600;font-family:monospace;">${C()._fmt(ttc)}</td>
        </tr>`;
    }).join('');

    /* Ligne de règlements déjà enregistrés */
    const reglHtml = (devis.paiementsDevis || []).filter(p => p.montant > 0).map(p =>
      `<div style="display:flex;justify-content:space-between;font-size:12px;color:#374151;padding:3px 0;">
        <span>${C().REG_ICONS[p.mode] || '💰'} ${C()._esc(p.mode)}</span>
        <span style="font-family:monospace;font-weight:600;">${C()._fmt(p.montant)}</span>
      </div>`
    ).join('');

    /* Statut badge couleurs */
    const BADGE_COLORS = {
      'Brouillon': { bg: '#f3f4f6', color: '#374151' },
      'Envoyé':    { bg: '#dbeafe', color: '#1d4ed8' },
      'Confirmé':  { bg: '#dcfce7', color: '#15803d' },
      'Annulé':    { bg: '#fee2e2', color: '#dc2626' }
    };
    const badgeStyle = BADGE_COLORS[devis.statut] || BADGE_COLORS['Brouillon'];

    const documentHtml = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Devis ${C()._esc(devis.ref)}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color:#111827; background:#fff; }
          .page { max-width:800px; margin:0 auto; padding:40px 32px; }

          /* En-tête société */
          .header { display:flex; justify-content:space-between; align-items:flex-start;
                    padding-bottom:24px; border-bottom:3px solid #4a5fff; margin-bottom:28px; }
          .brand-name { font-size:22px; font-weight:800; color:#4a5fff; letter-spacing:-0.5px; }
          .brand-sub  { font-size:11px; color:#6b7280; margin-top:2px; }
          .brand-contact { text-align:right; font-size:11px; color:#6b7280; line-height:1.8; }

          /* Bloc doc info */
          .doc-meta { display:flex; justify-content:space-between; align-items:flex-start;
                      margin-bottom:28px; }
          .doc-title { font-size:26px; font-weight:800; color:#111827; }
          .doc-ref   { font-size:13px; color:#6b7280; font-family:monospace; margin-top:4px; }
          .doc-badge { display:inline-block; padding:4px 12px; border-radius:20px; font-size:11px;
                       font-weight:700; background:${badgeStyle.bg}; color:${badgeStyle.color};
                       margin-top:8px; }
          .doc-dates { text-align:right; font-size:12px; color:#374151; line-height:2; }
          .doc-dates strong { color:#111827; }

          /* Bloc client */
          .section-title { font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase;
                           letter-spacing:1px; margin-bottom:8px; }
          .client-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;
                        padding:14px 18px; margin-bottom:28px; }
          .client-name { font-size:15px; font-weight:700; color:#111827; margin-bottom:4px; }
          .client-detail { font-size:12px; color:#6b7280; line-height:1.8; }

          /* Tableau articles */
          table { width:100%; border-collapse:collapse; margin-bottom:24px; }
          thead th { background:#4a5fff; color:#fff; padding:10px 10px; text-align:left;
                     font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; }
          thead th:not(:first-child) { text-align:center; }
          thead th:last-child { text-align:right; }
          tbody tr:last-child td { border-bottom:none; }

          /* Totaux */
          .totaux { display:flex; justify-content:flex-end; margin-bottom:24px; }
          .totaux-box { width:280px; }
          .totaux-row { display:flex; justify-content:space-between; padding:5px 0;
                        font-size:13px; color:#374151; border-bottom:1px solid #f3f4f6; }
          .totaux-row.ttc { font-size:16px; font-weight:800; color:#111827;
                            border-top:2px solid #4a5fff; border-bottom:none;
                            padding-top:10px; margin-top:4px; }
          .mono { font-family:monospace; }

          /* Règlements */
          .regl-box { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px;
                      padding:12px 16px; margin-bottom:24px; }
          .regl-title { font-size:11px; font-weight:700; color:#15803d; margin-bottom:8px; }

          /* Notes */
          .notes-box { background:#fffbeb; border:1px solid #fde68a; border-radius:8px;
                       padding:12px 16px; margin-bottom:28px; font-size:12px; color:#374151;
                       line-height:1.7; }

          /* Footer doc */
          .doc-footer { text-align:center; font-size:10px; color:#9ca3af;
                        border-top:1px solid #e5e7eb; padding-top:16px; margin-top:8px; }

          /* Boutons interface (masqués à l'impression) */
          .ui-actions { display:flex; gap:10px; justify-content:flex-end;
                        padding:16px 0 4px 0; margin-bottom:16px; }
          .btn-print   { padding:9px 20px; background:#4a5fff; color:#fff; border:none;
                         border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
          .btn-facture { padding:9px 20px; background:#22c55e; color:#fff; border:none;
                         border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
          .btn-email   { padding:9px 20px; background:#f97316; color:#fff; border:none;
                         border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; }
          .btn-close   { padding:9px 16px; background:#f3f4f6; color:#374151; border:none;
                         border-radius:8px; font-size:13px; cursor:pointer; }
          .email-tip   { background:#fffbeb; border:1px solid #fde68a; border-radius:8px;
                         padding:12px 16px; font-size:12px; color:#374151; margin-bottom:12px;
                         display:none; line-height:1.7; }

          @media print {
            .ui-actions { display:none !important; }
            body { padding:0; }
            .page { padding:20px; }
          }
        </style>
      </head>
      <body>
        <div class="page">

          <!-- Boutons interface -->
          <div class="email-tip" id="email-tip">
            <strong>📧 Comment envoyer par email :</strong><br>
            1. Clique sur <strong>🖨 Imprimer</strong> → dans la boîte d'impression, choisis <strong>"Enregistrer en PDF"</strong><br>
            2. Reviens ici et clique <strong>📧 Composer l'email</strong> — ton client de messagerie s'ouvrira avec le devis pré-rempli<br>
            3. Joint le PDF que tu viens de sauvegarder et envoie !
          </div>
          <div class="ui-actions">
            <button class="btn-close" onclick="window.close()">✕ Fermer</button>
            ${peutFacturer
              ? `<button class="btn-facture" id="btn-doc-facturer">🧾 Convertir en Facture</button>`
              : ''}
            <button class="btn-email" id="btn-doc-email">📧 Envoyer par email</button>
            <button class="btn-print" id="btn-doc-print">🖨 Imprimer / PDF</button>
          </div>

          <!-- En-tête société -->
          <div class="header">
            <div style="display:flex;align-items:center;gap:14px;">
              ${p.logoUrl ? `<img src="${p.logoUrl}" style="height:52px;width:auto;object-fit:contain;" alt="logo">` : ''}
              <div>
                <div class="brand-name" style="color:${p.accentColor};">${C()._esc(p.entreprise)}</div>
                <div class="brand-sub">${C()._esc(p.slogan)}</div>
              </div>
            </div>
            <div class="brand-contact">
              ${p.adresse ? C()._esc(p.adresse) + '<br>' : ''}
              ${p.telephone ? '📞 ' + C()._esc(p.telephone) + '<br>' : ''}
              ${p.email ? C()._esc(p.email) + '<br>' : ''}
              ${p.website ? C()._esc(p.website) : ''}
            </div>
          </div>

          <!-- Identité du document -->
          <div class="doc-meta">
            <div>
              <div class="doc-title">DEVIS</div>
              <div class="doc-ref">${C()._esc(devis.ref)}</div>
              <div class="doc-badge">${C()._esc(devis.statut)}</div>
            </div>
            <div class="doc-dates">
              <div>Date : <strong>${C()._fmtDate(devis.date)}</strong></div>
              ${devis.dateExpiration
                ? `<div>Validité : <strong>${C()._fmtDate(devis.dateExpiration)}</strong></div>`
                : ''}
            </div>
          </div>

          <!-- Client -->
          <div class="section-title">Client</div>
          <div class="client-box">
            <div class="client-name">${C()._esc(devis.client || contact.nom || '—')}</div>
            <div class="client-detail">
              ${contact.email ? `📧 ${C()._esc(contact.email)}<br>` : ''}
              ${contact.tel   ? `📞 ${C()._esc(contact.tel)}<br>`   : ''}
              ${contact.type  ? `🏷 ${C()._esc(contact.type)}`      : ''}
            </div>
          </div>

          <!-- Articles -->
          <div class="section-title">Articles</div>
          <table>
            <thead>
              <tr>
                <th style="width:40%;">Désignation</th>
                <th style="width:8%;">Qté</th>
                <th style="width:14%;">PU HT</th>
                <th style="width:10%;">Remise</th>
                <th style="width:10%;">TVA</th>
                <th style="width:18%;">Total TTC</th>
              </tr>
            </thead>
            <tbody>
              ${lignesHtml || '<tr><td colspan="6" style="padding:16px;text-align:center;color:#6b7280;">Aucun article</td></tr>'}
            </tbody>
          </table>

          <!-- Totaux -->
          <div class="totaux">
            <div class="totaux-box">
              <div class="totaux-row">
                <span>Total HT</span>
                <span class="mono">${C()._fmt(devis.totalHT || 0)}</span>
              </div>
              <div class="totaux-row">
                <span>TVA</span>
                <span class="mono">${C()._fmt(devis.totalTVA || 0)}</span>
              </div>
              <div class="totaux-row ttc">
                <span>Total TTC</span>
                <span class="mono">${C()._fmt(devis.totalTTC || 0)}</span>
              </div>
            </div>
          </div>

          <!-- Règlements enregistrés -->
          ${reglHtml ? `
          <div class="regl-box">
            <div class="regl-title">✅ Règlements enregistrés</div>
            ${reglHtml}
            ${devis.resteAPayer > 0.01
              ? `<div style="font-size:12px;color:#dc2626;font-weight:700;margin-top:8px;padding-top:8px;border-top:1px solid #bbf7d0;">
                  Reste à payer : ${C()._fmt(devis.resteAPayer)}
                </div>`
              : `<div style="font-size:12px;color:#15803d;font-weight:700;margin-top:8px;">✔ Entièrement réglé</div>`}
          </div>` : ''}

          <!-- Notes / Conditions -->
          ${devis.notes ? `
          <div class="section-title">Notes &amp; Conditions</div>
          <div class="notes-box">${C()._esc(devis.notes).replace(/\n/g, '<br>')}</div>` : ''}

          <!-- Fiche atelier (uniquement si au moins une ligne a une position) -->
          ${(() => {
            const lignesAvecPos = (devis.lignes || []).filter(l => l.positionAtelier);
            if (!lignesAvecPos.length) return '';
            return `
              <div style="margin-top:24px;border-top:2px dashed #e5e7eb;padding-top:16px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                  letter-spacing:1px;color:#6b7280;margin-bottom:10px;">📋 Fiche Atelier</div>
                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                  <thead>
                    <tr style="background:#f3f4f6;">
                      <th style="padding:6px 10px;text-align:left;font-weight:700;color:#374151;">Article</th>
                      <th style="padding:6px 10px;text-align:center;font-weight:700;color:#374151;">Qté</th>
                      <th style="padding:6px 10px;text-align:left;font-weight:700;color:#374151;">Position atelier</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${lignesAvecPos.map(l => `
                      <tr style="border-bottom:1px solid #f3f4f6;">
                        <td style="padding:7px 10px;">${C()._esc(l.produit || l.description || '—')}</td>
                        <td style="padding:7px 10px;text-align:center;font-weight:600;">${l.qte || 1}</td>
                        <td style="padding:7px 10px;">
                          <span style="background:#eff6ff;color:#1d4ed8;border-radius:6px;
                            padding:3px 10px;font-weight:600;">
                            ${C()._esc(l.positionAtelier)}
                          </span>
                        </td>
                      </tr>`).join('')}
                  </tbody>
                </table>
              </div>`;
          })()}

          <!-- Pied de page -->
          <div class="doc-footer">
            ${p.footerText ? C()._esc(p.footerText) + '<br>' : ''}
            ${p.conditions ? '<em>' + C()._esc(p.conditions) + '</em><br>' : ''}
            Document généré le ${new Date().toLocaleDateString('fr-FR')} — HCS ERP
          </div>

        </div>
      </body>
      </html>`;

    /* Ouvrir dans une nouvelle fenêtre navigateur */
    const win = window.open('', '_blank', 'width=860,height=750,scrollbars=yes,toolbar=no,menubar=no');
    if (!win) {
      toast('Le navigateur a bloqué l\'ouverture de la fenêtre. Autorisez les popups pour ce site.', 'warning');
      return;
    }
    win.document.write(documentHtml);
    win.document.close();

    /* Bouton "Convertir en Facture" dans la nouvelle fenêtre */
    if (peutFacturer) {
      win.document.getElementById('btn-doc-facturer')?.addEventListener('click', () => {
        win.close();
        _createInvoiceFromQuote(devis, toolbar, area);
      });
    }

    /* Bouton "Imprimer / PDF" — sauvegarde automatiquement dans Dropbox + ERP */
    win.document.getElementById('btn-doc-print')?.addEventListener('click', async () => {
      const filename = `${C()._safeFilename(devis.client)}_devis_${C()._safeFilename(devis.ref)}.html`;
      const htmlContent = '<!DOCTYPE html>' + win.document.documentElement.outerHTML;
      await C()._sauverDocDropbox(devis.client, filename, htmlContent, 'Devis');
      win.print();
    });

    /* Bouton "Envoyer par email" — génère un mailto: avec le résumé du devis */
    win.document.getElementById('btn-doc-email')?.addEventListener('click', () => {
      /* Afficher le guide étape par étape */
      const tip = win.document.getElementById('email-tip');
      if (tip) tip.style.display = tip.style.display === 'block' ? 'none' : 'block';

      /* Construire le corps de l'email */
      const lignesTxt = (devis.lignes || []).map(l => {
        const brut = (l.qte || 0) * (l.prixUnitaire || 0);
        const ht   = brut * (1 - ((l.remise || 0) / 100));
        const taux = (l.tauxTVA !== undefined ? l.tauxTVA : 16) / 100;
        const ttc  = Math.round(ht * (1 + taux));
        return `- ${l.produit || l.description || '?'} × ${l.qte || 0}  →  ${ttc.toLocaleString('fr-FR')} XPF`;
      }).join('\n');

      const corps = [
        `Bonjour,`,
        ``,
        `Veuillez trouver ci-joint le devis ${devis.ref} établi à votre attention.`,
        ``,
        `─── Récapitulatif ───`,
        `Référence : ${devis.ref}`,
        `Date      : ${devis.date || ''}`,
        devis.dateExpiration ? `Validité  : ${devis.dateExpiration}` : '',
        ``,
        `Articles :`,
        lignesTxt,
        ``,
        `Total HT  : ${(devis.totalHT || 0).toLocaleString('fr-FR')} XPF`,
        `TVA       : ${(devis.totalTVA || 0).toLocaleString('fr-FR')} XPF`,
        `Total TTC : ${(devis.totalTTC || 0).toLocaleString('fr-FR')} XPF`,
        ``,
        devis.notes ? `Conditions : ${devis.notes}` : '',
        ``,
        `Pour toute question, n'hésitez pas à nous contacter.`,
        ``,
        `Cordialement,`,
        C()._getDocParams().entreprise,
        C()._getDocParams().email
      ].filter(l => l !== '').join('\n');

      const pDoc  = C()._getDocParams();
      const email = (contact.email || '').trim();
      const sujet = encodeURIComponent(`Devis ${devis.ref} — ${pDoc.entreprise}`);
      const body  = encodeURIComponent(corps);

      /* Ouvre directement Gmail Compose (boîte highcoffeeshirt@gmail.com) */
      const gmailUrl = `https://mail.google.com/mail/?view=cm&from=${encodeURIComponent(pDoc.gmailFrom)}&to=${encodeURIComponent(email)}&su=${sujet}&body=${body}`;
      win.open(gmailUrl, '_blank');
    });
  }

  function _convertQuoteToOrder(devis, toolbar, area) {
    showConfirm(
      `Convertir "${devis.ref}" en commande ? Le devis passera en "Confirmé".`,
      () => {
        const ref = C()._genRef('CMD', 'commandes');
        Store.create('commandes', {
          ref,
          _type:        'Commande',
          contactId:    devis.contactId,
          client:       devis.client,
          date:         new Date().toISOString().slice(0, 10),
          dateLivraison:'',
          statut:       'Confirmé',
          quoteId:      devis.id,
          lignes:       devis.lignes,
          totalHT:      devis.totalHT,
          totalTVA:     devis.totalTVA,
          totalTTC:     devis.totalTTC,
          notes:        devis.notes || ''
        });
        Store.update('devis', devis.id, { statut: 'Confirmé' });
        C()._pushPlanningCard(devis, ref);
        toast(`✔ Commande ${ref} créée + carte ajoutée au planning.`, 'success');
        C()._goList('quotes', toolbar, area);
      }
    );
  }

  /** Crée une facture directement depuis un devis confirmé */
  function _createInvoiceFromQuote(devis, toolbar, area) {
    showFormModal(
      `Facturer le devis ${devis.ref}`,
      [
        {
          name: 'type',
          label: 'Type de facture',
          type: 'select',
          options: [
            { value: 'totale',  label: 'Facture totale (100%)' },
            { value: 'acompte', label: 'Acompte / Facture partielle' }
          ]
        },
        {
          name: 'montantAcompte',
          label: 'Montant de l\'acompte (XPF) — si partiel',
          type: 'number'
        },
        {
          name: 'dateEcheance',
          label: 'Date d\'échéance',
          type: 'date'
        }
      ],
      { type: 'totale', dateEcheance: '' },
      (data) => {
        /* Guard anti-doublon */
        const dejaFacturee = Store.getAll('factures').find(f => f.devisId === devis.id);
        if (dejaFacturee) {
          toast(`⚠️ Ce devis est déjà lié à la facture ${dejaFacturee.ref}.`, 'warning');
          C()._goForm('invoices', dejaFacturee.id, toolbar, area);
          return;
        }

        const ref = C()._genRef('FAC', 'factures');
        const isAcompte = data.type === 'acompte';

        /* P3 — recalcul fiable depuis les lignes (fallback si totaux absents sur le devis) */
        const totauxCalc = C()._calcTotaux(devis.lignes || []);
        let lignes = devis.lignes;
        let totalHT  = devis.totalHT  ?? totauxCalc.totalHT;
        let totalTVA = devis.totalTVA ?? totauxCalc.totalTVA;
        let totalTTC = devis.totalTTC ?? totauxCalc.totalTTC;

        if (isAcompte && data.montantAcompte) {
          const montantAc = parseFloat(data.montantAcompte) || 0;
          const base = totalTTC > 0 ? totalTTC : totauxCalc.totalTTC;
          const ratio = base > 0 ? montantAc / base : 1;
          lignes = devis.lignes.map(l => ({
            ...l,
            prixUnitaire: Math.round((l.prixUnitaire || 0) * ratio)
          }));
          const t = C()._calcTotaux(lignes);
          totalHT  = t.totalHT;
          totalTVA = t.totalTVA;
          totalTTC = t.totalTTC;
        }

        Store.create('factures', {
          ref,
          _type:        'Facture',
          contactId:    devis.contactId,
          client:       devis.client,
          devisId:      devis.id,
          date:         new Date().toISOString().slice(0, 10),
          dateEcheance: data.dateEcheance || '',
          statut:       'Brouillon',
          lignes,
          paiements:    [],
          totalHT,
          totalTVA,
          totalTTC,
          notes:        (isAcompte ? `Acompte sur devis ${devis.ref}` : `Facture devis ${devis.ref}`)
                        + (devis.notes ? '\n' + devis.notes : '')
        });

        /* P1 — marquer le devis comme facturé */
        Store.update('devis', devis.id, { statut: 'Facturé' });

        toast(`✔ Facture ${ref} créée depuis ${devis.ref}.`, 'success');
        C()._goList('quotes', toolbar, area);
      }
    );
  }

  /* ---- Interface publique ---- */
  return {
    _renderList:    _renderQuotesList,
    _renderForm:    _renderQuoteForm,
    _previewDevis,
  };

})();
