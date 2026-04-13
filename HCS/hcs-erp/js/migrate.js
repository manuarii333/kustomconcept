/* ================================================================
   HCS ERP — migrate.js
   Module de migration : localStorage (Store) → PocketBase
   Expose window.Migrate avec init(toolbarEl, containerEl, view)
   ================================================================ */

'use strict';

const Migrate = (() => {

  /* ----------------------------------------------------------------
     Collections à migrer, dans l'ordre (dépendances d'abord)
     ---------------------------------------------------------------- */
  const COLLECTIONS = [
    { id: 'produits',           label: 'Produits',              icon: '📦' },
    { id: 'contacts',           label: 'Contacts',              icon: '👤' },
    { id: 'clients',            label: 'Clients',               icon: '🏢' },
    { id: 'fournisseurs',       label: 'Fournisseurs',          icon: '🏭' },
    { id: 'opportunites',       label: 'Opportunités',          icon: '🎯' },
    { id: 'devis',              label: 'Devis',                 icon: '📄' },
    { id: 'commandes',          label: 'Commandes',             icon: '📋' },
    { id: 'factures',           label: 'Factures',              icon: '🧾' },
    { id: 'facturesPartielles', label: 'Factures Partielles',   icon: '🧾' },
    { id: 'paiements',          label: 'Paiements',             icon: '💳' },
    { id: 'bonsAchat',          label: 'Bons d\'achat',        icon: '🛒' },
    { id: 'ordresFab',          label: 'Ordres de fabrication', icon: '⚙️' },
    { id: 'ecritures',          label: 'Écritures comptables',  icon: '💰' },
    { id: 'depenses',           label: 'Dépenses',              icon: '💸' },
    { id: 'messages',           label: 'Messages',              icon: '💬' },
    { id: 'utilisateurs',       label: 'Utilisateurs',          icon: '👥' }
  ];

  /* ----------------------------------------------------------------
     État interne
     ---------------------------------------------------------------- */
  let _isRunning  = false;
  let _results    = {};   // { collectionId: { ok, skipped, errors, total } }
  let _pbOnline   = null; // null = non testé, true/false après ping

  /* ----------------------------------------------------------------
     init(toolbarEl, containerEl, view)
     Point d'entrée appelé par app.js
     ---------------------------------------------------------------- */
  function init(toolbarEl, containerEl) {
    if (toolbarEl) toolbarEl.innerHTML = '';
    _render(containerEl);
  }

  /* ----------------------------------------------------------------
     _render(container)
     Affiche l'interface complète de migration
     ---------------------------------------------------------------- */
  function _render(container) {
    container.innerHTML = `
      <div id="migrate-root" style="
        max-width:900px;margin:0 auto;padding:24px 16px;
        font-family:var(--font-main,'Inter',sans-serif);
      ">
        <!-- En-tête -->
        <div style="
          background:linear-gradient(135deg,#1a0e07 0%,#2d1a0e 100%);
          border-radius:16px;padding:28px 32px;margin-bottom:24px;
          border:1px solid #c4813a33;
        ">
          <h1 style="color:#f5ede0;font-size:1.5rem;font-weight:700;margin:0 0 8px;">
            🗄️ Migration Base de Données
          </h1>
          <p style="color:#c4813a;font-size:0.9rem;margin:0;">
            Transférez toutes les données du stockage local (localStorage)
            vers PocketBase pour une synchronisation multi-appareil.
          </p>
        </div>

        <!-- Statut connexion PocketBase -->
        <div id="pb-status-card" style="
          background:var(--bg-card,#fff);border:2px solid var(--border,#e5e7eb);
          border-radius:12px;padding:20px 24px;margin-bottom:20px;
          display:flex;align-items:center;gap:16px;flex-wrap:wrap;
        ">
          <div id="pb-status-dot" style="
            width:14px;height:14px;border-radius:50%;
            background:#9ca3af;flex-shrink:0;
            box-shadow:0 0 0 3px #9ca3af33;
          "></div>
          <div style="flex:1;min-width:200px;">
            <div style="font-weight:600;font-size:0.95rem;" id="pb-status-text">
              PocketBase non testé
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted,#6b7280);margin-top:2px;" id="pb-status-sub">
              http://127.0.0.1:8090
            </div>
          </div>
          <button id="btn-test-conn" onclick="Migrate._testConnection()"
            style="
              background:#c4813a;color:#fff;border:none;border-radius:8px;
              padding:10px 20px;font-weight:600;cursor:pointer;font-size:0.9rem;
              transition:background 0.2s;
            "
            onmouseover="this.style.background='#a66a2e'"
            onmouseout="this.style.background='#c4813a'">
            🔌 Tester la connexion
          </button>
        </div>

        <!-- Sélection des collections -->
        <div style="
          background:var(--bg-card,#fff);border:1px solid var(--border,#e5e7eb);
          border-radius:12px;padding:20px 24px;margin-bottom:20px;
        ">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h2 style="font-size:1rem;font-weight:700;margin:0;">
              Collections à migrer
            </h2>
            <div style="display:flex;gap:8px;">
              <button onclick="Migrate._selectAll(true)" style="
                background:none;border:1px solid var(--border,#e5e7eb);
                border-radius:6px;padding:4px 10px;font-size:0.8rem;cursor:pointer;
                color:var(--text,#374151);
              ">Tout sélectionner</button>
              <button onclick="Migrate._selectAll(false)" style="
                background:none;border:1px solid var(--border,#e5e7eb);
                border-radius:6px;padding:4px 10px;font-size:0.8rem;cursor:pointer;
                color:var(--text,#374151);
              ">Tout désélectionner</button>
            </div>
          </div>
          <div id="collections-grid" style="
            display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;
          ">
            ${COLLECTIONS.map(col => {
              const count = (Store.getAll(col.id) || []).length;
              return `
                <label id="col-label-${col.id}" style="
                  display:flex;align-items:center;gap:10px;padding:10px 12px;
                  border:1px solid var(--border,#e5e7eb);border-radius:8px;cursor:pointer;
                  transition:border-color 0.15s;user-select:none;
                " onmouseover="this.style.borderColor='#c4813a'"
                  onmouseout="if(!this.querySelector('input').checked)this.style.borderColor='var(--border,#e5e7eb)'">
                  <input type="checkbox" id="chk-${col.id}" value="${col.id}"
                    ${count > 0 ? 'checked' : ''}
                    onchange="Migrate._onCheckChange('${col.id}',this)"
                    style="width:16px;height:16px;accent-color:#c4813a;cursor:pointer;">
                  <span style="font-size:1.1rem;">${col.icon}</span>
                  <span style="flex:1;font-size:0.875rem;font-weight:500;">
                    ${col.label}
                  </span>
                  <span id="col-count-${col.id}" style="
                    font-size:0.75rem;font-weight:600;
                    color:${count > 0 ? '#c4813a' : '#9ca3af'};
                    background:${count > 0 ? '#c4813a1a' : '#f3f4f6'};
                    padding:2px 6px;border-radius:10px;
                  ">${count}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Options de migration -->
        <div style="
          background:var(--bg-card,#fff);border:1px solid var(--border,#e5e7eb);
          border-radius:12px;padding:20px 24px;margin-bottom:20px;
        ">
          <h2 style="font-size:1rem;font-weight:700;margin:0 0 14px;">Options</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="opt-strip-id" checked
                style="width:16px;height:16px;accent-color:#c4813a;cursor:pointer;">
              <div>
                <div style="font-size:0.875rem;font-weight:500;">
                  Laisser PocketBase générer les IDs
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);margin-top:2px;">
                  Les IDs locaux (ex: prod-001) ne sont pas compatibles avec PocketBase.
                  Recommandé.
                </div>
              </div>
            </label>
            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
              <input type="checkbox" id="opt-skip-empty" checked
                style="width:16px;height:16px;accent-color:#c4813a;cursor:pointer;">
              <div>
                <div style="font-size:0.875rem;font-weight:500;">
                  Ignorer les collections vides
                </div>
                <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);margin-top:2px;">
                  Ne pas envoyer de requêtes pour les collections sans enregistrements.
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Bouton de migration -->
        <button id="btn-migrate" onclick="Migrate._startMigration()"
          disabled
          style="
            width:100%;background:#c4813a;color:#fff;border:none;border-radius:12px;
            padding:16px;font-size:1rem;font-weight:700;cursor:not-allowed;
            opacity:0.5;transition:all 0.2s;margin-bottom:20px;
            display:flex;align-items:center;justify-content:center;gap:8px;
          ">
          🚀 Migrer localStorage → PocketBase
        </button>

        <!-- Zone de progression (cachée au départ) -->
        <div id="migrate-progress" style="display:none;">
          <div style="
            background:var(--bg-card,#fff);border:1px solid var(--border,#e5e7eb);
            border-radius:12px;padding:20px 24px;margin-bottom:20px;
          ">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
              <h2 style="font-size:1rem;font-weight:700;margin:0;">Progression</h2>
              <span id="migrate-percent" style="font-size:0.875rem;font-weight:600;color:#c4813a;">0%</span>
            </div>
            <!-- Barre de progression -->
            <div style="
              height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-bottom:16px;
            ">
              <div id="migrate-bar" style="
                height:100%;width:0%;background:linear-gradient(90deg,#c4813a,#e8a25e);
                border-radius:4px;transition:width 0.3s ease;
              "></div>
            </div>
            <div id="migrate-current" style="font-size:0.875rem;color:var(--text-muted,#6b7280);">
              En attente...
            </div>
          </div>
        </div>

        <!-- Rapport final (caché au départ) -->
        <div id="migrate-report" style="display:none;">
          <div style="
            background:var(--bg-card,#fff);border:1px solid var(--border,#e5e7eb);
            border-radius:12px;padding:20px 24px;
          ">
            <h2 style="font-size:1rem;font-weight:700;margin:0 0 16px;">
              📊 Rapport de migration
            </h2>
            <div id="migrate-summary" style="
              background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:16px;
              font-size:0.9rem;
            "></div>
            <div id="migrate-details" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
        </div>
      </div>
    `;

    /* Appliquer l'état visuel des checkboxes au chargement */
    COLLECTIONS.forEach(col => {
      const chk = document.getElementById(`chk-${col.id}`);
      const lbl = document.getElementById(`col-label-${col.id}`);
      if (chk && chk.checked && lbl) {
        lbl.style.borderColor = '#c4813a';
      }
    });
  }

  /* ----------------------------------------------------------------
     _testConnection()
     Ping PocketBase et met à jour le statut visuel
     ---------------------------------------------------------------- */
  async function _testConnection() {
    const dot  = document.getElementById('pb-status-dot');
    const text = document.getElementById('pb-status-text');
    const sub  = document.getElementById('pb-status-sub');
    const btn  = document.getElementById('btn-test-conn');
    if (!dot || !text) return;

    /* État : test en cours */
    btn.textContent = '⏳ Test en cours...';
    btn.disabled = true;
    dot.style.background = '#f59e0b';
    dot.style.boxShadow  = '0 0 0 3px #f59e0b33';
    text.textContent = 'Connexion en cours...';

    try {
      if (typeof PB === 'undefined') {
        throw new Error('PocketBaseAPI non chargé (vérifiez js/pocketbase.js)');
      }
      const result = await PB.ping();
      if (result.ok) {
        _pbOnline = true;
        dot.style.background = '#10b981';
        dot.style.boxShadow  = '0 0 0 3px #10b98133';
        text.textContent = '✅ PocketBase connecté';
        sub.textContent  = `Version ${result.version} — http://127.0.0.1:8090`;
        /* Activer le bouton de migration */
        const btnMigrate = document.getElementById('btn-migrate');
        if (btnMigrate) {
          btnMigrate.disabled = false;
          btnMigrate.style.opacity = '1';
          btnMigrate.style.cursor  = 'pointer';
        }
        if (typeof Toast !== 'undefined') {
          Toast.success('PocketBase accessible — migration disponible');
        }
      } else {
        throw new Error(result.message || 'Connexion échouée');
      }
    } catch (err) {
      _pbOnline = false;
      dot.style.background = '#ef4444';
      dot.style.boxShadow  = '0 0 0 3px #ef444433';
      text.textContent = '❌ PocketBase inaccessible';
      sub.textContent  = err.message || 'http://127.0.0.1:8090 — vérifiez que PocketBase tourne';
      if (typeof Toast !== 'undefined') {
        Toast.error('Impossible de joindre PocketBase : ' + err.message);
      }
    } finally {
      btn.textContent = '🔌 Tester la connexion';
      btn.disabled = false;
    }
  }

  /* ----------------------------------------------------------------
     _selectAll(checked)
     Coche/décoche toutes les collections
     ---------------------------------------------------------------- */
  function _selectAll(checked) {
    COLLECTIONS.forEach(col => {
      const chk = document.getElementById(`chk-${col.id}`);
      const lbl = document.getElementById(`col-label-${col.id}`);
      if (chk) {
        chk.checked = checked;
        if (lbl) {
          lbl.style.borderColor = checked ? '#c4813a' : 'var(--border,#e5e7eb)';
        }
      }
    });
  }

  /* ----------------------------------------------------------------
     _onCheckChange(colId, checkbox)
     Met à jour le style de la carte selon l'état de la case
     ---------------------------------------------------------------- */
  function _onCheckChange(colId, checkbox) {
    const lbl = document.getElementById(`col-label-${colId}`);
    if (lbl) {
      lbl.style.borderColor = checkbox.checked ? '#c4813a' : 'var(--border,#e5e7eb)';
    }
  }

  /* ----------------------------------------------------------------
     _startMigration()
     Lance la migration des collections sélectionnées
     ---------------------------------------------------------------- */
  async function _startMigration() {
    if (_isRunning) return;
    if (!_pbOnline) {
      if (typeof Toast !== 'undefined') Toast.error('Testez d\'abord la connexion PocketBase');
      return;
    }

    /* Collecter les collections sélectionnées */
    const skipEmpty = document.getElementById('opt-skip-empty')?.checked !== false;
    const stripId   = document.getElementById('opt-strip-id')?.checked !== false;

    const selected = COLLECTIONS.filter(col => {
      const chk = document.getElementById(`chk-${col.id}`);
      return chk && chk.checked;
    });

    if (selected.length === 0) {
      if (typeof Toast !== 'undefined') Toast.error('Sélectionnez au moins une collection');
      return;
    }

    /* Désactiver les boutons pendant la migration */
    _isRunning = true;
    const btnMigrate = document.getElementById('btn-migrate');
    const btnTest    = document.getElementById('btn-test-conn');
    if (btnMigrate) { btnMigrate.disabled = true; btnMigrate.textContent = '⏳ Migration en cours...'; }
    if (btnTest)    { btnTest.disabled = true; }

    /* Afficher la zone de progression */
    const progressZone = document.getElementById('migrate-progress');
    const reportZone   = document.getElementById('migrate-report');
    if (progressZone) progressZone.style.display = 'block';
    if (reportZone)   reportZone.style.display   = 'none';

    _results = {};
    let totalDone = 0;
    const totalCols = selected.length;

    for (let i = 0; i < selected.length; i++) {
      const col = selected[i];
      _updateProgress(i, totalCols, `Migration de ${col.label}...`);

      const records = Store.getAll(col.id) || [];

      if (skipEmpty && records.length === 0) {
        _results[col.id] = { ok: 0, skipped: 0, errors: 0, total: 0, skippedEmpty: true };
        totalDone++;
        continue;
      }

      const res = { ok: 0, skipped: 0, errors: 0, total: records.length, skippedEmpty: false };

      for (let j = 0; j < records.length; j++) {
        /* Mise à jour progression fine */
        const globalPct = ((i + j / Math.max(records.length, 1)) / totalCols) * 100;
        _updateProgress(null, null, `${col.icon} ${col.label} — enregistrement ${j + 1}/${records.length}`, globalPct);

        try {
          /* Préparer le payload : copie sans les champs incompatibles */
          const payload = Object.assign({}, records[j]);
          if (stripId) {
            delete payload.id;       // PocketBase génère son propre ID
          }
          delete payload._createdAt; // PocketBase gère created/updated
          delete payload._updatedAt;

          await PB.create(col.id, payload);
          res.ok++;
        } catch (err) {
          res.errors++;
          console.warn(`[Migrate] Erreur ${col.id} #${j}:`, err.message || err);
        }
      }

      _results[col.id] = res;
      totalDone++;
    }

    /* Migration terminée */
    _updateProgress(totalCols, totalCols, 'Migration terminée !', 100);
    _isRunning = false;

    if (btnMigrate) {
      btnMigrate.disabled = false;
      btnMigrate.textContent = '🔄 Re-migrer localStorage → PocketBase';
      btnMigrate.style.opacity = '1';
      btnMigrate.style.cursor  = 'pointer';
    }
    if (btnTest) btnTest.disabled = false;

    _renderReport(selected, stripId);

    if (typeof Toast !== 'undefined') {
      const totalOk = Object.values(_results).reduce((s, r) => s + r.ok, 0);
      Toast.success(`Migration terminée — ${totalOk} enregistrement(s) transférés`);
    }
  }

  /* ----------------------------------------------------------------
     _updateProgress(done, total, message, pct)
     Met à jour la barre de progression
     ---------------------------------------------------------------- */
  function _updateProgress(done, total, message, pct) {
    const bar     = document.getElementById('migrate-bar');
    const percent = document.getElementById('migrate-percent');
    const current = document.getElementById('migrate-current');

    let p = pct;
    if (p === undefined && total > 0) {
      p = (done / total) * 100;
    }
    p = Math.min(100, Math.max(0, p || 0));

    if (bar)     bar.style.width   = p + '%';
    if (percent) percent.textContent = Math.round(p) + '%';
    if (current) current.textContent = message || '';
  }

  /* ----------------------------------------------------------------
     _renderReport(selected)
     Affiche le rapport final après migration
     ---------------------------------------------------------------- */
  function _renderReport(selected) {
    const reportZone = document.getElementById('migrate-report');
    const summary    = document.getElementById('migrate-summary');
    const details    = document.getElementById('migrate-details');
    if (!reportZone || !summary || !details) return;

    let totalOk = 0, totalErrors = 0, totalSkipped = 0;
    selected.forEach(col => {
      const r = _results[col.id] || {};
      totalOk      += r.ok      || 0;
      totalErrors  += r.errors  || 0;
      totalSkipped += (r.skippedEmpty ? 1 : 0);
    });

    const hasErrors = totalErrors > 0;

    summary.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:16px;">
        <div style="flex:1;min-width:120px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:#10b981;">${totalOk}</div>
          <div style="font-size:0.8rem;color:#6b7280;">Enregistrements migrés</div>
        </div>
        <div style="flex:1;min-width:120px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:${hasErrors ? '#ef4444' : '#10b981'};">${totalErrors}</div>
          <div style="font-size:0.8rem;color:#6b7280;">Erreurs</div>
        </div>
        <div style="flex:1;min-width:120px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:#9ca3af;">${totalSkipped}</div>
          <div style="font-size:0.8rem;color:#6b7280;">Collections vides ignorées</div>
        </div>
        <div style="flex:1;min-width:120px;text-align:center;">
          <div style="font-size:1.8rem;font-weight:700;color:#c4813a;">${selected.length}</div>
          <div style="font-size:0.8rem;color:#6b7280;">Collections traitées</div>
        </div>
      </div>
    `;

    details.innerHTML = selected.map(col => {
      const r = _results[col.id] || { ok: 0, skipped: 0, errors: 0, total: 0, skippedEmpty: false };
      let statusIcon, statusColor, statusMsg;

      if (r.skippedEmpty) {
        statusIcon  = '⬜';
        statusColor = '#9ca3af';
        statusMsg   = 'Collection vide — ignorée';
      } else if (r.errors > 0 && r.ok === 0) {
        statusIcon  = '❌';
        statusColor = '#ef4444';
        statusMsg   = `${r.errors} erreur(s) sur ${r.total} enregistrement(s)`;
      } else if (r.errors > 0) {
        statusIcon  = '⚠️';
        statusColor = '#f59e0b';
        statusMsg   = `${r.ok} migré(s), ${r.errors} erreur(s)`;
      } else {
        statusIcon  = '✅';
        statusColor = '#10b981';
        statusMsg   = `${r.ok} enregistrement(s) migré(s)`;
      }

      return `
        <div style="
          display:flex;align-items:center;gap:12px;
          padding:12px 14px;border-radius:8px;
          background:${statusColor}11;border:1px solid ${statusColor}33;
        ">
          <span style="font-size:1.1rem;">${statusIcon}</span>
          <span style="font-size:1.1rem;">${col.icon}</span>
          <span style="flex:1;font-weight:600;font-size:0.875rem;">${col.label}</span>
          <span style="font-size:0.8rem;color:${statusColor};font-weight:500;">${statusMsg}</span>
        </div>
      `;
    }).join('');

    reportZone.style.display = 'block';

    /* Scroll vers le rapport */
    setTimeout(() => reportZone.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  /* ----------------------------------------------------------------
     API publique
     ---------------------------------------------------------------- */
  return {
    init,
    _testConnection,
    _selectAll,
    _onCheckChange,
    _startMigration
  };

})();

window.Migrate = Migrate;
