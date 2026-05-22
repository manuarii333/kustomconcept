'use strict';
/* ================================================================
   SALES-ORDERS.JS — Module Commandes & Bons de Livraison
   Extrait de sales.js · Dépend de window._SalesCore (sales.js)
   Exporte : window.SalesOrders._renderList / _renderForm / _renderReceiptsList
   ================================================================ */
window.SalesOrders = (() => {
  /* Référence paresseuse vers le bridge partagé de sales.js */
  const C = () => window._SalesCore;

  /* ================================================================
     VUE COMMANDES (ORDERS)
     ================================================================ */

  function _renderOrdersList(toolbar, area) {
    let allCmds = Store.getAll('commandes');
    const isKanban = C()._state.listMode === 'kanban';

    /* Les commandes sont créées depuis les devis — pas de création manuelle */
    toolbar.innerHTML = `
      <select class="form-control" id="filter-order-statut"
        style="height:28px;width:155px;font-size:12px;">
        <option value="">Tous les statuts</option>
        ${C().STATUTS_CMD.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <input type="text" id="filter-order-client" placeholder="🔍 Client..."
        class="form-control" style="height:28px;width:140px;font-size:12px;">
      <input type="date" id="filter-order-from" title="Date début"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <input type="date" id="filter-order-to" title="Date fin"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <div style="display:flex;gap:4px;margin-left:4px;">
        <button class="btn ${!isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-o-list">☰</button>
        <button class="btn ${isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-o-kanban">⊞</button>
      </div>`;

    const _applyOrderFilters = () => {
      const statut = document.getElementById('filter-order-statut')?.value || '';
      const client = (document.getElementById('filter-order-client')?.value || '').toLowerCase();
      const from   = document.getElementById('filter-order-from')?.value || '';
      const to     = document.getElementById('filter-order-to')?.value || '';
      let filtered = allCmds;
      if (statut) filtered = filtered.filter(c => c.statut === statut);
      if (client) filtered = filtered.filter(c => (c.client || '').toLowerCase().includes(client));
      if (from)   filtered = filtered.filter(c => (c.date || '') >= from);
      if (to)     filtered = filtered.filter(c => (c.date || '') <= to);
      if (isKanban) C()._drawKanban(filtered, C().STATUTS_CMD, C().BADGE_CMD, 'orders', toolbar, area);
      else _drawOrdersTable(filtered, toolbar, area);
    };

    document.getElementById('btn-o-list')?.addEventListener('click', () => {
      C()._state.listMode = 'list'; _renderOrdersList(toolbar, area);
    });
    document.getElementById('btn-o-kanban')?.addEventListener('click', () => {
      C()._state.listMode = 'kanban'; _renderOrdersList(toolbar, area);
    });
    document.getElementById('filter-order-statut')?.addEventListener('change', _applyOrderFilters);
    document.getElementById('filter-order-client')?.addEventListener('input', _applyOrderFilters);
    document.getElementById('filter-order-from')?.addEventListener('change', _applyOrderFilters);
    document.getElementById('filter-order-to')?.addEventListener('change', _applyOrderFilters);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Commandes</div>
        <div class="page-subtitle">${allCmds.length} document(s)</div>
      </div>
      <div id="sales-orders-table"></div>`;

    if (isKanban) C()._drawKanban(allCmds, C().STATUTS_CMD, C().BADGE_CMD, 'orders', toolbar, area);
    else _drawOrdersTable(allCmds, toolbar, area);
  }

  function _drawOrdersTable(data, toolbar, area) {
    renderTable('sales-orders-table', {
      searchable: true,
      sortable:   true,
      data,
      columns: [
        { key: 'ref',          label: 'Numéro',    render: (v) => `<span class="col-ref">${C()._esc(v)}</span>` },
        { key: 'date',         label: 'Date',       type: 'date' },
        { key: 'client',       label: 'Client',     type: 'text' },
        { key: 'dateLivraison',label: 'Livraison',  type: 'date' },
        { key: 'totalTTC',     label: 'Total TTC',  render: (v) => `<span class="mono">${C()._fmt(v)}</span>` },
        { key: 'statut',       label: 'Statut',     type: 'badge', badgeMap: C().BADGE_CMD }
      ],
      onRowClick: (item) => C()._goForm('orders', item.id, toolbar, area),
      emptyMsg:   'Aucune commande.'
    });
  }

  /* ---- Formulaire commande ---- */
  function _renderOrderForm(toolbar, area) {
    const isNew = !C()._state.currentId;
    const doc   = isNew ? null : Store.getById('commandes', C()._state.currentId);

    if (!isNew && !doc) {
      toast('Commande introuvable.', 'error');
      return C()._goList('orders', toolbar, area);
    }

    C()._state.lignes = doc ? doc.lignes.map(l => ({ ...l })) : [];

    const ref    = doc?.ref    || C()._genRef('CMD', 'commandes');
    const statut = doc?.statut || 'Brouillon';

    /* Chips de liaison : Devis source, OF, Bon de Production */
    let chips = '';
    if (doc?.quoteId) {
      const devisLie = Store.getById('devis', doc.quoteId);
      const devisRef = devisLie?.ref || doc.quoteId;
      chips += `<span class="chip" title="Devis source">📄 ${C()._esc(devisRef)}</span>`;
    }
    if (doc) {
      const ofLie = Store.getAll('ordresFab').find(o =>
        o.commandeId === doc.id || (doc.quoteId && o.devisOrigineId === doc.quoteId)
      );
      if (ofLie) {
        chips += `<span class="chip" style="background:var(--accent-orange,#f0a030);color:#fff;" title="Ordre de Fabrication lié">🏭 ${C()._esc(ofLie.reference)}</span>`;
      }
      const bpLie = Store.getAll('bons_production').find(b => b.commandeId === doc.id);
      if (bpLie) {
        chips += `<span class="chip" style="background:var(--accent-blue,#3b82f6);color:#fff;" title="Bon de Production lié">⚙ ${C()._esc(bpLie.ref)}</span>`;
      }
    }

    toolbar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-back">← Retour</button>
      ${_orderActionBtns(statut, isNew)}`;

    document.getElementById('btn-back')
      ?.addEventListener('click', () => C()._goList('orders', toolbar, area));

    area.innerHTML = `
      ${C()._renderFormHeader(ref, statut, C().BADGE_CMD, chips)}

      <div class="form-section">
        <div class="form-section-title">Informations générales</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select class="form-control" id="o-client" required>
              <option value="">— Choisir un client —</option>
              <option value="__new__" style="color:var(--accent-blue);font-weight:600;">➕ Créer nouveau client</option>
              ${Store.getAll('contacts').map(c =>
                `<option value="${c.id}" ${doc?.contactId === c.id ? 'selected' : ''}>${C()._esc(c.nom)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Date commande</label>
            <input type="date" class="form-control" id="o-date"
              value="${doc?.date || new Date().toISOString().slice(0,10)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Livraison prévue</label>
            <input type="date" class="form-control" id="o-livraison"
              value="${doc?.dateLivraison || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-control" id="o-notes" rows="2"
              placeholder="Instructions de livraison, références client…">${C()._esc(doc?.notes || '')}</textarea>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Articles</div>
        ${C()._renderLineTable(C()._state.lignes)}
      </div>

      <div class="form-section" style="padding:0;">
        ${C()._renderTotalsBlock(C()._state.lignes)}
      </div>

      <!-- Section livraison -->
      <div class="form-section">
        <div class="form-section-title">🚚 Livraison</div>
        <div class="form-grid cols-3">
          <div class="form-group">
            <label class="form-label">Mode de livraison</label>
            <select class="form-control" id="o-livraison-mode">
              <option value="retrait" ${(doc?.livraisonMode||'retrait')==='retrait'?'selected':''}>🏪 Retrait boutique</option>
              <option value="livraison" ${doc?.livraisonMode==='livraison'?'selected':''}>🚚 Livraison à domicile</option>
              <option value="coursier" ${doc?.livraisonMode==='coursier'?'selected':''}>🛵 Coursier</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Date de retrait / livraison</label>
            <input type="date" class="form-control" id="o-retrait-date"
              value="${doc?.retraitDate || doc?.dateLivraison || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Adresse de livraison</label>
            <input type="text" class="form-control" id="o-livraison-adresse"
              value="${C()._esc(doc?.livraisonAdresse || '')}"
              placeholder="Ex: BP 123, Papeete" />
          </div>
        </div>
      </div>

      <!-- Section acompte / paiement -->
      <div class="form-section">
        <div class="form-section-title">💳 Acompte &amp; paiement</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Acompte reçu (XPF)</label>
            <input type="number" class="form-control" id="o-acompte"
              value="${doc?.acompte || 0}" min="0" step="100"
              placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">Statut paiement</label>
            <select class="form-control" id="o-statut-paiement">
              <option value="non_paye"   ${(doc?.statutPaiement||'non_paye')==='non_paye'  ?'selected':''}>🔴 Non payé</option>
              <option value="acompte"    ${doc?.statutPaiement==='acompte'  ?'selected':''}>🟡 Acompte reçu</option>
              <option value="paye"       ${doc?.statutPaiement==='paye'     ?'selected':''}>✅ Payé intégralement</option>
            </select>
          </div>
        </div>
        <div id="o-reste-payer" style="margin-top:8px;padding:10px 14px;background:#F5F8FF;border-radius:8px;font-size:13px;display:none;"></div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
        <button class="btn btn-ghost" id="o-cancel">Annuler</button>
        <button class="btn btn-primary" id="o-save">✔ Sauvegarder</button>
      </div>`;

    C()._bindLineTableEvents();
    _bindOrderFormEvents(isNew, doc, ref, toolbar, area);
  }

  function _orderActionBtns(statut, isNew) {
    if (isNew) return '';
    const flow = ['Brouillon', 'Confirmé', 'En production', 'Prêt', 'Livré', 'Terminé'];
    const idx  = flow.indexOf(statut);
    const btns = [];

    if (idx >= 0 && idx < flow.length - 1) {
      const next = flow[idx + 1];
      btns.push(`<button class="btn btn-primary btn-sm" data-o-action="next"
        data-next="${C()._esc(next)}">→ ${C()._esc(next)}</button>`);
    }
    /* Lancer en production (OF) dès "Confirmé" */
    if (statut === 'Confirmé') {
      btns.push(`<button class="btn btn-primary btn-sm" data-o-action="lancer-prod">▶ Lancer en production</button>`);
    }
    /* Bon de production dès "En production" */
    if (statut === 'En production') {
      btns.push(`<button class="btn btn-ghost btn-sm" data-o-action="production">⚙ Bon de production</button>`);
    }
    /* Bon de livraison quand prêt ou livré */
    if (['Prêt', 'Livré'].includes(statut)) {
      btns.push(`<button class="btn btn-ghost btn-sm" data-o-action="livraison">📋 Bon de livraison</button>`);
    }
    if (['Livré', 'Terminé'].includes(statut)) {
      btns.push(`<button class="btn btn-success btn-sm" data-o-action="facturer">🧾 Créer Facture</button>`);
    }
    return btns.join('');
  }

  function _bindOrderFormEvents(isNew, doc, ref, toolbar, area) {
    /* Création rapide client depuis la liste déroulante */
    C()._bindClientSelectCreation('o-client');

    /* Remise client spéciale : appliquée dès la sélection */
    document.getElementById('o-client')?.addEventListener('change', () => {
      C()._applyRemiseClient('o-client');
    });

    document.getElementById('o-save')?.addEventListener('click', () => {
      const contactId = document.getElementById('o-client')?.value;
      if (!contactId || contactId === '__new__') { toast('Veuillez sélectionner un client.', 'error'); return; }
      if (C()._state.lignes.length === 0) { toast('Ajoutez au moins un article.', 'error'); return; }

      const record = {
        ref,
        _type:            'Commande',
        contactId,
        client:           C()._contactNom(contactId),
        date:             document.getElementById('o-date')?.value      || '',
        dateLivraison:    document.getElementById('o-livraison')?.value || '',
        notes:            document.getElementById('o-notes')?.value     || '',
        statut:           doc?.statut || 'Brouillon',
        quoteId:          doc?.quoteId || null,
        lignes:           C()._state.lignes,
        livraisonMode:    document.getElementById('o-livraison-mode')?.value    || 'retrait',
        retraitDate:      document.getElementById('o-retrait-date')?.value      || '',
        livraisonAdresse: document.getElementById('o-livraison-adresse')?.value || '',
        acompte:          parseFloat(document.getElementById('o-acompte')?.value) || 0,
        statutPaiement:   document.getElementById('o-statut-paiement')?.value   || 'non_paye',
        ...C()._calcTotaux(C()._state.lignes)
      };

      if (isNew) {
        Store.create('commandes', record);
        toast('Commande créée.', 'success');
      } else {
        Store.update('commandes', doc.id, record);
        toast('Commande sauvegardée.', 'success');
      }
      C()._goList('orders', toolbar, area);
    });

    document.getElementById('o-cancel')
      ?.addEventListener('click', () => C()._goList('orders', toolbar, area));

    /* Calcul du reste à payer en temps réel */
    function _updateRestePayer() {
      const acompte = parseFloat(document.getElementById('o-acompte')?.value) || 0;
      const total   = C()._calcTotaux(C()._state.lignes).totalTTC;
      const reste   = total - acompte;
      const el      = document.getElementById('o-reste-payer');
      if (!el) return;
      if (acompte > 0 || total > 0) {
        el.style.display = 'block';
        el.innerHTML = `
          <div style="display:flex;gap:24px;flex-wrap:wrap;">
            <span>💰 Total TTC : <strong style="font-family:var(--font-mono);">${C()._fmt(total)}</strong></span>
            <span>✅ Acompte : <strong style="font-family:var(--font-mono);color:#16A34A;">${C()._fmt(acompte)}</strong></span>
            <span>🔴 Reste à payer : <strong style="font-family:var(--font-mono);color:${reste > 0 ? '#DC2626' : '#16A34A'};">${C()._fmt(Math.max(0, reste))}</strong></span>
          </div>`;
      } else {
        el.style.display = 'none';
      }
    }
    document.getElementById('o-acompte')?.addEventListener('input', _updateRestePayer);
    _updateRestePayer(); /* état initial */

    toolbar.querySelectorAll('[data-o-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.oAction;
        if (action === 'next') {
          const next = btn.dataset.next;
          showConfirm(`Passer la commande en "${next}" ?`, () => {
            Store.update('commandes', doc.id, { statut: next });
            toast(`Commande : ${next}`, 'success');
            C()._goList('orders', toolbar, area);
          });
        } else if (action === 'lancer-prod') {
          _createOFFromOrder(doc, toolbar, area);
        } else if (action === 'facturer') {
          _createInvoiceFromOrder(doc, toolbar, area);
        } else if (action === 'production') {
          _createBonProduction(doc, toolbar, area);
        } else if (action === 'livraison') {
          _createBonLivraison(doc, toolbar, area);
        }
      });
    });
  }

  function _createInvoiceFromOrder(cmd, toolbar, area) {
    showConfirm(
      `Créer une facture depuis la commande ${cmd.ref} ?`,
      () => {
        const ref = C()._genRef('FAC', 'factures');
        Store.create('factures', {
          ref,
          _type:        'Facture',
          contactId:    cmd.contactId,
          client:       cmd.client,
          commandeId:   cmd.id,
          date:         new Date().toISOString().slice(0, 10),
          dateEcheance: '',
          statut:       'Brouillon',
          lignes:       cmd.lignes,
          paiements:    [],
          totalHT:      cmd.totalHT,
          totalTVA:     cmd.totalTVA,
          totalTTC:     cmd.totalTTC,
          notes:        cmd.notes || ''
        });
        Store.update('commandes', cmd.id, { statut: 'Terminé' });
        /* Déduire le stock automatiquement */
        C()._deductStockFromLines(cmd.lignes || []);
        toast(`✔ Facture ${ref} créée depuis ${cmd.ref}.`, 'success');
        C()._goList('orders', toolbar, area);
      }
    );
  }

  /* ================================================================
     LANCER EN PRODUCTION — crée un Ordre de Fabrication (OF)
     ================================================================ */

  function _createOFFromOrder(cmd, toolbar, area) {
    /* Vérifier si un OF existe déjà pour cette commande ou son devis source */
    const ofs = Store.getAll('ordresFab');
    const ofExistant = ofs.find(o =>
      o.commandeId === cmd.id ||
      (cmd.quoteId && o.devisOrigineId === cmd.quoteId)
    );

    const msg = ofExistant
      ? `Un Ordre de Fabrication (${ofExistant.reference}) existe déjà pour cette commande.\nPasser quand même en "En production" ?`
      : `Lancer la commande "${cmd.ref}" en production ?\nUn Ordre de Fabrication et une carte planning seront créés automatiquement.`;

    showConfirm(msg, () => {
      if (!ofExistant) {
        /* Créer OF complet + carte planning via le bridge partagé */
        C()._pushPlanningCard(cmd, cmd.ref);

        /* Lier le dernier OF créé à cette commande */
        const ofs2 = Store.getAll('ordresFab');
        const dernierOF = ofs2.reduce((max, o) => (!max || o.id > max.id ? o : max), null);
        if (dernierOF && !dernierOF.commandeId) {
          Store.update('ordresFab', dernierOF.id, { commandeId: cmd.id, cmdRef: cmd.ref });
        }
      }

      /* Passer la commande en production */
      Store.update('commandes', cmd.id, { statut: 'En production' });

      const ofRef = ofExistant?.reference || '';
      toast(`✔ Commande "${cmd.ref}" lancée en production${ofRef ? ` — OF ${ofRef}` : ''}.`, 'success');
      C()._goList('orders', toolbar, area);
    });
  }

  /* ================================================================
     BONS DE PRODUCTION (création depuis commande)
     ================================================================ */

  function _createBonProduction(cmd, toolbar, area) {
    showConfirm(
      `Créer un bon de production pour la commande ${cmd.ref} ?`,
      () => {
        const ref = C()._genRef('BP', 'bons_production');
        Store.create('bons_production', {
          ref,
          _type:      'BonProduction',
          commandeId: cmd.id,
          cmdRef:     cmd.ref,
          contactId:  cmd.contactId,
          client:     cmd.client,
          date:       new Date().toISOString().slice(0, 10),
          datePrevue: cmd.dateLivraison || '',
          statut:     'En attente',
          lignes:     cmd.lignes.map(l => ({ ...l, qteRealisee: 0 })),
          notes:      cmd.notes || ''
        });
        /* Passer la commande en production */
        if (cmd.statut === 'Confirmé') {
          Store.update('commandes', cmd.id, { statut: 'En production' });
        }
        toast(`✔ Bon de production ${ref} créé.`, 'success');
        C()._goList('orders', toolbar, area);
      }
    );
  }

  /* ================================================================
     BONS DE LIVRAISON / RÉCEPTION
     ================================================================ */

  function _createBonLivraison(cmd, toolbar, area) {
    showConfirm(
      `Créer un bon de livraison pour la commande ${cmd.ref} ?`,
      () => {
        const ref = C()._genRef('BL', 'bons_livraison');
        Store.create('bons_livraison', {
          ref,
          _type:      'BonLivraison',
          commandeId: cmd.id,
          cmdRef:     cmd.ref,
          contactId:  cmd.contactId,
          client:     cmd.client,
          date:       new Date().toISOString().slice(0, 10),
          statut:     'En attente',
          lignes:     cmd.lignes.map(l => ({ ...l, qteRecue: 0 })),
          notes:      ''
        });
        toast(`✔ Bon de livraison ${ref} créé.`, 'success');
        C()._goList('orders', toolbar, area);
      }
    );
  }

  /* ---- Liste des Bons de Livraison ---- */
  function _renderReceiptsList(toolbar, area) {
    const allBL = Store.getAll('bons_livraison');
    const isKanban = C()._state.listMode === 'kanban';

    toolbar.innerHTML = `
      <div style="display:flex;gap:4px;margin-left:auto;">
        <button class="btn ${!isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-bl-list">☰</button>
        <button class="btn ${isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-bl-kanban">⊞</button>
      </div>`;

    document.getElementById('btn-bl-list')?.addEventListener('click', () => {
      C()._state.listMode = 'list'; _renderReceiptsList(toolbar, area);
    });
    document.getElementById('btn-bl-kanban')?.addEventListener('click', () => {
      C()._state.listMode = 'kanban'; _renderReceiptsList(toolbar, area);
    });

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Bons de Livraison</div>
        <div class="page-subtitle">${allBL.length} document(s)</div>
      </div>
      <div id="sales-bl-table"></div>`;

    if (isKanban) {
      C()._drawKanban(allBL, C().STATUTS_BL, C().BADGE_BL, 'receipts', toolbar, area);
    } else {
      renderTable('sales-bl-table', {
        searchable: true,
        sortable:   true,
        data: allBL,
        columns: [
          { key: 'ref',       label: 'Numéro',   render: (v) => `<span class="col-ref">${C()._esc(v)}</span>` },
          { key: 'date',      label: 'Date',      type: 'date' },
          { key: 'cmdRef',    label: 'Commande',  type: 'text' },
          { key: 'client',    label: 'Client',    type: 'text' },
          { key: 'statut',    label: 'Statut',    type: 'badge', badgeMap: C().BADGE_BL },
          {
            key: '_actions', label: '', type: 'actions',
            actions: [
              {
                label: '📋 Voir/Valider', className: 'btn-ghost',
                onClick: (row) => _renderBLForm(toolbar, area, row)
              }
            ]
          }
        ],
        onRowClick: (row) => _renderBLForm(toolbar, area, row),
        emptyMsg: 'Aucun bon de livraison. Créez-les depuis les commandes (statut Prêt ou Livré).'
      });
    }
  }

  /** Formulaire / détail d'un bon de livraison */
  function _renderBLForm(toolbar, area, bl) {
    toolbar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-bl-back">← Retour</button>
      ${bl.statut !== 'Reçu complet' ? `<button class="btn btn-success btn-sm" id="btn-bl-valider">✔ Marquer Reçu</button>` : ''}`;

    document.getElementById('btn-bl-back')?.addEventListener('click', () => {
      C()._state.mode = 'list';
      _renderReceiptsList(toolbar, area);
    });

    const lignesHtml = (bl.lignes || []).map((l, i) => `
      <tr>
        <td>${C()._esc(l.description || l.produitId || '—')}</td>
        <td class="col-num">${l.qte || 0}</td>
        <td class="col-num">
          <input type="number" class="line-input num-input" id="bl-qte-${i}"
            value="${l.qteRecue || 0}" min="0" max="${l.qte || 999}" step="1" style="width:70px;" />
        </td>
        <td>
          <span style="font-size:11px;color:${(l.qteRecue || 0) >= (l.qte || 0)
            ? 'var(--accent-green)' : 'var(--accent-orange)'};">
            ${(l.qteRecue || 0) >= (l.qte || 0) ? '✓ OK' : `Manque ${(l.qte || 0) - (l.qteRecue || 0)}`}
          </span>
        </td>
      </tr>`).join('');

    area.innerHTML = `
      <div style="max-width:760px;margin:0 auto;padding:24px 0;">
        <div style="font-size:20px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">
          ${C()._esc(bl.ref)} <span class="badge ${C().BADGE_BL[bl.statut] || 'badge-gray'}">${C()._esc(bl.statut)}</span>
        </div>
        <div style="color:var(--text-muted);font-size:13px;margin-bottom:24px;">
          Client : ${C()._esc(bl.client)} · Commande : ${C()._esc(bl.cmdRef)} · Date : ${C()._fmtDate(bl.date)}
        </div>

        <div class="form-section">
          <div class="form-section-title">Articles à réceptionner</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr>
                <th>Article</th>
                <th class="col-num">Qté commandée</th>
                <th class="col-num">Qté reçue</th>
                <th>État</th>
              </tr></thead>
              <tbody>${lignesHtml}</tbody>
            </table>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">Notes</div>
          <textarea class="form-control" id="bl-notes" rows="3"
            placeholder="Remarques sur la réception, dommages, manquants…">${C()._esc(bl.notes || '')}</textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
          <button class="btn btn-ghost" id="bl-save-partiel">💾 Sauvegarder partiel</button>
          ${bl.statut !== 'Reçu complet' ? `<button class="btn btn-success" id="bl-save-complet">✔ Reçu complet</button>` : ''}
        </div>
      </div>`;

    const _saveBL = (complet) => {
      const lignesMAJ = (bl.lignes || []).map((l, i) => ({
        ...l,
        qteRecue: parseInt(document.getElementById(`bl-qte-${i}`)?.value || '0', 10)
      }));
      const notes    = document.getElementById('bl-notes')?.value || '';
      const totalQte = lignesMAJ.reduce((s, l) => s + (l.qte || 0), 0);
      const recuQte  = lignesMAJ.reduce((s, l) => s + (l.qteRecue || 0), 0);
      const newStatut = complet ? 'Reçu complet'
        : recuQte > 0 ? 'Reçu partiel' : 'En attente';

      Store.update('bons_livraison', bl.id, { lignes: lignesMAJ, notes, statut: newStatut });

      /* Mettre à jour le stock si réception */
      if (recuQte > 0) {
        lignesMAJ.forEach(l => {
          if (l.produitId && l.qteRecue > 0) {
            const prod = Store.getById('produits', l.produitId);
            if (prod) {
              Store.update('produits', prod.id, { stock: (prod.stock || 0) + l.qteRecue });
              Store.create('mouvements', {
                date:       new Date().toISOString().slice(0, 10),
                produitId:  prod.id,
                produitNom: prod.nom,
                type:       'Entrée',
                quantite:   l.qteRecue,
                motif:      `Réception ${bl.ref} — ${bl.cmdRef}`,
                reference:  bl.ref
              });
            }
          }
        });
      }

      toast(`Bon de livraison ${bl.ref} — ${newStatut}.`, 'success');
      _renderReceiptsList(toolbar, area);
    };

    document.getElementById('bl-save-partiel')?.addEventListener('click', () => _saveBL(false));
    document.getElementById('bl-save-complet')?.addEventListener('click', () => _saveBL(true));
    document.getElementById('btn-bl-valider')?.addEventListener('click', () => _saveBL(true));
  }

  /* ================================================================
     EXPORTS
     ================================================================ */
  return {
    _renderList:         _renderOrdersList,
    _renderForm:         _renderOrderForm,
    _renderReceiptsList: _renderReceiptsList,
  };
})();
