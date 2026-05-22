'use strict';
/* ================================================================
   SALES-REPORT.JS — Module Rapport de Ventes
   Extrait de sales.js · Dépend de window._SalesCore (sales.js)
   Exporte : window.SalesReport._renderReport
   ================================================================ */
window.SalesReport = (() => {
  /* Référence paresseuse vers le bridge partagé de sales.js */
  const C = () => window._SalesCore;

  /* ================================================================
     VUE RAPPORT DE VENTES (SALES-REPORT)
     ================================================================ */

  function _renderSalesReport(toolbar, area) {
    toolbar.innerHTML = '';

    const db       = Store.getDB();
    const factures = db.factures  || [];
    const commandes= db.commandes || [];
    const devis    = db.devis     || [];
    const now      = new Date();
    const moisPfx  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    /* ---- KPIs ---- */
    const facMois  = factures.filter(f => (f.date || '').startsWith(moisPfx));
    const caMois   = facMois.reduce((s, f) => s + (f.totalTTC || 0), 0);
    const nbVentes = facMois.length;
    const ticket   = nbVentes > 0 ? Math.round(caMois / nbVentes) : 0;
    const devisAtt = devis.filter(d => d.statut === 'Envoyé').length;

    /* ---- CA par semaine (4 dernières) ---- */
    const semaines = _caBySemaine(factures, 4);

    /* ---- Top 5 produits commandés ---- */
    const top5 = _top5Produits(commandes);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Rapport de ventes</div>
        <div class="page-subtitle">${C()._fmtDate(now.toISOString())}</div>
      </div>

      <!-- KPIs : 4 statCards -->
      <div class="dash-grid" style="margin-bottom:24px;">
        <div id="kpi-ca"></div>
        <div id="kpi-ventes"></div>
        <div id="kpi-ticket"></div>
        <div id="kpi-devis-att"></div>
      </div>

      <!-- Graphiques côte à côte -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div class="card">
          <div class="card-header"><div class="card-title">CA par semaine</div></div>
          <div id="chart-weekly" style="padding:8px 0 4px;"></div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">Top 5 produits</div></div>
          <div id="chart-top5" style="padding:8px 0 4px;"></div>
        </div>
      </div>

      <!-- Dernières 10 factures -->
      <div class="card">
        <div class="card-header"><div class="card-title">Dernières factures</div></div>
        <div id="report-last-invoices"></div>
      </div>`;

    /* Rendre les KPIs via chart.js */
    statCard('kpi-ca',       { icon: '💰', value: caMois,   label: 'CA du mois',        color: 'var(--accent-green)',  format: true });
    statCard('kpi-ventes',   { icon: '🧾', value: nbVentes, label: 'Factures ce mois',  color: 'var(--accent-blue)'  });
    statCard('kpi-ticket',   { icon: '📊', value: ticket,   label: 'Ticket moyen',      color: 'var(--accent-violet)', format: true });
    statCard('kpi-devis-att',{ icon: '📄', value: devisAtt, label: 'Devis en attente',  color: 'var(--accent-orange)' });

    /* Graphique CA par semaine */
    barChart('chart-weekly', {
      labels:    semaines.map(s => s.label),
      values:    semaines.map(s => s.ca),
      colors:    semaines.map((_, i) => i === semaines.length - 1 ? '#00d4aa' : '#4a5fff'),
      height:    32,
      formatter: (v) => C()._fmt(v)
    });

    /* Graphique Top 5 produits */
    barChart('chart-top5', {
      labels:    top5.map(p => p.nom),
      values:    top5.map(p => p.qte),
      colors:    ['#b07bff', '#00d4aa', '#ffc857', '#ff6b6b', '#4a5fff'],
      height:    28,
      title:     '',
      formatter: (v) => `${v} unité${v > 1 ? 's' : ''}`
    });

    /* Table des 10 dernières factures */
    renderTable('report-last-invoices', {
      searchable: false,
      sortable:   false,
      data: [...factures]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10),
      columns: [
        { key: 'ref',      label: 'Référence',   render: (v) => `<span class="col-ref">${C()._esc(v)}</span>` },
        { key: 'date',     label: 'Date',         type: 'date' },
        { key: 'client',   label: 'Client',       type: 'text' },
        { key: 'totalTTC', label: 'Total TTC',    render: (v) => `<span class="mono">${C()._fmt(v)}</span>` },
        { key: 'statut',   label: 'Statut',       type: 'badge', badgeMap: C().BADGE_FAC }
      ],
      onRowClick: (item) => C()._goForm('invoices', item.id, toolbar, area)
    });
  }

  /** Calcule le CA par semaine sur les n dernières semaines */
  function _caBySemaine(factures, n) {
    const result = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = n - 1; i >= 0; i--) {
      /* Lundi de la semaine */
      const debut = new Date(now);
      debut.setDate(debut.getDate() - (i * 7) - ((debut.getDay() + 6) % 7));
      const fin = new Date(debut);
      fin.setDate(debut.getDate() + 6);
      fin.setHours(23, 59, 59, 999);

      const ca = factures
        .filter(f => { const d = new Date(f.date); return d >= debut && d <= fin; })
        .reduce((s, f) => s + (f.totalTTC || 0), 0);

      result.push({
        label: `S${n - i} (${debut.getDate()}/${debut.getMonth() + 1})`,
        ca
      });
    }
    return result;
  }

  /** Calcule le top 5 des produits par quantité commandée */
  function _top5Produits(commandes) {
    const compteur = {};
    const nomMap   = {};
    Store.getAll('produits').forEach(p => { nomMap[p.id] = p.nom; });

    commandes.forEach(cmd => {
      (cmd.lignes || []).forEach(l => {
        if (!l.produitId) return;
        compteur[l.produitId] = (compteur[l.produitId] || 0) + (l.qte || 0);
      });
    });

    return Object.entries(compteur)
      .map(([id, qte]) => ({ id, qte, nom: nomMap[id] || id }))
      .sort((a, b) => b.qte - a.qte)
      .slice(0, 5);
  }

  /* ================================================================
     EXPORTS
     ================================================================ */
  return {
    _renderReport: _renderSalesReport,
  };
})();
