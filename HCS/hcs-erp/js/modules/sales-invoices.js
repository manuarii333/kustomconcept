'use strict';
/* ================================================================
   SALES-INVOICES.JS — Module Factures
   Extrait de sales.js · Dépend de window._SalesCore (sales.js)
   Exporte : window.SalesInvoices._renderList / _renderForm
   ================================================================ */
window.SalesInvoices = (() => {
  /* Référence paresseuse vers le bridge partagé de sales.js */
  const C = () => window._SalesCore;

  /* ================================================================
     LETTRAGE — utilitaires
     ================================================================ */
  const LETTRAGE_ICONS  = { 'Espèces': '💵', 'Carte bancaire': '💳', 'Virement': '🏦', 'Chèque': '📋' };
  const LETTRAGE_COLORS = { 'Espèces': '#22c55e', 'Carte bancaire': '#3b82f6', 'Virement': '#8b5cf6', 'Chèque': '#f59e0b' };

  /** Regroupe les paiements par mode et retourne { mode: totalMontant } */
  function _buildLettrageParMode(paiements) {
    const result = {};
    (paiements || []).forEach(p => {
      if (!p.methode || !(Number(p.montant) > 0)) return;
      result[p.methode] = (result[p.methode] || 0) + Number(p.montant);
    });
    return result;
  }

  /** Bloc visuel de lettrage (formulaire et aperçu) */
  function _renderLettrageBlock(paiements, totalTTC) {
    const parMode   = _buildLettrageParMode(paiements);
    const totalPaye = Object.values(parMode).reduce((s, v) => s + v, 0);
    if (totalPaye <= 0) return '';

    const estSolde = totalTTC > 0 && totalPaye >= totalTTC;
    const lignes   = Object.entries(parMode).map(([mode, montant]) => {
      const pct   = totalTTC > 0 ? Math.min(100, Math.round((montant / totalTTC) * 100)) : 0;
      const color = LETTRAGE_COLORS[mode] || '#6b7280';
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;
                    border-bottom:1px solid var(--border,#2a2a2a);">
          <div style="width:140px;font-size:12px;font-weight:600;color:var(--text-primary,#f5ede0);">
            ${LETTRAGE_ICONS[mode] || '💰'} ${C()._esc(mode)}
          </div>
          <div style="flex:1;background:var(--bg-base,#111);border-radius:4px;height:8px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width .3s;"></div>
          </div>
          <div style="width:110px;text-align:right;font-family:var(--font-mono);font-size:12px;font-weight:600;">
            ${C()._fmt(montant)}
          </div>
          <div style="width:36px;text-align:right;font-size:11px;color:var(--text-muted,#c8b89a);">${pct}%</div>
        </div>`;
    }).join('');

    return `
      <div style="background:var(--bg-elevated,#2a1508);border:1px solid var(--border,#3b1f0e);
                  border-radius:10px;padding:14px;margin-top:16px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
                    color:var(--text-muted,#c8b89a);margin-bottom:12px;">
          🔗 Lettrage des règlements
        </div>
        ${lignes}
        <div style="display:flex;justify-content:space-between;align-items:center;
                    margin-top:12px;padding-top:10px;border-top:2px solid var(--border,#3b1f0e);">
          <span style="font-size:12px;font-weight:700;color:var(--text-primary,#f5ede0);">Total lettré</span>
          <span style="font-family:var(--font-mono);font-size:14px;font-weight:700;
                       color:${estSolde ? 'var(--accent-green,#22c55e)' : 'var(--caramel,#c4813a)'};">
            ${C()._fmt(totalPaye)} / ${C()._fmt(totalTTC)}${estSolde ? ' ✅' : ''}
          </span>
        </div>
      </div>`;
  }

  /** Calcule et retourne l'objet lettrage à persister sur la facture */
  function _computeLettrage(paiements, totalTTC) {
    const parMode   = _buildLettrageParMode(paiements);
    const totalPaye = Object.values(parMode).reduce((s, v) => s + v, 0);
    return {
      parMode,
      totalPaye,
      reste:    Math.max(0, (totalTTC || 0) - totalPaye),
      estSolde: totalTTC > 0 && totalPaye >= totalTTC,
      updatedAt: new Date().toISOString()
    };
  }

  /* ================================================================
     VUE FACTURES (INVOICES)
     ================================================================ */

  function _renderInvoicesList(toolbar, area) {
    /* Réinitialiser la recherche précédente pour éviter une liste vide au retour */
    if (typeof _tableState !== 'undefined' && _tableState['sales-invoices-table']) {
      _tableState['sales-invoices-table'].query = '';
    }

    let allFacs = Store.getAll('factures');
    const isKanban = C()._state.listMode === 'kanban';

    /* Totaux rapides pour résumé */
    const enCours  = allFacs.filter(f => !['Payé'].includes(f.statut));
    const reglees  = allFacs.filter(f => f.statut === 'Payé');
    const totalReste = enCours.reduce((s, f) =>
      s + Math.max(0, (f.totalTTC || 0) - C()._totalPaiements(f.paiements)), 0);

    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-new-invoice">+ Nouveau</button>
      <button class="btn btn-ghost btn-sm" id="btn-sync-mysql-fac" title="Importer les factures depuis MySQL">☁↓ Sync</button>
      <select class="form-control" id="filter-invoice-tab"
        style="height:28px;width:140px;font-size:12px;">
        <option value="toutes">Toutes (${allFacs.length})</option>
        <option value="en_cours">En cours (${enCours.length})</option>
        <option value="reglees">Réglées (${reglees.length})</option>
      </select>
      <select class="form-control" id="filter-invoice-statut"
        style="height:28px;width:145px;font-size:12px;">
        <option value="">Tous les statuts</option>
        ${C().STATUTS_FAC.map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
      <input type="text" id="filter-invoice-client" placeholder="🔍 Client..."
        class="form-control" style="height:28px;width:135px;font-size:12px;">
      <input type="date" id="filter-invoice-from" title="Date début"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <input type="date" id="filter-invoice-to" title="Date fin"
        class="form-control" style="height:28px;width:130px;font-size:12px;">
      <div style="display:flex;gap:4px;margin-left:4px;">
        <button class="btn ${!isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-i-list">☰</button>
        <button class="btn ${isKanban ? 'btn-primary' : 'btn-ghost'} btn-sm" id="btn-i-kanban">⊞</button>
      </div>`;

    let currentData = allFacs;

    const _applyFilters = () => {
      const tab    = document.getElementById('filter-invoice-tab')?.value || 'toutes';
      const statut = document.getElementById('filter-invoice-statut')?.value || '';
      const client = (document.getElementById('filter-invoice-client')?.value || '').toLowerCase();
      const from   = document.getElementById('filter-invoice-from')?.value || '';
      const to     = document.getElementById('filter-invoice-to')?.value || '';
      let base = tab === 'reglees' ? reglees : tab === 'toutes' ? allFacs : enCours;
      if (statut) base = base.filter(f => f.statut === statut);
      if (client) base = base.filter(f => (f.client || '').toLowerCase().includes(client));
      if (from)   base = base.filter(f => (f.date || '') >= from);
      if (to)     base = base.filter(f => (f.date || '') <= to);
      currentData = base;
      if (isKanban) C()._drawKanban(base, C().STATUTS_FAC, C().BADGE_FAC, 'invoices', toolbar, area);
      else _drawInvoicesTable(base, toolbar, area);
    };

    document.getElementById('btn-new-invoice')
      ?.addEventListener('click', () => C()._goForm('invoices', null, toolbar, area));

    document.getElementById('btn-sync-mysql-fac')
      ?.addEventListener('click', async function() {
        this.disabled = true;
        this.textContent = '⏳…';
        const result = await Store.syncFromMySQL(['factures']);
        this.disabled = false;
        this.textContent = '☁↓ Sync';
        if (result.synced > 0) {
          toast(`${result.synced} facture(s) importée(s) depuis MySQL.`, 'success');
          _renderInvoicesList(toolbar, area);
        } else {
          toast('Aucune nouvelle facture à importer.', 'info');
        }
      });

    document.getElementById('btn-i-list')?.addEventListener('click', () => {
      C()._state.listMode = 'list'; _renderInvoicesList(toolbar, area);
    });
    document.getElementById('btn-i-kanban')?.addEventListener('click', () => {
      C()._state.listMode = 'kanban'; _renderInvoicesList(toolbar, area);
    });
    document.getElementById('filter-invoice-tab')?.addEventListener('change', _applyFilters);
    document.getElementById('filter-invoice-statut')?.addEventListener('change', _applyFilters);
    document.getElementById('filter-invoice-client')?.addEventListener('input', _applyFilters);
    document.getElementById('filter-invoice-from')?.addEventListener('change', _applyFilters);
    document.getElementById('filter-invoice-to')?.addEventListener('change', _applyFilters);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Factures</div>
        <div class="page-subtitle">${allFacs.length} document(s) ·
          <span style="color:var(--accent-red);font-weight:600;">
            ${typeof fmt === 'function' ? fmt(totalReste) : totalReste + ' XPF'} à encaisser
          </span>
        </div>
      </div>
      <div id="sales-invoices-table"></div>`;

    if (isKanban) C()._drawKanban(allFacs, C().STATUTS_FAC, C().BADGE_FAC, 'invoices', toolbar, area);
    else _drawInvoicesTable(allFacs, toolbar, area);
  }

  function _drawInvoicesTable(data, toolbar, area) {
    renderTable('sales-invoices-table', {
      searchable: true,
      sortable:   true,
      data: data.map(f => ({
        ...f,
        _reste: Math.max(0, (f.totalTTC || 0) - C()._totalPaiements(f.paiements))
      })),
      columns: [
        { key: 'ref',      label: 'Numéro',       render: (v) => `<span class="col-ref">${C()._esc(v)}</span>` },
        { key: 'date',     label: 'Date',           type: 'date' },
        { key: 'client',   label: 'Client',         type: 'text' },
        { key: 'dateEcheance', label: 'Échéance',   type: 'date' },
        { key: 'totalTTC', label: 'Total TTC',      render: (v) => `<span class="mono">${C()._fmt(v)}</span>` },
        {
          key: '_reste',   label: 'Reste à payer',
          render: (v) => {
            const color = v > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
            return `<span class="mono" style="color:${color};font-weight:600;">${C()._fmt(v)}</span>`;
          }
        },
        {
          key: 'paiements', label: 'Lettrage',
          render: (paiements) => {
            const parMode = _buildLettrageParMode(paiements);
            if (!Object.keys(parMode).length)
              return '<span style="color:var(--text-muted);font-size:11px;">—</span>';
            return Object.entries(parMode)
              .map(([mode, montant]) =>
                `<span class="badge badge-gray" style="font-size:10px;white-space:nowrap;">
                   ${LETTRAGE_ICONS[mode] || '💰'} ${C()._fmt(montant)}
                 </span>`)
              .join(' ');
          }
        },
        { key: 'statut',   label: 'Statut', type: 'badge', badgeMap: C().BADGE_FAC },
        { type: 'actions', width: '60px', actions: [
            { label: '🗑', className: 'btn btn-ghost btn-sm', title: 'Annuler', onClick: (row) => {
                showConfirm(`Annuler la facture ${row.ref || row.id} ? (statut → Annulé, non supprimée)`, () => {
                  Store.update('factures', row.id, { statut: 'Annulé' });
                  toast(`Facture ${row.ref} annulée.`, 'success');
                  C()._goList('invoices', toolbar, area);
                });
              }
            }
          ]
        }
      ],
      onRowClick: (item) => C()._goForm('invoices', item.id, toolbar, area),
      emptyMsg:   'Aucune facture.'
    });
  }

  /* ---- Formulaire facture ---- */
  function _renderInvoiceForm(toolbar, area) {
    const isNew = !C()._state.currentId;
    const doc   = isNew ? null : Store.getById('factures', C()._state.currentId);

    if (!isNew && !doc) {
      toast('Facture introuvable.', 'error');
      return C()._goList('invoices', toolbar, area);
    }

    C()._state.lignes    = doc ? doc.lignes.map(l => ({ ...l })) : [];
    C()._state.paiements = doc ? (doc.paiements || []).map(p => ({ ...p })) : [];

    const ref    = doc?.ref    || C()._genRef('FAC', 'factures');
    const statut = doc?.statut || 'Brouillon';
    const chips  = doc?.commandeId ? `<span class="chip">📦 ${C()._esc(doc.commandeId)}</span>` : '';

    /* Lien vers le devis d'origine si la facture est liée */
    const devisLie = doc?.devisId ? Store.getById('devis', doc.devisId) : null;
    const btnDevisLie = devisLie
      ? `<button class="btn btn-ghost btn-sm" id="btn-voir-devis"
          title="Ouvrir le devis ${devisLie.ref}" style="color:var(--accent-blue);">
          📄 ${C()._esc(devisLie.ref)} ↗</button>`
      : '';

    toolbar.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-back">← Retour</button>
      ${btnDevisLie}
      ${_invoiceActionBtns(statut, isNew)}`;

    document.getElementById('btn-voir-devis')
      ?.addEventListener('click', () => C()._goForm('quotes', devisLie.id, toolbar, area));

    document.getElementById('btn-back')
      ?.addEventListener('click', () => C()._goList('invoices', toolbar, area));

    const totaux    = C()._calcTotaux(C()._state.lignes);
    const totalPaye = C()._totalPaiements(C()._state.paiements);
    const reste     = Math.max(0, totaux.totalTTC - totalPaye);

    area.innerHTML = `
      ${C()._renderFormHeader(ref, statut, C().BADGE_FAC, chips)}
      ${isNew ? '' : C()._renderSuiviBDC(doc, 'facture')}

      <div class="form-section">
        <div class="form-section-title">Informations générales</div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label required">Client</label>
            <select class="form-control" id="i-client" required>
              <option value="">— Choisir un client —</option>
              <option value="__new__" style="color:var(--accent-blue);font-weight:600;">➕ Créer nouveau client</option>
              ${Store.getAll('contacts').map(c =>
                `<option value="${c.id}" ${doc?.contactId === c.id ? 'selected' : ''}>${C()._esc(c.nom)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label required">Date de facture</label>
            <input type="date" class="form-control" id="i-date"
              value="${doc?.date || new Date().toISOString().slice(0,10)}" />
          </div>
          <div class="form-group">
            <label class="form-label">Date d'échéance</label>
            <input type="date" class="form-control" id="i-echeance"
              value="${doc?.dateEcheance || ''}" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-control" id="i-notes" rows="2"
              placeholder="Mode de règlement, instructions…">${C()._esc(doc?.notes || '')}</textarea>
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

      <div class="form-section">
        <div class="form-section-title">Articles</div>
        ${C()._renderLineTable(C()._state.lignes)}
      </div>

      <div class="form-section" style="padding:0;">
        ${C()._renderTotalsBlock(C()._state.lignes)}
      </div>

      <!-- Section Paiements -->
      <div class="form-section" id="section-paiements">
        ${_renderPaiementsSection(doc?.id, reste)}
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;">
        <button class="btn btn-ghost" id="i-cancel">Annuler</button>
        <button class="btn btn-primary" id="i-save">✔ Sauvegarder</button>
      </div>`;

    C()._bindLineTableEvents();
    _bindInvoiceFormEvents(isNew, doc, ref, toolbar, area);
    _bindPaiementEvents(doc, toolbar, area);
  }

  function _invoiceActionBtns(statut, isNew) {
    if (isNew) return '';
    const btns = [];
    btns.push(`<button class="btn btn-ghost btn-sm" data-i-action="apercu" title="Aperçu + Dropbox">📄 Aperçu</button>`);
    if (statut === 'Brouillon') {
      btns.push(`<button class="btn btn-ghost btn-sm" data-i-action="envoyer">📤 Envoyer</button>`);
    }
    if (statut === 'En retard') {
      btns.push(`<span class="badge badge-red" style="align-self:center;">⏰ En retard</span>`);
    }
    return btns.join('');
  }

  function _previewFacture(facture) {
    const contact  = Store.getById('contacts', facture.contactId) || {};
    const paiements = (facture.paiements || []).filter(p => (p.montant || 0) > 0);
    const totalPaye = C()._totalPaiements(paiements);
    const reste     = Math.max(0, (facture.totalTTC || 0) - totalPaye);
    const estReglee = reste <= 0;
    const typeDoc   = estReglee ? 'Facture réglée' : 'Facture partielle';

    const lignesHtml = (facture.lignes || []).map(l => {
      const brut   = (l.qte || 0) * (l.prixUnitaire || 0);
      const remise = brut * ((l.remise || 0) / 100);
      const ht     = brut - remise;
      const taux   = (l.tauxTVA !== undefined ? l.tauxTVA : 16);
      const tva    = Math.round(ht * taux / 100);
      const ttc    = Math.round(ht + tva);
      return `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px;">${C()._esc(l.produit || l.description || '—')}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${l.qte || 0}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-family:monospace;">${C()._fmt(l.prixUnitaire || 0)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;">${l.remise ? l.remise + ' %' : '—'}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:600;font-family:monospace;">${C()._fmt(ttc)}</td>
      </tr>`;
    }).join('');

    const parMode = _buildLettrageParMode(paiements);
    const COLORS_PRINT = { 'Espèces': '#16a34a', 'Carte bancaire': '#2563eb', 'Virement': '#7c3aed', 'Chèque': '#d97706' };

    const lettrageHtml = Object.keys(parMode).length
      ? Object.entries(parMode).map(([mode, montant]) => {
          const pct   = facture.totalTTC > 0 ? Math.min(100, Math.round((montant / facture.totalTTC) * 100)) : 0;
          const color = COLORS_PRINT[mode] || '#6b7280';
          return `
            <div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #e5e7eb;">
              <div style="width:140px;font-size:12px;font-weight:600;color:#111827;">
                ${LETTRAGE_ICONS[mode] || '💰'} ${mode}
              </div>
              <div style="flex:1;background:#f3f4f6;border-radius:4px;height:7px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div>
              </div>
              <div style="width:110px;text-align:right;font-family:monospace;font-size:12px;font-weight:600;color:#111827;">
                ${C()._fmt(montant)}
              </div>
              <div style="width:32px;text-align:right;font-size:11px;color:#6b7280;">${pct}%</div>
            </div>`;
        }).join('') +
        `<div style="display:flex;justify-content:space-between;padding:8px 0 0;font-size:12px;color:#374151;
                     border-top:2px solid #d1fae5;margin-top:6px;">
           <span style="font-weight:700;">Total lettré</span>
           <span style="font-family:monospace;font-weight:700;">
             ${C()._fmt(totalPaye)} / ${C()._fmt(facture.totalTTC || 0)}
           </span>
         </div>`
      : '<div style="color:#9ca3af;font-size:12px;">Aucun paiement enregistré</div>';

    /* Détail chronologique des règlements */
    const paiHtml = paiements.length
      ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:10px;">
           <thead><tr style="background:#f9fafb;">
             <th style="padding:5px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Date</th>
             <th style="padding:5px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Type</th>
             <th style="padding:5px 8px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Méthode</th>
             <th style="padding:5px 8px;text-align:right;font-size:11px;color:#6b7280;font-weight:600;">Montant</th>
           </tr></thead>
           <tbody>
             ${paiements.map(p => `
               <tr style="border-bottom:1px solid #f3f4f6;">
                 <td style="padding:5px 8px;">${C()._fmtDate(p.date)}</td>
                 <td style="padding:5px 8px;">${p.type || 'Paiement'}</td>
                 <td style="padding:5px 8px;">${LETTRAGE_ICONS[p.methode] || '💰'} ${p.methode || '—'}</td>
                 <td style="padding:5px 8px;text-align:right;font-family:monospace;font-weight:600;">${C()._fmt(p.montant)}</td>
               </tr>`).join('')}
           </tbody>
         </table>`
      : '';

    const docHtml = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Facture ${C()._esc(facture.ref)}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f9fafb;color:#111827;}
        .page{max-width:760px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.1);}
        .ui-actions{display:flex;gap:10px;justify-content:flex-end;padding:0 0 16px;}
        .btn-print{padding:9px 20px;background:#4a5fff;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
        .btn-close{padding:9px 20px;background:#f3f4f6;color:#374151;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;}
        .brand-name{font-size:22px;font-weight:800;color:#111827;}
        .brand-sub{font-size:11px;color:#6b7280;margin-top:2px;}
        .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e5e7eb;}
        .doc-title{font-size:28px;font-weight:800;color:#4a5fff;}
        .doc-ref{font-size:15px;font-weight:600;color:#374151;margin:4px 0;}
        .doc-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;
          background:${estReglee?'#dcfce7':'#fef9c3'};color:${estReglee?'#15803d':'#854d0e'};}
        .doc-meta{display:flex;justify-content:space-between;margin-bottom:24px;}
        .section-title{font-size:11px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:1px;margin:20px 0 8px;}
        .client-name{font-size:16px;font-weight:700;color:#111827;}
        .client-box{background:#f9fafb;border-radius:8px;padding:12px 16px;margin-bottom:24px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;}
        th{background:#f3f4f6;padding:8px 10px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;color:#6b7280;}
        .totals-box{background:#f9fafb;border-radius:8px;padding:16px;margin-top:16px;}
        .total-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;color:#374151;}
        .total-final{font-size:16px;font-weight:800;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:8px;}
        .reste-box{margin-top:12px;padding:10px 16px;border-radius:8px;font-weight:700;font-size:14px;
          background:${estReglee?'#dcfce7':'#fff7ed'};color:${estReglee?'#15803d':'#c2410c'};}
        .paiements-box{background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:12px;}
        @media print{.ui-actions{display:none!important;}body{padding:0;}}.page{box-shadow:none;}
      </style></head><body><div class="page">
      <div class="ui-actions">
        <button class="btn-close" onclick="window.close()">✕ Fermer</button>
        <button class="btn-print" id="btn-fac-print">🖨 Imprimer / PDF</button>
      </div>
      <div class="header">
        <div><div class="brand-name">HCS — High Coffee Shirts</div>
          <div class="brand-sub">Tenue · Sublimation · DTF · Broderie · Impression textile</div></div>
        <div style="text-align:right;font-size:12px;color:#6b7280;">Tahiti, Polynésie française<br>contact@highcoffeeshirts.com</div>
      </div>
      <div class="doc-meta">
        <div><div class="doc-title">FACTURE</div>
          <div class="doc-ref">${C()._esc(facture.ref)}</div>
          <div class="doc-badge">${typeDoc}</div></div>
        <div style="text-align:right;font-size:13px;color:#374151;">
          <div>Date : <strong>${C()._fmtDate(facture.date)}</strong></div>
          ${facture.dateEcheance ? `<div>Échéance : <strong>${C()._fmtDate(facture.dateEcheance)}</strong></div>` : ''}
        </div>
      </div>
      <div class="section-title">Client</div>
      <div class="client-box">
        <div class="client-name">${C()._esc(facture.client || contact.nom || '—')}</div>
        ${contact.email ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">📧 ${C()._esc(contact.email)}</div>` : ''}
        ${contact.telephone ? `<div style="font-size:12px;color:#6b7280;">📞 ${C()._esc(contact.telephone)}</div>` : ''}
      </div>
      <div class="section-title">Articles</div>
      <table><thead><tr>
        <th>Article</th><th style="text-align:center;">Qté</th>
        <th style="text-align:right;">P.U.</th><th style="text-align:center;">Remise</th>
        <th style="text-align:right;">TTC</th>
      </tr></thead><tbody>${lignesHtml}</tbody></table>
      <div class="totals-box">
        <div class="total-row"><span>Total HT</span><span style="font-family:monospace;">${C()._fmt(facture.totalHT || 0)}</span></div>
        <div class="total-row"><span>TVA</span><span style="font-family:monospace;">${C()._fmt(facture.totalTVA || 0)}</span></div>
        <div class="total-row total-final"><span>Total TTC</span><span style="font-family:monospace;">${C()._fmt(facture.totalTTC || 0)}</span></div>
      </div>
      <div class="section-title">Lettrage des règlements</div>
      <div class="paiements-box">${lettrageHtml}</div>
      ${paiHtml ? `<div class="section-title" style="margin-top:14px;">Détail des règlements</div>
      <div>${paiHtml}</div>` : ''}
      <div class="reste-box">${estReglee ? '✅ Facture entièrement réglée' : `⚠️ Reste à payer : ${C()._fmt(reste)}`}</div>
      <div style="text-align:center;font-size:11px;color:#9ca3af;margin-top:24px;">
        Document généré le ${new Date().toLocaleDateString('fr-FR')} — HCS ERP
      </div>
    </div></body></html>`;

    const win = window.open('', '_blank', 'width=860,height=750,scrollbars=yes,toolbar=no,menubar=no');
    if (!win) { toast('Popup bloquée — autorise les popups pour ce site.', 'warning'); return; }
    win.document.write(docHtml);
    win.document.close();

    win.document.getElementById('btn-fac-print')?.addEventListener('click', async () => {
      const typeSlug  = estReglee ? 'reglee' : 'partielle';
      const filename  = `${C()._safeFilename(facture.client)}_facture_${typeSlug}_${C()._safeFilename(facture.ref)}.html`;
      const htmlContent = '<!DOCTYPE html>' + win.document.documentElement.outerHTML;
      await C()._sauverDocDropbox(facture.client, filename, htmlContent, typeDoc);
      win.print();
    });
  }

  /* ---- Section paiements ---- */
  function _renderPaiementsSection(invoiceId, reste) {
    const paiements  = C()._state.paiements;
    const totalPaye  = C()._totalPaiements(paiements);
    const resteAff   = reste !== undefined ? reste : 0;
    const resteColor = resteAff <= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    let html = `
      <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Paiements</span>
        <span style="font-family:var(--font-mono);font-size:13px;color:${resteColor};">
          Payé : ${C()._fmt(totalPaye)} · Reste : ${C()._fmt(resteAff)}
        </span>
      </div>`;

    /* Table des paiements existants */
    if (paiements.length > 0) {
      html += `
        <div class="table-wrapper" style="margin-bottom:16px;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Méthode</th>
                <th>Montant</th>
                <th style="width:40px;"></th>
              </tr>
            </thead>
            <tbody>
              ${paiements.map((p, i) => `
                <tr>
                  <td>${C()._fmtDate(p.date)}</td>
                  <td><span class="badge ${p.type === 'Acompte' ? 'badge-orange' : p.type === 'Solde' ? 'badge-green' : 'badge-blue'}">${C()._esc(p.type || 'Paiement')}</span></td>
                  <td><span class="badge badge-gray">${C()._esc(p.methode)}</span></td>
                  <td class="col-amount"><strong>${C()._fmt(p.montant)}</strong></td>
                  <td>
                    <button class="btn-remove-line" data-del-pay="${i}" title="Supprimer ce paiement">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    /* Bloc lettrage (visible quand il y a au moins un paiement) */
    if (paiements.length > 0) {
      const totaux = C()._calcTotaux(C()._state.lignes);
      html += _renderLettrageBlock(paiements, totaux.totalTTC);
    }

    /* Formulaire d'enregistrement de paiement — toujours visible */
    {
      /* Pour une nouvelle facture, les paiements seront sauvegardés avec la facture */
      const newInvoiceNote = !invoiceId
        ? `<p style="color:var(--accent-blue);font-size:11px;margin-bottom:10px;">
            ℹ️ Les paiements ajoutés ici seront sauvegardés avec la facture.</p>`
        : '';
      html += `
        <div style="background:var(--bg-elevated);border-radius:10px;padding:14px;margin-top:8px;">
          ${newInvoiceNote}
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);
            margin-bottom:10px;text-transform:uppercase;letter-spacing:0.06em;">
            Enregistrer un paiement
          </div>
          <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;">
            <div class="form-group" style="min-width:130px;">
              <label class="form-label">Type</label>
              <select class="form-control" id="pay-type">
                ${C().TYPES_PAIEMENT.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width:140px;">
              <label class="form-label">Date</label>
              <input type="date" class="form-control" id="pay-date"
                value="${new Date().toISOString().slice(0,10)}" />
            </div>
            <div class="form-group" style="min-width:160px;">
              <label class="form-label">Méthode</label>
              <select class="form-control" id="pay-methode">
                ${C().METHODES_PAIEMENT.map(m => `<option>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width:160px;">
              <label class="form-label">Montant (XPF)</label>
              <input type="number" class="form-control" id="pay-montant"
                value="${resteAff > 0 ? resteAff : ''}"
                placeholder="0" min="1" step="1" />
            </div>
            <button class="btn btn-success" id="btn-add-paiement" style="height:36px;">
              + Enregistrer
            </button>
          </div>
          ${resteAff > 0 ? `
            <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
              <button class="btn btn-ghost btn-sm" id="btn-pay-30pct">Acompte 30%</button>
              <button class="btn btn-ghost btn-sm" id="btn-pay-50pct">Acompte 50%</button>
              <button class="btn btn-ghost btn-sm" id="btn-pay-solde">Solde total</button>
            </div>` : ''}
        </div>`;
    }

    return html;
  }

  function _bindPaiementEvents(doc, toolbar, area) {
    /* Supprimer un paiement */
    document.querySelectorAll('[data-del-pay]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.delPay, 10);
        C()._state.paiements.splice(idx, 1);

        if (doc) {
          const delTotaux   = C()._calcTotaux(C()._state.lignes);
          const delPaye     = C()._totalPaiements(C()._state.paiements);
          let delStatut;
          if (delPaye >= delTotaux.totalTTC && delTotaux.totalTTC > 0) {
            delStatut = 'Payé';
          } else if (delPaye > 0) {
            delStatut = 'Payé partiel';
          } else {
            /* Aucun paiement restant : revenir au statut pré-paiement */
            delStatut = ['Payé', 'Payé partiel'].includes(doc.statut) ? 'Brouillon' : (doc.statut || 'Brouillon');
          }
          Store.update('factures', doc.id, {
            paiements: C()._state.paiements,
            statut:    delStatut,
            lettrage:  _computeLettrage(C()._state.paiements, delTotaux.totalTTC)
          });
        }

        _refreshPaiementsSection(doc, toolbar, area);
      });
    });

    /* Boutons acompte rapide */
    const totaux    = C()._calcTotaux(C()._state.lignes);
    const totalPaye = C()._totalPaiements(C()._state.paiements);
    const reste     = Math.max(0, totaux.totalTTC - totalPaye);
    const inputMontant = document.getElementById('pay-montant');
    document.getElementById('btn-pay-30pct')?.addEventListener('click', () => {
      if (inputMontant) { inputMontant.value = Math.round(totaux.totalTTC * 0.3); }
      document.getElementById('pay-type')?.value && (document.getElementById('pay-type').value = 'Acompte');
    });
    document.getElementById('btn-pay-50pct')?.addEventListener('click', () => {
      if (inputMontant) { inputMontant.value = Math.round(totaux.totalTTC * 0.5); }
      document.getElementById('pay-type')?.value && (document.getElementById('pay-type').value = 'Acompte');
    });
    document.getElementById('btn-pay-solde')?.addEventListener('click', () => {
      if (inputMontant) { inputMontant.value = reste; }
      document.getElementById('pay-type')?.value && (document.getElementById('pay-type').value = 'Solde');
    });

    /* Ajouter un paiement */
    document.getElementById('btn-add-paiement')?.addEventListener('click', () => {
      const montant = parseInt(document.getElementById('pay-montant')?.value || '0', 10);
      const date    = document.getElementById('pay-date')?.value;
      const methode = document.getElementById('pay-methode')?.value || 'Virement';
      const type    = document.getElementById('pay-type')?.value || 'Paiement';

      if (!montant || montant <= 0) { toast('Montant invalide.', 'error'); return; }
      if (!date) { toast('Date requise.', 'error'); return; }

      const paiement = { id: 'pay-' + Date.now(), date, methode, montant, type: type || 'Paiement' };
      C()._state.paiements.push(paiement);

      /* Mise à jour immédiate du document en base */
      if (doc) {
        const totalPaye = C()._totalPaiements(C()._state.paiements);
        const totaux    = C()._calcTotaux(C()._state.lignes);
        let newStatut   = doc.statut;

        if (totalPaye >= totaux.totalTTC) {
          newStatut = 'Payé';
        } else if (totalPaye > 0) {
          newStatut = 'Payé partiel';
        }

        const lettrageData = _computeLettrage(C()._state.paiements, totaux.totalTTC);
        Store.update('factures', doc.id, {
          paiements: C()._state.paiements,
          statut:    newStatut,
          lettrage:  lettrageData
        });

        /* Écritures comptables automatiques */
        _createPaiementEcritures(doc, paiement);

        /* Bridge Finance Dashboard — pousse le paiement dans hcs_transactions */
        _pushToFinanceDashboard(doc, paiement);

        if (newStatut === 'Payé') {
          toast('Facture intégralement réglée ! Écritures comptables générées. ✅', 'success', 4500);
        } else {
          toast(`Paiement de ${C()._fmt(montant)} enregistré.`, 'success');
        }
      }

      _refreshPaiementsSection(doc, toolbar, area);
    });
  }

  /** Rafraîchit uniquement la section paiements sans recharger tout le formulaire */
  function _refreshPaiementsSection(doc, toolbar, area) {
    const section = document.getElementById('section-paiements');
    if (!section) return;

    const totaux    = C()._calcTotaux(C()._state.lignes);
    const totalPaye = C()._totalPaiements(C()._state.paiements);
    const reste     = Math.max(0, totaux.totalTTC - totalPaye);

    section.innerHTML = _renderPaiementsSection(doc?.id, reste);
    _bindPaiementEvents(doc, toolbar, area);
  }

  /** Crée les 2 écritures comptables lors d'un paiement */
  function _createPaiementEcritures(facture, paiement) {
    const isEspeces  = paiement.methode === 'Espèces';
    const compte     = isEspeces ? '530000' : '512000'; // Caisse ou Banque
    const journal    = isEspeces ? 'Caisse' : 'Banque';

    /* Débit compte de trésorerie */
    Store.create('ecritures', {
      date:    paiement.date,
      libelle: `Paiement ${facture.ref} — ${paiement.methode}`,
      compte,
      debit:   paiement.montant,
      credit:  0,
      journal
    });

    /* Crédit compte client 411 */
    Store.create('ecritures', {
      date:    paiement.date,
      libelle: `Solde client — ${facture.ref}`,
      compte:  '411000',
      debit:   0,
      credit:  paiement.montant,
      journal
    });
  }

  /* ================================================================
     BRIDGE FINANCE DASHBOARD
     Enregistre automatiquement chaque paiement de facture dans
     hcs_transactions (tableau de bord financier HCS) et le syncronise
     vers MySQL finance_transactions.
     ================================================================ */
  function _pushToFinanceDashboard(facture, paiement) {
    try {
      /* Évite les doublons — chaque paiement a un _pay_id unique */
      const LS_KEY = 'hcs_transactions';
      const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      if (existing.some(t => t._pay_id === paiement.id)) return;

      /* Canal selon le mode de paiement */
      const CANAL_MAP = {
        'Espèces':        'cash',
        'Carte bancaire': 'cash',
        'Virement':       'odoo',
        'Chèque':         'odoo',
      };
      const canal = CANAL_MAP[paiement.methode] || 'odoo';

      /* Type de revenu : détection sur les lignes de la facture */
      const lignes = facture.lignes || [];
      const motsPrest = /dtf|vinyle|flex|flock|transfert|broderie|impression|serigraphie|gravure|sticker|covering/i;
      const typeRevenu = lignes.some(l =>
        motsPrest.test(l.produit || l.description || l.technique || '')
      ) ? 'prestation' : 'vente';

      /* Description lisible */
      const typePaiement = paiement.type || 'Paiement';   // Acompte | Solde | Paiement
      const desc = `${typePaiement} — ${facture.ref} — ${facture.client || ''}`.trim();

      const record = {
        id:          'erp-' + paiement.id,   // préfixe 'erp-' pour distinguer les saisies manuelles
        _pay_id:     paiement.id,             // clé de déduplication
        _source:     'erp',                   // marque l'origine ERP
        _facture_ref: facture.ref || '',
        date:        paiement.date,
        canal,
        type:        typeRevenu,
        description: desc,
        montant:     paiement.montant,
        nb:          1,
      };

      existing.push(record);
      localStorage.setItem(LS_KEY, JSON.stringify(existing));

      /* Sync MySQL en arrière-plan (même pattern que finance-dashboard) */
      const apiUrl = localStorage.getItem('hcs_api_url') || 'https://highcoffeeshirts.com/erp/api';
      const apiKey = localStorage.getItem('hcs_api_key') || 'hcs-erp-2026';
      const payload = Object.assign({}, record, { store_id: record.id });
      delete payload._pay_id;     // champs internes non stockés en MySQL
      delete payload._source;
      delete payload._facture_ref;
      fetch(`${apiUrl}/finance_transactions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body:    JSON.stringify(payload),
      }).then(async r => {
        if (r.ok) {
          const j = await r.json();
          if (j.id) {
            const all = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
            const idx = all.findIndex(t => t.id === record.id);
            if (idx >= 0) { all[idx]._mysql_id = j.id; localStorage.setItem(LS_KEY, JSON.stringify(all)); }
          }
        }
      }).catch(() => { /* hors-ligne : pas bloquant, données dans localStorage */ });

    } catch (e) {
      console.warn('[FinanceBridge] Erreur push transaction :', e);
    }
  }

  function _bindInvoiceFormEvents(isNew, doc, ref, toolbar, area) {
    /* Création rapide client depuis la liste déroulante */
    C()._bindClientSelectCreation('i-client');

    /* Mockup projet */
    C()._bindMockupEvents(doc, area);

    document.getElementById('i-save')?.addEventListener('click', () => {
      const contactId = document.getElementById('i-client')?.value;
      if (!contactId || contactId === '__new__') { toast('Veuillez sélectionner un client.', 'error'); return; }
      if (C()._state.lignes.length === 0) { toast('Ajoutez au moins un article.', 'error'); return; }

      const saveTotaux  = C()._calcTotaux(C()._state.lignes);
      const savePaye    = C()._totalPaiements(C()._state.paiements);
      const saveStatut  = savePaye >= saveTotaux.totalTTC && saveTotaux.totalTTC > 0
        ? 'Payé'
        : savePaye > 0
          ? 'Payé partiel'
          : (doc?.statut || 'Brouillon');

      const record = {
        ref,
        _type:        'Facture',
        contactId,
        client:       C()._contactNom(contactId),
        date:         document.getElementById('i-date')?.value      || '',
        dateEcheance: document.getElementById('i-echeance')?.value  || '',
        notes:        document.getElementById('i-notes')?.value     || '',
        mockupUrls:   C()._mockupUrls,
        statut:       saveStatut,
        commandeId:   doc?.commandeId || null,
        lignes:       C()._state.lignes,
        paiements:    C()._state.paiements,
        ...saveTotaux,
        lettrage:     _computeLettrage(C()._state.paiements, saveTotaux.totalTTC)
      };

      if (isNew) {
        Store.create('factures', record);
        toast('Facture créée et paiements enregistrés. ✓', 'success', 3500);
        C()._goList('invoices', toolbar, area);
      } else {
        Store.update('factures', doc.id, record);
        toast('Facture sauvegardée.', 'success');
        C()._goList('invoices', toolbar, area);
      }
    });

    document.getElementById('i-cancel')
      ?.addEventListener('click', () => C()._goList('invoices', toolbar, area));

    toolbar.querySelectorAll('[data-i-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.iAction === 'apercu') {
          _previewFacture(doc);
          return;
        }
        if (btn.dataset.iAction === 'envoyer') {
          showConfirm('Marquer cette facture comme envoyée ?', () => {
            Store.update('factures', doc.id, { statut: 'Envoyé' });
            toast('Facture marquée comme envoyée.', 'success');
            C()._goList('invoices', toolbar, area);
          });
        }
      });
    });
  }

  /* ================================================================
     EXPORTS
     ================================================================ */
  return {
    _renderList: _renderInvoicesList,
    _renderForm: _renderInvoiceForm,
  };
})();
