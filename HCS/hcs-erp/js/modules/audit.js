/* ================================================================
   HCS ERP — audit.js
   Agent de vérification automatique de l'ERP HCS.
   Lance un audit complet et produit un rapport scoré en temps réel.
   ================================================================ */

'use strict';

const Audit = (() => {

  /* ----------------------------------------------------------------
     MANIFESTE DE VÉRIFICATION
     Toutes les ressources attendues dans l'ERP
     ---------------------------------------------------------------- */
  const MANIFEST = {

    scripts: [
      'data/seed.js',
      'js/store.js',
      'js/utils.js',
      'js/components/toast.js',
      'js/components/modal.js',
      'js/components/form.js',
      'js/components/table.js',
      'js/components/kanban.js',
      'js/components/chart.js',
      'js/components/commandPalette.js',
      'js/modules/crm.js',
      'js/modules/sales.js',
      'js/modules/purchases.js',
      'js/modules/inventory.js',
      'js/modules/manufacturing.js',
      'js/modules/accounting.js',
      'js/modules/discuss.js',
      'js/modules/users.js',
      'js/modules/advisor.js',
      'js/modules/rh.js',
      'js/modules/agents.js',
      'js/modules/audit.js',
      'js/auth.js',
      'js/app.js'
    ],

    css: [
      'css/variables.css',
      'css/layout.css',
      'css/components.css',
      'css/forms.css',
      'css/kanban.css',
      'css/chat.css',
      'css/responsive.css',
      'css/accounting.css',
      'css/agents.css'
    ],

    apps: [
      'apps/andromeda-campaign.html',
      'apps/andromeda-verticals-spec.html',
      'apps/calculateur-vinyl-hcs.html',
      'apps/dtf-calculator-hcs-v2.html',
      'apps/dtf-plaques-transfert.html',
      'apps/dtf-studio.html',
      'apps/hcs-builder-v2-fixed.html',
      'apps/hcs-cockpit.html',
      'apps/hcs-dashboard.html',
      'apps/hcs-hub-diagnostic.html',
      'apps/hcs-hub.html',
      'apps/hcs-pass-test.html',
      'apps/hcs_catalogue_complet_v2.html',
      'apps/hcs_catalogue_offres.html',
      'apps/kustomkoncept.html',
      'apps/mockup-forge-v12.html',
      'apps/picwish-pipeline.html',
      'apps/scenario-a-demo.html',
      'apps/scenario-b-demo.html',
      'apps/tshirt-mockup-studio.html'
    ],

    modules: [
      { nom: 'CRM',           global: 'CRM'           },
      { nom: 'Sales',         global: 'Sales'         },
      { nom: 'Purchases',     global: 'Purchases'     },
      { nom: 'Inventory',     global: 'Inventory'     },
      { nom: 'Manufacturing', global: 'Manufacturing' },
      { nom: 'Accounting',    global: 'Accounting'    },
      { nom: 'Discuss',       global: 'Discuss'       },
      { nom: 'Users',         global: 'Users'         },
      { nom: 'Advisor',       global: 'Advisor'       },
      { nom: 'RH',            global: 'RH'            },
      { nom: 'Agents',        global: 'Agents'        },
    ],

    /* Collections critiques attendues dans Store */
    collections: [
      { key: 'contacts',    label: 'Contacts'    },
      { key: 'produits',    label: 'Produits'    },
      { key: 'devis',       label: 'Devis'       },
      { key: 'commandes',   label: 'Commandes'   },
      { key: 'factures',    label: 'Factures'    },
      { key: 'fournisseurs',label: 'Fournisseurs'},
    ],

    /* Les 8 agents IA HCS */
    agents: [
      { nom: 'HCS-Atelier',       id: 'agent_011Ca1i2FzUX3zNd4xuM4PHa' },
      { nom: 'HCS-Commercial',    id: 'agent_011Ca1i5Lk4BaMSRTMCtdkjk' },
      { nom: 'HCS-Marketing',     id: 'agent_011Ca1i5QZW9BuYFmAEUbrt3' },
      { nom: 'HCS-Support',       id: 'agent_011Ca1i5TrwZCPHXnqW8EjqM' },
      { nom: 'HCS-Finance',       id: 'agent_011Ca1i5WyDUg2fQCJSUzWq5' },
      { nom: 'HCS-Logistique',    id: 'agent_011Ca1i5a41GExc8u42YVC4y' },
      { nom: 'HCS-Music',         id: 'agent_011Ca1i5cqgmXC8pfK6n8YvJ' },
      { nom: 'HCS-Orchestrateur', id: 'agent_011Ca1i5g4QWANXkWTS8FCDT' },
    ]
  };

  /* ----------------------------------------------------------------
     ÉTAT INTERNE
     ---------------------------------------------------------------- */
  let _container  = null;
  let _running    = false;
  let _results    = [];   // { category, label, status, detail, fix }
  let _score      = 0;
  let _total      = 0;

  /* ================================================================
     ENTRÉE PUBLIQUE
     ================================================================ */
  function init(toolbarEl, containerEl /*, view */) {
    _container = containerEl;
    _renderToolbar(toolbarEl);
    _renderShell(containerEl);
  }

  /* ----------------------------------------------------------------
     TOOLBAR
     ---------------------------------------------------------------- */
  function _renderToolbar(el) {
    if (!el) return;
    el.innerHTML = `
      <button class="btn btn-primary btn-sm" id="btn-launch-audit">
        ▶ Lancer l'audit
      </button>
      <button class="btn btn-ghost btn-sm" id="btn-export-audit" style="display:none">
        ⬇ Exporter rapport
      </button>`;
    el.querySelector('#btn-launch-audit').addEventListener('click', _runAudit);
  }

  /* ----------------------------------------------------------------
     SHELL STATIQUE (affiché avant le lancement)
     ---------------------------------------------------------------- */
  function _renderShell(el) {
    el.innerHTML = `
      <div id="audit-shell" style="
        padding:28px 32px;
        background:#1a0e07;
        min-height:100%;
        box-sizing:border-box;
        font-family:'Inter',sans-serif;">

        <!-- En-tête -->
        <div style="
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="
              font-size:20px;font-weight:800;
              color:#f5ede0;margin:0 0 4px;letter-spacing:.01em;">
              🔍 Audit ERP HCS
            </h2>
            <p style="font-size:12px;color:#c8b89a;margin:0;">
              Vérification complète des fichiers, modules, données et agents IA
            </p>
          </div>
          <div id="audit-score-badge" style="display:none"></div>
        </div>

        <!-- Zone de progression -->
        <div id="audit-progress" style="display:none;margin-bottom:20px;">
          <div style="
            height:4px;
            background:rgba(196,129,58,0.15);
            border-radius:2px;
            overflow:hidden;
            margin-bottom:8px;">
            <div id="audit-progress-bar" style="
              height:100%;width:0%;
              background:linear-gradient(90deg,#c4813a,#e09a4f);
              border-radius:2px;
              transition:width .3s ease;"></div>
          </div>
          <p id="audit-progress-label" style="
            font-size:11px;color:#c8b89a;margin:0;font-style:italic;"></p>
        </div>

        <!-- État initial — invitation -->
        <div id="audit-idle" style="
          text-align:center;padding:60px 20px;
          border:1px dashed rgba(196,129,58,0.25);
          border-radius:10px;">
          <span style="font-size:3rem;display:block;margin-bottom:16px;">🔍</span>
          <p style="color:#c8b89a;font-size:14px;margin:0 0 20px;line-height:1.6;">
            Cliquez sur <strong style="color:#e09a4f">▶ Lancer l'audit</strong>
            pour analyser l'intégralité de l'ERP HCS :<br>
            fichiers, modules, données, liens et agents IA.
          </p>
          <button class="btn btn-primary btn-sm" onclick="document.getElementById('btn-launch-audit').click()">
            ▶ Démarrer l'audit
          </button>
        </div>

        <!-- Résultats (injecté au fur et à mesure) -->
        <div id="audit-results" style="display:none"></div>

        <!-- Rapport final -->
        <div id="audit-final" style="display:none"></div>
      </div>`;
  }

  /* ================================================================
     MOTEUR D'AUDIT PRINCIPAL
     ================================================================ */
  async function _runAudit() {
    if (_running) return;
    _running = true;
    _results = [];
    _score   = 0;
    _total   = 0;

    /* Cacher idle, montrer progression */
    _qs('#audit-idle').style.display    = 'none';
    _qs('#audit-results').style.display = 'block';
    _qs('#audit-results').innerHTML     = '';
    _qs('#audit-final').style.display   = 'none';
    _qs('#audit-progress').style.display = 'block';
    _qs('#audit-score-badge').style.display = 'none';

    const btn = document.getElementById('btn-launch-audit');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Audit en cours…'; }

    /* ---- Étapes de l'audit ---- */
    await _auditSection('📄 Scripts JS', _checkScripts);
    await _auditSection('🎨 Feuilles CSS', _checkCSS);
    await _auditSection('🗂️ Fichiers Apps', _checkApps);
    await _auditSection('⚙️ Modules JS', _checkModules);
    await _auditSection('🗃️ Données Store', _checkData);
    await _auditSection('🤖 Agents IA', _checkAgents);

    /* ---- Rapport final ---- */
    _renderFinal();

    /* Réactiver le bouton */
    if (btn) { btn.disabled = false; btn.textContent = '↺ Relancer l'audit'; }
    const exportBtn = document.getElementById('btn-export-audit');
    if (exportBtn) exportBtn.style.display = '';

    _qs('#audit-progress').style.display = 'none';
    _running = false;
  }

  /* Lance une section et injecte les résultats en temps réel */
  async function _auditSection(titre, checkFn) {
    _setProgress(titre);

    /* Conteneur de la section */
    const sectionEl = document.createElement('div');
    sectionEl.style.cssText = `
      background:rgba(196,129,58,0.04);
      border:1px solid rgba(196,129,58,0.18);
      border-radius:8px;
      margin-bottom:16px;
      overflow:hidden;`;

    /* En-tête section */
    const headerEl = document.createElement('div');
    headerEl.style.cssText = `
      padding:12px 16px;
      background:rgba(196,129,58,0.08);
      border-bottom:1px solid rgba(196,129,58,0.15);
      display:flex;align-items:center;gap:10px;`;
    headerEl.innerHTML = `
      <span style="font-size:14px;font-weight:700;color:#f5ede0;">${titre}</span>
      <span id="sec-badge-${_slugify(titre)}"
        style="font-size:10px;background:rgba(196,129,58,0.15);
          color:#c8b89a;border-radius:10px;padding:2px 8px;">
        …
      </span>`;

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'padding:12px 16px;display:flex;flex-direction:column;gap:6px;';

    sectionEl.appendChild(headerEl);
    sectionEl.appendChild(bodyEl);
    _qs('#audit-results').appendChild(sectionEl);

    /* Callback appelé par checkFn pour chaque résultat */
    const items = [];
    const onResult = (item) => {
      items.push(item);
      _results.push(item);
      _total++;
      if (item.status === 'ok') _score++;
      bodyEl.appendChild(_makeItemEl(item));
      /* Scroll auto */
      const shell = _qs('#audit-shell');
      if (shell) shell.scrollTop = shell.scrollHeight;
    };

    await checkFn(onResult);

    /* Badge de section */
    const ok  = items.filter(i => i.status === 'ok').length;
    const err = items.filter(i => i.status === 'error').length;
    const warn= items.filter(i => i.status === 'warn').length;
    const badge = document.getElementById(`sec-badge-${_slugify(titre)}`);
    if (badge) {
      badge.textContent = `${ok} OK  ${err > 0 ? err + ' erreur' + (err > 1 ? 's' : '') : ''}  ${warn > 0 ? warn + ' avert.' : ''}`.trim();
      badge.style.background = err > 0 ? 'rgba(239,68,68,0.15)' : warn > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(0,212,170,0.15)';
      badge.style.color       = err > 0 ? '#ef4444' : warn > 0 ? '#f59e0b' : '#00d4aa';
    }

    /* Petite pause visuelle entre sections */
    await _delay(120);
  }

  /* ================================================================
     FONCTIONS DE VÉRIFICATION
     ================================================================ */

  /* ---- Scripts JS ---- */
  async function _checkScripts(onResult) {
    for (const path of MANIFEST.scripts) {
      const ok = await _fetchOk(path);
      onResult({
        category: 'scripts',
        label:    path,
        status:   ok ? 'ok' : 'error',
        detail:   ok ? 'Fichier présent et accessible' : 'Fichier introuvable (404)',
        fix:      ok ? null : `Créer ou vérifier le fichier ${path}`
      });
      await _delay(30);
    }
  }

  /* ---- CSS ---- */
  async function _checkCSS(onResult) {
    for (const path of MANIFEST.css) {
      const ok = await _fetchOk(path);
      onResult({
        category: 'css',
        label:    path,
        status:   ok ? 'ok' : 'error',
        detail:   ok ? 'Feuille de style accessible' : 'CSS introuvable — rendu dégradé possible',
        fix:      ok ? null : `Créer le fichier ${path} ou vérifier son chemin dans index.html`
      });
      await _delay(30);
    }
  }

  /* ---- Fichiers apps/ ---- */
  async function _checkApps(onResult) {
    for (const path of MANIFEST.apps) {
      const ok = await _fetchOk(path);
      onResult({
        category: 'apps',
        label:    path,
        status:   ok ? 'ok' : 'error',
        detail:   ok ? 'Application accessible (HTTP 200)' : 'Fichier absent du dossier apps/',
        fix:      ok ? null : `Copier le fichier source vers hcs-erp/${path}`
      });
      await _delay(40);
    }
  }

  /* ---- Modules JS (objets globaux) ---- */
  async function _checkModules(onResult) {
    for (const mod of MANIFEST.modules) {
      const present = typeof window[mod.global] !== 'undefined';
      const hasInit = present && typeof window[mod.global].init === 'function';
      let status, detail, fix;

      if (!present) {
        status = 'error';
        detail = `window.${mod.global} n'est pas défini — module non chargé`;
        fix    = `Vérifier que js/modules/${mod.nom.toLowerCase()}.js est bien dans index.html`;
      } else if (!hasInit) {
        status = 'warn';
        detail = `window.${mod.global} existe mais n'expose pas de méthode init()`;
        fix    = `Vérifier la structure du module — doit exposer { init(toolbarEl, containerEl, view) }`;
      } else {
        status = 'ok';
        detail = `window.${mod.global}.init() disponible`;
        fix    = null;
      }

      onResult({ category: 'modules', label: mod.nom, status, detail, fix });
      await _delay(40);
    }

    /* Vérification de APPS[] dans app.js */
    const hasApps = typeof window.APPS !== 'undefined' || typeof APPS !== 'undefined';
    const appsArr = (typeof APPS !== 'undefined') ? APPS : [];
    onResult({
      category: 'modules',
      label:    'APPS[] — router',
      status:   appsArr.length > 0 ? 'ok' : 'warn',
      detail:   appsArr.length > 0
        ? `${appsArr.length} modules enregistrés dans APPS[]`
        : 'APPS[] vide ou non accessible',
      fix: null
    });
  }

  /* ---- Données Store ---- */
  async function _checkData(onResult) {
    /* Store disponible ? */
    const hasStore = typeof Store !== 'undefined' && typeof Store.getDB === 'function';
    onResult({
      category: 'data',
      label:    'Store — disponibilité',
      status:   hasStore ? 'ok' : 'error',
      detail:   hasStore ? 'Store.getDB() accessible' : 'Objet Store introuvable',
      fix:      hasStore ? null : 'Vérifier que js/store.js est chargé avant app.js'
    });

    if (!hasStore) return;

    const db = Store.getDB();
    onResult({
      category: 'data',
      label:    'Store — getDB()',
      status:   typeof db === 'object' && db !== null ? 'ok' : 'error',
      detail:   typeof db === 'object' ? `Objet DB retourné (${Object.keys(db).length} collections)` : 'getDB() retourne null',
      fix:      null
    });

    /* Vérifier chaque collection critique */
    for (const col of MANIFEST.collections) {
      const data = db[col.key];
      const exists = Array.isArray(data);
      const count  = exists ? data.length : 0;
      let status, detail, fix;

      if (!exists) {
        status = 'error';
        detail = `Collection "${col.key}" absente du Store`;
        fix    = `Vérifier que seed.js définit SEED.${col.key}`;
      } else if (count === 0) {
        status = 'warn';
        detail = `Collection "${col.key}" vide (0 enregistrements)`;
        fix    = `AUTO_FIX:seed_${col.key}`;
      } else {
        status = 'ok';
        detail = `${count} enregistrement${count > 1 ? 's' : ''} dans "${col.key}"`;
        fix    = null;
      }
      onResult({ category: 'data', label: col.label, status, detail, fix });
      await _delay(30);
    }

    /* Vérifier seed.js via SEED global */
    const hasSeed = typeof SEED !== 'undefined';
    onResult({
      category: 'data',
      label:    'SEED — données initiales',
      status:   hasSeed ? 'ok' : 'warn',
      detail:   hasSeed
        ? `SEED disponible (${Object.keys(SEED).length} collections seed)`
        : 'Objet SEED non accessible — seed.js mal chargé ?',
      fix: hasSeed ? null : 'Vérifier que data/seed.js est le premier script dans index.html'
    });
  }

  /* ---- Agents IA ---- */
  async function _checkAgents(onResult) {
    /* Clé API Anthropic */
    const apiKey = localStorage.getItem('hcs_advisor_key') || localStorage.getItem('hcs_agents_api_key');
    const hasKey = !!apiKey && apiKey.startsWith('sk-ant');
    onResult({
      category: 'agents',
      label:    'Clé API Anthropic',
      status:   hasKey ? 'ok' : 'warn',
      detail:   hasKey
        ? `Clé configurée (${apiKey.slice(0, 12)}…)`
        : 'Aucune clé API Anthropic dans localStorage',
      fix: hasKey ? null : 'AUTO_FIX:open_advisor'
    });
    await _delay(40);

    /* Module Agents disponible */
    const hasAgents = typeof Agents !== 'undefined' && typeof Agents.init === 'function';
    onResult({
      category: 'agents',
      label:    'Module Agents — chargement',
      status:   hasAgents ? 'ok' : 'error',
      detail:   hasAgents ? 'window.Agents.init() disponible' : 'Module Agents non chargé',
      fix:      hasAgents ? null : 'Vérifier que js/modules/agents.js est dans index.html'
    });
    await _delay(40);

    /* Vérifier les 8 IDs agents */
    for (const agent of MANIFEST.agents) {
      /* On vérifie seulement que l'ID est bien formaté */
      const valid = /^agent_[A-Za-z0-9]+$/.test(agent.id);
      onResult({
        category: 'agents',
        label:    agent.nom,
        status:   valid ? 'ok' : 'error',
        detail:   valid ? `ID : ${agent.id}` : `ID invalide : ${agent.id}`,
        fix:      valid ? null : 'Corriger l'ID dans agents.js'
      });
      await _delay(30);
    }
  }

  /* ================================================================
     RAPPORT FINAL
     ================================================================ */
  function _renderFinal() {
    const pct   = _total > 0 ? Math.round((_score / _total) * 100) : 0;
    const errors = _results.filter(r => r.status === 'error');
    const warns  = _results.filter(r => r.status === 'warn');
    const oks    = _results.filter(r => r.status === 'ok');

    /* Couleur du score */
    const scoreColor = pct >= 90 ? '#00d4aa' : pct >= 70 ? '#f59e0b' : '#ef4444';
    const scoreLabel = pct >= 90 ? '✅ Excellent' : pct >= 70 ? '⚠️ Correct' : '❌ Problèmes détectés';

    /* Badge score dans l'en-tête */
    const badge = _qs('#audit-score-badge');
    if (badge) {
      badge.style.display = '';
      badge.innerHTML = `
        <div style="
          text-align:center;
          background:rgba(196,129,58,0.08);
          border:2px solid ${scoreColor};
          border-radius:10px;
          padding:10px 20px;">
          <div style="font-size:28px;font-weight:900;color:${scoreColor};line-height:1;">
            ${pct}
            <span style="font-size:14px;font-weight:600;">/100</span>
          </div>
          <div style="font-size:11px;color:#c8b89a;margin-top:2px;">${scoreLabel}</div>
        </div>`;
    }

    /* Rapport final */
    const finalEl = _qs('#audit-final');
    if (!finalEl) return;
    finalEl.style.display = 'block';
    finalEl.innerHTML = `
      <div style="
        border:1px solid rgba(196,129,58,0.22);
        border-radius:10px;
        overflow:hidden;
        margin-top:8px;">

        <!-- Header rapport -->
        <div style="
          padding:16px 20px;
          background:rgba(196,129,58,0.10);
          border-bottom:1px solid rgba(196,129,58,0.18);
          display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="
            font-size:32px;font-weight:900;color:${scoreColor};
            border-right:1px solid rgba(196,129,58,0.25);
            padding-right:16px;line-height:1.1;">
            ${pct}<span style="font-size:16px;">/100</span>
          </div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:#f5ede0;margin-bottom:4px;">
              ${scoreLabel}
            </div>
            <div style="font-size:12px;color:#c8b89a;">
              ${_total} vérifications —
              <span style="color:#00d4aa;">${oks.length} OK</span> ·
              <span style="color:#f59e0b;">${warns.length} avertissement${warns.length > 1 ? 's' : ''}</span> ·
              <span style="color:#ef4444;">${errors.length} erreur${errors.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          ${errors.length > 0 || warns.length > 0 ? `
          <button
            onclick="window._auditAutoFix()"
            style="
              padding:8px 16px;
              background:#c4813a;border:none;border-radius:6px;
              color:#1a0e07;font-size:12px;font-weight:700;cursor:pointer;">
            🔧 Corriger automatiquement
          </button>` : ''}
        </div>

        <!-- Erreurs -->
        ${errors.length > 0 ? `
        <div style="padding:16px 20px;border-bottom:1px solid rgba(196,129,58,0.12);">
          <div style="
            font-size:12px;font-weight:700;color:#ef4444;
            text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">
            ❌ Erreurs (${errors.length})
          </div>
          ${errors.map(e => `
            <div style="
              display:flex;align-items:flex-start;gap:10px;
              padding:8px 0;border-bottom:1px solid rgba(196,129,58,0.08);">
              <span style="color:#ef4444;flex-shrink:0;font-size:13px;">✕</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:#f5ede0;font-weight:600;margin-bottom:2px;">
                  ${_esc(e.label)}
                </div>
                <div style="font-size:11px;color:#c8b89a;">${_esc(e.detail)}</div>
                ${e.fix && !e.fix.startsWith('AUTO_FIX') ? `
                <div style="
                  font-size:11px;color:#e09a4f;
                  background:rgba(196,129,58,0.06);
                  border-left:2px solid #c4813a;
                  padding:4px 8px;margin-top:4px;border-radius:0 4px 4px 0;">
                  💡 ${_esc(e.fix)}
                </div>` : ''}
              </div>
            </div>`).join('')}
        </div>` : ''}

        <!-- Avertissements -->
        ${warns.length > 0 ? `
        <div style="padding:16px 20px;border-bottom:1px solid rgba(196,129,58,0.12);">
          <div style="
            font-size:12px;font-weight:700;color:#f59e0b;
            text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">
            ⚠️ Avertissements (${warns.length})
          </div>
          ${warns.map(w => `
            <div style="
              display:flex;align-items:flex-start;gap:10px;
              padding:8px 0;border-bottom:1px solid rgba(196,129,58,0.08);">
              <span style="color:#f59e0b;flex-shrink:0;font-size:13px;">!</span>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:#f5ede0;font-weight:600;margin-bottom:2px;">
                  ${_esc(w.label)}
                </div>
                <div style="font-size:11px;color:#c8b89a;">${_esc(w.detail)}</div>
                ${w.fix && !w.fix.startsWith('AUTO_FIX') ? `
                <div style="
                  font-size:11px;color:#e09a4f;
                  background:rgba(196,129,58,0.06);
                  border-left:2px solid #f59e0b;
                  padding:4px 8px;margin-top:4px;border-radius:0 4px 4px 0;">
                  💡 ${_esc(w.fix)}
                </div>` : ''}
              </div>
            </div>`).join('')}
        </div>` : ''}

        <!-- Succès -->
        <div style="padding:16px 20px;">
          <div style="
            font-size:12px;font-weight:700;color:#00d4aa;
            text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px;">
            ✅ Vérifications réussies (${oks.length})
          </div>
          <div style="
            display:flex;flex-wrap:wrap;gap:6px;">
            ${oks.map(o => `
              <span style="
                font-size:11px;
                background:rgba(0,212,170,0.08);
                border:1px solid rgba(0,212,170,0.2);
                color:#00d4aa;
                border-radius:4px;padding:3px 8px;">
                ✓ ${_esc(o.label)}
              </span>`).join('')}
          </div>
        </div>

      </div>`;

    /* Expose la fonction auto-fix globalement */
    window._auditAutoFix = _autoFix;
  }

  /* ================================================================
     AUTO-FIX : corrections automatiques des erreurs simples
     ================================================================ */
  function _autoFix() {
    let fixed = 0;

    _results.forEach(r => {
      if (!r.fix || !r.fix.startsWith('AUTO_FIX')) return;

      /* Rechargement du seed pour une collection vide */
      if (r.fix.startsWith('AUTO_FIX:seed_')) {
        const col = r.fix.replace('AUTO_FIX:seed_', '');
        if (typeof SEED !== 'undefined' && SEED[col] && typeof Store !== 'undefined') {
          const db = Store.getDB();
          if (db && (!db[col] || db[col].length === 0)) {
            db[col] = SEED[col];
            if (typeof Store.saveDB === 'function') Store.saveDB(db);
            else localStorage.setItem('hcs_db', JSON.stringify(db));
            fixed++;
          }
        }
        return;
      }

      /* Ouvrir la vue Advisor pour configurer la clé API */
      if (r.fix === 'AUTO_FIX:open_advisor') {
        if (typeof openApp === 'function' && typeof openView === 'function') {
          setTimeout(() => { openApp('comptabilite'); openView('conseiller'); }, 300);
          fixed++;
        }
        return;
      }
    });

    const msg = fixed > 0
      ? `${fixed} correction${fixed > 1 ? 's' : ''} appliquée${fixed > 1 ? 's' : ''}. Relancez l'audit pour vérifier.`
      : 'Aucune correction automatique possible. Appliquez les solutions proposées manuellement.';

    if (typeof Toast !== 'undefined' && Toast.show) {
      Toast.show(msg, fixed > 0 ? 'success' : 'info');
    } else {
      alert(msg);
    }

    /* Relancer l'audit automatiquement si des corrections ont été faites */
    if (fixed > 0) {
      setTimeout(() => _runAudit(), 800);
    }
  }

  /* ================================================================
     UTILITAIRES
     ================================================================ */

  /** Teste si une URL répond avec status 200 */
  async function _fetchOk(url) {
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      return r.ok;
    } catch {
      return false;
    }
  }

  /** Promesse de délai pour effet temps réel */
  function _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** Met à jour la barre de progression */
  function _setProgress(label) {
    const bar   = _qs('#audit-progress-bar');
    const lbl   = _qs('#audit-progress-label');
    const total = 6; // nombre de sections
    const done  = ['scripts','css','apps','modules','data','agents']
      .filter(c => _results.some(r => r.category === c)).length;
    if (bar) bar.style.width = `${Math.round((done / total) * 100)}%`;
    if (lbl) lbl.textContent = `Vérification en cours : ${label}…`;
  }

  /** Crée un élément DOM pour un résultat de vérification */
  function _makeItemEl(item) {
    const colors = { ok: '#00d4aa', warn: '#f59e0b', error: '#ef4444' };
    const icons  = { ok: '✓', warn: '!', error: '✕' };
    const color  = colors[item.status] || '#c8b89a';
    const icon   = icons[item.status]  || '?';

    const el = document.createElement('div');
    el.style.cssText = `
      display:flex;align-items:flex-start;gap:8px;
      padding:5px 0;
      border-bottom:1px solid rgba(196,129,58,0.06);
      animation:audit-in .2s ease;`;
    el.innerHTML = `
      <span style="
        font-size:11px;font-weight:700;color:${color};
        flex-shrink:0;width:12px;text-align:center;margin-top:1px;">
        ${icon}
      </span>
      <div style="flex:1;min-width:0;">
        <span style="font-size:12px;color:#f5ede0;font-weight:600;">
          ${_esc(item.label)}
        </span>
        <span style="font-size:11px;color:#c8b89a;margin-left:6px;">
          — ${_esc(item.detail)}
        </span>
      </div>`;
    return el;
  }

  /** Sélecteur dans #audit-shell */
  function _qs(sel) {
    const shell = document.getElementById('audit-shell');
    return shell ? shell.querySelector(sel) : document.querySelector(sel);
  }

  /** Génère un slug pour les IDs */
  function _slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }

  /** Échappe le HTML */
  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Injection de l'animation keyframe une seule fois */
  (function injectAuditStyle() {
    if (document.getElementById('audit-style')) return;
    const st = document.createElement('style');
    st.id = 'audit-style';
    st.textContent = `
      @keyframes audit-in {
        from { opacity:0; transform:translateX(-6px); }
        to   { opacity:1; transform:none; }
      }`;
    document.head.appendChild(st);
  })();

  /* ----------------------------------------------------------------
     API PUBLIQUE
     ---------------------------------------------------------------- */
  return { init };

})();
