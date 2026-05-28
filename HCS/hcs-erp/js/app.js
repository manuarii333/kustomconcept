/* ================================================================
   HCS ERP — app.js
   Router principal : définition des 9 modules, navigation,
   dispatch vers les vues des modules
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   DÉFINITION DES 9 MODULES
   Chaque module a : id, label, icône, couleur, liste de vues
   ---------------------------------------------------------------- */
const APPS = [
  /* ====================================================
     MODULES PRINCIPAUX — visibles dans la topbar
     ==================================================== */
  {
    id: 'dashboard',
    label: 'Accueil',
    icon: '⊞',
    color: '#4a5fff',
    pinned: true,
    views: [
      { id: 'overview',  label: 'Vue d\'ensemble', icon: '📊' },
      { id: 'activity',  label: 'Activité récente', icon: '🕐' }
    ]
  },
  {
    id: 'crm',
    label: 'Clients',      /* CRM renommé "Clients" */
    icon: '👥',
    color: '#b07bff',
    pinned: false,
    views: [
      { id: 'contacts',  label: 'Contacts',  icon: '👤', section: 'Annuaire'      },
      { id: 'pipeline',  label: 'Pipeline',  icon: '⊞', section: 'Opportunités'  }
    ]
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: '🛒',
    color: '#00d4aa',
    pinned: true,
    views: [
      { id: 'quotes',       label: 'Devis',             icon: '📄', section: 'Flux'      },
      { id: 'orders',       label: 'Commandes',         icon: '📦', section: 'Flux'      },
      { id: 'invoices',     label: 'Factures',          icon: '🧾', section: 'Flux'      },
      { id: 'clients',      label: 'Clients',           icon: '👥', section: 'Annuaire'  },
      { id: 'contacts',  label: 'Contacts',  icon: '👤', section: 'Clients' },
      { id: 'pipeline',  label: 'Pipeline',  icon: '⊞',  section: 'Clients' },
      { id: 'receipts',     label: 'Bons de livraison', icon: '📋', section: 'Réception' },
      { id: 'sales-report', label: 'Rapport',           icon: '📈', section: 'Rapports'  },
      { id: 'devis-analyser', label: 'Analyseur Marges', icon: '🔬', section: 'Rapports', href: 'apps/devis-analyser.html' },
      { id: 'doc-params',   label: 'Mise en forme',    icon: '🎨', section: 'Paramètres' }
    ]
  },
  {
    id: 'production',
    label: 'Production',
    icon: '⚙️',
    color: '#ff6b6b',
    pinned: true,
    views: [
      { id: 'planning',           label: 'Planning',             icon: '📅', section: 'Atelier'    },
      { id: 'hcs-designer',       label: '⬡ HCS Designer',        icon: '🎨', section: 'Atelier'    },
      { id: 'mo',                 label: 'Ordres de fab.',         icon: '🔧', section: 'Atelier'    },
      { id: 'bom',                label: 'Nomenclatures',          icon: '📐', section: 'Paramètres' },
      { id: 'work-centers',       label: 'Postes',                 icon: '🏭', section: 'Paramètres' },
      { id: 'andromeda-campaign', label: '📡 Andromeda Builder',   icon: '📡', section: 'Campagnes'  }
    ]
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: '📦',
    color: '#4a5fff',
    pinned: true,
    views: [
      { id: 'products',     label: 'Produits',   icon: '📋', section: 'Catalogue' },
      { id: 'categories',   label: 'Catégories', icon: '🏷',  section: 'Catalogue' },
      { id: 'stock-moves',  label: 'Mouvements', icon: '↕️', section: 'Stock'    },
      { id: 'suppliers',       label: 'Fournisseurs',  icon: '🏭', section: 'Approvisionnement' },
      { id: 'po',              label: 'Commandes achat',icon: '🛒', section: 'Approvisionnement' },
      { id: 'purchase-report', label: 'Rapport achats', icon: '📈', section: 'Approvisionnement' },
      { id: 'stock-report', label: 'Rapport',    icon: '📈', section: 'Rapports' }
    ]
  },
  {
    id: 'caisse',
    label: 'Caisse',
    icon: '💳',
    color: '#F59E0B',
    pinned: true,
    views: [
      { id: 'caisse-pos', label: 'Point de vente', icon: '🛒', section: 'Point de vente' }
    ]
  },
  {
    id: 'parametres',
    label: 'Paramètres',
    icon: '⚙',
    color: '#6B7280',
    pinned: true,
    views: [
      { id: 'utilisateurs', label: 'Utilisateurs',    icon: '👥', section: 'Accès'      },
      { id: 'audit-log',    label: 'Journal d\'audit', icon: '📋', section: 'Accès'      },
      { id: 'boutique', label: 'Ma boutique', icon: '🏪', section: 'Configuration' },
      { id: 'mon-profil',   label: 'Mon profil',       icon: '👤', section: 'Mon compte' }
    ]
  },

  /* ====================================================
     MODULES SECONDAIRES — accessibles via "⋯ Plus"
     ==================================================== */
  {
    id: 'fidelite',
    label: 'Fidélité',
    icon: '⭐',
    color: '#f6d365',
    pinned: true,
    views: [
      { id: 'programme',  label: 'Programme Fidélité', icon: '⭐', section: 'Comptes Clients',
        href: 'apps/andromeda-campaign.html' },
      { id: 'portail',    label: 'Portail Client',     icon: '🔗', section: 'Comptes Clients',
        href: 'apps/compte-client.html' },
      { id: 'envoyer-lien', label: 'Envoyer un lien', icon: '📧', section: 'Comptes Clients' }
    ]
  },
  {
    id: 'comptabilite',
    label: 'Comptabilité',
    icon: '💰',
    color: '#00d4aa',
    pinned: true,
    views: [
      { id: 'tableau-de-bord', label: 'Tableau de bord',    icon: '📊', section: 'Vue globale' },
      { id: 'conseiller',      label: 'Copilote financier',  icon: '🧠', section: 'Vue globale' },
      { id: 'depenses',        label: 'Dépenses & TVA',      icon: '🧾', section: 'Saisie'      },
      { id: 'journal',         label: 'Journal',             icon: '📒', section: 'Saisie'      },
      { id: 'accounts',        label: 'Plan comptable',      icon: '📋', section: 'Saisie'      },
      { id: 'grand-livre',     label: 'Grand Livre',         icon: '📒', section: 'Saisie'      },
      { id: 'paiements',       label: 'Paiements',           icon: '💳', section: 'Saisie'      },
      { id: 'pl-report',       label: 'Compte de résultat',  icon: '📈', section: 'Rapports'    },
      { id: 'bilan',           label: 'Bilan',               icon: '⚖',  section: 'Rapports'    },
      { id: 'balance',         label: 'Balance',             icon: '📊', section: 'Rapports'    },
      { id: 'tax-report',      label: 'Rapport TVA',         icon: '📑', section: 'Rapports'    },
      { id: 'stats-ventes',   label: 'Stats ventes & TVA',  icon: '📦', section: 'Rapports'    },
      { id: 'assistant',       label: '✨ Assistant Comptable', icon: '🤖', section: 'IA'       },
      { id: 'session',         label: '💾 Session / Backup',   icon: '🛡', section: 'IA'       }
    ]
  },
  {
    id: 'agents',
    label: 'Agents IA',
    icon: '🤖',
    color: '#00d4aa',
    pinned: true,
    views: [
      { id: 'dashboard',       label: 'Tableau de bord',   icon: '⬡',  section: 'Agents IA' },
      { id: 'chat',            label: 'Chat agents',        icon: '💬', section: 'Agents IA' },
      { id: 'prompts',         label: 'Prompts',            icon: '📋', section: 'Agents IA' },
      { id: 'sessions',        label: 'Historique',         icon: '🕓', section: 'Agents IA' },
      { id: 'apprentissages',  label: 'Apprentissages',     icon: '🧠', section: 'Agents IA' }
    ]
  },
  {
    id: 'rh',
    label: 'RH',
    icon: '👤',
    color: '#b07bff',
    pinned: false,
    views: [
      { id: 'employes',    label: 'Employés', icon: '👥', section: 'Équipe' },
      { id: 'conges',      label: 'Congés',   icon: '🏖️', section: 'Équipe' },
      { id: 'planning-rh', label: 'Planning', icon: '📅', section: 'Équipe' }
    ]
  },
  {
    id: 'messagerie',
    label: 'Discussion',
    icon: '💬',
    color: '#4a5fff',
    pinned: false,
    views: [
      { id: 'inbox',      label: 'Boîte de réception', icon: '📥', section: 'Canaux' },
      { id: 'general',    label: '#général',            icon: '#',  section: 'Canaux' },
      { id: 'production', label: '#production',         icon: '#',  section: 'Canaux' },
      { id: 'ventes',     label: '#ventes',             icon: '#',  section: 'Canaux' }
    ]
  },
  {
    id: 'outils',
    label: 'Outils HCS',
    icon: '🔧',
    color: '#6B7280',
    views: [
      { id: 'triage-dashboard',        label: 'Triage & Réception',    icon: '📋', section: 'Opérations'       },
      { id: 'commercial-dashboard',    label: 'Commercial & Devis',    icon: '🤝', section: 'Opérations'       },
      { id: 'boutique-assistant',      label: 'Boutique Assistant',    icon: '🏪', section: 'Opérations'       },
      { id: 'atelier-production',      label: 'Atelier Production',    icon: '⚙️', section: 'Production'       },
      { id: 'dtf-atelier-bn20-yannick',label: 'DTF Atelier BN20',     icon: '🖨',  section: 'Production'       },
      { id: 'dtf-atelier-usa',         label: 'DTF Atelier USA',      icon: '🖨',  section: 'Production'       },
      { id: 'dtf-plaques-transfert',   label: 'DTF Plaques Transfert', icon: '🖨', section: 'Production', external: true, url: 'apps/dtf-plaques-transfert.html' },
      { id: 'dtf-laize-1yard-22po',    label: 'DTF Laize 1 Yard 22po', icon: '📐', section: 'Production', external: true, url: 'apps/dtf-laize-1yard-22po.html'    },
      { id: 'signmaster-guide',        label: 'SignMaster Guide',      icon: '✂️', section: 'Production'       },
      { id: 'admin-photos-produits',   label: 'Photos Produits',       icon: '📸', section: 'Visuel & Contenu' },
      { id: 'hcs-designer',            label: '⬡ HCS Designer',        icon: '🎨', section: 'Visuel & Contenu' },
      { id: 'picwish-pipeline',        label: 'PicWish Pipeline',      icon: '🖼',  section: 'Visuel & Contenu', external: true, url: 'apps/picwish-pipeline.html' },
      { id: 'tshirt-mockup-studio',    label: 'T-Shirt Mockup Studio', icon: '👕',  section: 'Visuel & Contenu', external: true, url: 'apps/tshirt-mockup-studio.html' },
      { id: 'content-generator',       label: 'Content Generator',     icon: '✍️', section: 'Visuel & Contenu' },
      { id: 'stock-dashboard',         label: 'Stock Dashboard',       icon: '📦', section: 'Gestion'          },
      { id: 'finance-dashboard',        label: 'Finance Dashboard',     icon: '💰', section: 'Gestion'          },
      { id: 'rapport-pl',              label: 'Rapport P&L',           icon: '📈', section: 'Gestion'          },
      { id: 'sessions-comptables',     label: 'Sessions Comptables',   icon: '📅', section: 'Gestion'          },
      { id: 'ocr-scanner',             label: 'Scanner OCR',           icon: '🔍', section: 'Gestion'          },
      { id: 'guide-erp',               label: '📖 Guide ERP',          icon: '📖', section: 'Aide'             },
      { id: 'supervision-dashboard',   label: 'Supervision',           icon: '👁',  section: 'Supervision'      },
      { id: 'routine-dashboard',       label: 'Routines',              icon: '🔄', section: 'Supervision'      },
      { id: 'vocal-dashboard',         label: 'Agent Vocal',           icon: '🎙', section: 'Supervision'      },
      { id: 'advisor',                  label: '⬡ Grace — Advisor IA',  icon: '🤖', section: 'Supervision'      },
      { id: 'dev-studio',               label: 'Dev Studio',            icon: '🛠',  section: 'Développement'    },
      /* ── Applications HCS externes ── */
      { id: 'ext-andromeda',   label: 'Andromeda Builder', icon: '📡', section: 'Applications HCS', external: true, url: 'apps/andromeda-campaign.html' },
      { id: 'mockup-forge-v12', label: 'MockupForge v12',   icon: '🖼️', section: 'Applications HCS' },
      { id: 'dtf-studio',      label: 'DTF Studio Creator', icon: '🎬', section: 'Applications HCS', external: true, url: 'apps/dtf-studio.html' },
      { id: 'ext-dtf-composer',label: 'DTF Composer v4',   icon: '🎨', section: 'Applications HCS', external: true, url: '../agents/agent3_visuel/dtf-composer-v4.html' },
      { id: 'calculateur-transfert-dtf-v2',         label: 'Calculateur Transfert DTF V2', icon: '🎨', section: 'Applications HCS' },
      { id: 'calculateur-vinyl-hcs',               label: 'Calculateur Vinyle',      icon: '✂️', section: 'Applications HCS' },
      { id: 'calculateur-transfert-thermocollant', label: 'Calculateur Transfert',   icon: '♨️', section: 'Applications HCS' },
      { id: 'product-creator',                     label: 'Product Creator CSV',     icon: '📦', section: 'Applications HCS' },
      { id: 'ext-hcs-builder', label: 'HCS Builder v2',    icon: '🏗️', section: 'Applications HCS', external: true, url: '../hcs-builder-v2-fixed.html' },
      { id: 'ext-pass-hcs',    label: 'Pass HCS',          icon: '🎫', section: 'Applications HCS', external: true, url: '../hcs-hub-ecosystem/hcs-hub-ecosystem/hcs-pass-test.html' },
      { id: 'ext-hub',         label: 'HCS Hub',           icon: '🗄️', section: 'Applications HCS', external: true, url: '../hcs-hub.html' },
      { id: 'ext-cockpit',     label: 'HCS Cockpit',       icon: '🚀', section: 'Applications HCS', external: true, url: '../hcs-hub-ecosystem/hcs-hub-ecosystem/hcs-cockpit.html' },
      { id: 'agents-profiles',  label: 'Profils Agents IA', icon: '🤖', section: 'Applications HCS', external: true, url: 'apps/hcs-agents-profiles.html' },
      { id: 'workflow-builder', label: 'Workflow Builder',   icon: '⛓',  section: 'Applications HCS', external: true, url: 'apps/hcs-workflow-builder.html' }
    ]
  }
];

/* ----------------------------------------------------------------
   ÉTAT DE NAVIGATION
   ---------------------------------------------------------------- */
const AppState = {
  currentApp:  null,   // id du module actif
  currentView: null,   // id de la vue active
  viewMode:    'list', // 'list' | 'kanban'
  searchQuery: ''
};

/* Exposé pour Store.sync — rafraîchit la vue courante après sync MySQL */
window.App = {
  refresh: () => {
    if (AppState.currentView) openView(AppState.currentView);
    else if (AppState.currentApp) openApp(AppState.currentApp);
  }
};

/* ----------------------------------------------------------------
   INITIALISATION
   Lance l'app après le login
   ---------------------------------------------------------------- */
function initApp() {
  renderTopbar();

  /* Restaurer la navigation depuis le hash URL (lien permanent) */
  const _startHash = window.location.hash.replace('#', '').trim();
  if (_startHash && _startHash.includes('/')) {
    const [_appId, _viewId] = _startHash.split('/');
    const _appOk = APPS.find(a => a.id === _appId);
    if (_appOk) {
      openApp(_appId);
      if (_viewId) setTimeout(() => openView(_viewId), 80);
    } else {
      openApp('dashboard');
    }
  } else if (_startHash) {
    const _appOk = APPS.find(a => a.id === _startHash);
    openApp(_appOk ? _startHash : 'dashboard');
  } else {
    openApp('dashboard');
  }

  bindToolbar();
  bindModal();
  initGlobalSearch(); // Ctrl+K recherche globale

  /* Analyse financière automatique au démarrage */
  if (typeof Advisor !== 'undefined') {
    setTimeout(() => Advisor.runAtLogin(), 1500);
  }

  /* Listener : reçoit les produits depuis Product Creator (iframe) */
  window.addEventListener('message', async (e) => {
    if (!e.data || e.data.type !== 'HCS_SAVE_PRODUCTS') return;
    const list = e.data.products || [];
    if (list.length === 0) return;
    let ok = 0, err = 0;
    for (const p of list) {
      try {
        await Store.create('produits', p);
        ok++;
      } catch (_) { err++; }
    }
    const msg = err === 0
      ? `${ok} produit(s) enregistré(s) dans l'ERP ✓`
      : `${ok} OK · ${err} erreur(s)`;
    if (typeof showToast === 'function') showToast(msg, err ? 'warning' : 'success');
    else alert(msg);
  });
}

/* ----------------------------------------------------------------
   TOPBAR : rendu des icônes d'application
   ---------------------------------------------------------------- */
function renderTopbar() {
  const menu    = document.getElementById('app-menu');
  if (!menu) return;

  const session = Auth.getSession();
  if (!session) return;

  const role    = (window.ROLES || {})[session.role] || {};
  const couleur = session.couleur || '#6366F1';

  /* Filtrer les modules accessibles selon le rôle */
  const allAccessible = APPS.filter(app => Auth.canAccess(app.id));
  const pinnedApps    = allAccessible.filter(app => app.pinned !== false);
  const moreApps      = allAccessible.filter(app => app.pinned === false);

  /* Modules principaux */
  menu.innerHTML = pinnedApps.map(app => {
    const btn = `<button class="app-item" data-app="${app.id}" onclick="openApp('${app.id}')">
      <span class="app-icon">${app.icon}</span>
      <span class="app-label">${app.label}</span>
    </button>`;
    if (app.id === 'ventes') {
      return btn + `
    <button class="app-item app-shortcut" onclick="openApp('ventes');setTimeout(()=>openView('quotes'),80)" title="Devis">
      <span class="app-icon">📄</span>
      <span class="app-label">Devis</span>
    </button>
    <button class="app-item app-shortcut" onclick="openApp('ventes');setTimeout(()=>openView('invoices'),80)" title="Factures">
      <span class="app-icon">🧾</span>
      <span class="app-label">Factures</span>
    </button>`;
    }
    return btn;
  }).join('');

  /* Bouton "⋯ Plus" pour les modules secondaires */
  if (moreApps.length > 0) {
    const overflowEl = document.createElement('div');
    overflowEl.className = 'app-overflow';
    overflowEl.innerHTML = `
      <button class="app-item" id="btn-more-apps" title="Plus de modules">
        <span class="app-icon">⋯</span>
        <span class="app-label">Plus</span>
      </button>
      <div class="app-overflow-menu" id="app-overflow-menu">
        ${moreApps.map(app => `
          <button class="overflow-app-item" data-app="${app.id}">
            <span style="font-size:1rem;">${app.icon}</span>
            <span>${app.label}</span>
          </button>
        `).join('')}
      </div>`;
    menu.appendChild(overflowEl);

    /* Toggle du menu overflow */
    const btnMore = overflowEl.querySelector('#btn-more-apps');
    const overflowMenu = overflowEl.querySelector('#app-overflow-menu');
    btnMore.addEventListener('click', (e) => {
      e.stopPropagation();
      overflowMenu.classList.toggle('open');
    });
    overflowEl.querySelectorAll('.overflow-app-item').forEach(btn => {
      btn.addEventListener('click', () => {
        openApp(btn.dataset.app);
        overflowMenu.classList.remove('open');
      });
    });
    /* Ferme au clic extérieur */
    document.addEventListener('click', () => overflowMenu.classList.remove('open'));
  }

  /* Badge utilisateur avec avatar coloré et rôle */
  const badge = document.getElementById('user-badge');
  if (badge) {
    const initials = session.avatar || '??';
    badge.innerHTML = `
      <span style="
        display:inline-flex;align-items:center;justify-content:center;
        width:26px;height:26px;border-radius:50%;
        background:${couleur};color:#fff;
        font-size:11px;font-weight:700;margin-right:6px;flex-shrink:0;">
        ${escapeHtml(initials)}
      </span>
      <span style="font-size:13px;">
        ${escapeHtml(session.prenom)}
        <span style="font-size:10px;color:rgba(255,255,255,0.6);margin-left:4px;">
          ${escapeHtml(role.label || session.role)}
        </span>
      </span>
    `;
    badge.style.cssText = 'display:flex;align-items:center;cursor:pointer;padding:4px 8px;border-radius:6px;';
    badge.onclick = () => {
      openApp('parametres');
      setTimeout(() => openView('mon-profil'), 60);
    };
  }

  /* Bouton Admin DB (super_admin uniquement) */
  if (Auth.hasRole('super_admin','admin') && !document.getElementById('btn-admin')) {
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      const adminBtn = document.createElement('button');
      adminBtn.id        = 'btn-admin';
      adminBtn.className = 'btn-ghost btn-sm';
      adminBtn.title     = 'Administration base de données';
      adminBtn.innerHTML = '🗄️';
      adminBtn.addEventListener('click', openAdminModal);
      logoutBtn.parentNode.insertBefore(adminBtn, logoutBtn);
    }
  }
}

/* ----------------------------------------------------------------
   openApp(appId)
   Active un module : met à jour la sidebar, ouvre la 1re vue
   ---------------------------------------------------------------- */
function openApp(appId) {
  const app = APPS.find(a => a.id === appId);
  if (!app) return;

  AppState.currentApp = appId;

  // Marquer actif dans la topbar (pinned + overflow)
  document.querySelectorAll('.app-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.app === appId);
  });
  document.querySelectorAll('.overflow-app-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.app === appId);
  });

  // Rendre la sidebar
  renderSidebar(app);

  // Ouvrir la première vue du module
  if (app.views.length > 0) {
    openView(app.views[0].id);
  }
}

/* Synchronise l'URL avec l'état courant (hash routing — lien permanent) */
function _syncHash() {
  const hash = '#' + AppState.currentApp + '/' + (AppState.currentView || '');
  if (window.location.hash !== hash) {
    history.replaceState(null, '', hash);
  }
}

/* ----------------------------------------------------------------
   SIDEBAR : rendu des sous-menus du module actif
   ---------------------------------------------------------------- */
function renderSidebar(app) {
  const title = document.getElementById('sidebar-title');
  const menu  = document.getElementById('sidebar-menu');
  if (!title || !menu) return;

  title.textContent = app.label;

  // Regrouper les vues par section
  const sections = {};
  app.views.forEach(v => {
    const sec = v.section || '';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(v);
  });

  let html = '';
  Object.entries(sections).forEach(([section, views]) => {
    if (section) {
      html += `<div class="sidebar-section">
        <div class="sidebar-section-label">${section}</div>`;
    }
    views.forEach(v => {
      const extBadge = v.external
        ? `<span style="font-size:9px;opacity:.45;margin-left:auto;flex-shrink:0;">↗</span>`
        : '';
      html += `
        <button class="sidebar-item" data-view="${v.id}" onclick="openView('${v.id}')"
          title="${v.label}${v.external ? ' — ouvre dans un nouvel onglet' : ''}">
          <span class="item-icon">${v.icon}</span>
          <span class="item-label">${v.label}</span>
          ${extBadge}
        </button>`;
    });
    if (section) html += '</div>';
  });

  menu.innerHTML = html;
}

/* ----------------------------------------------------------------
   openView(viewId)
   Charge une vue dans la zone de contenu principale
   ---------------------------------------------------------------- */
function openView(viewId) {
  AppState.currentView = viewId;
  _syncHash();

  // Marquer actif dans la sidebar
  document.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });

  // Rendre les actions de la toolbar selon le module
  renderToolbarActions();

  // Dispatcher vers le bon renderer
  renderView();
}

/* ----------------------------------------------------------------
   renderView()
   Dispatch vers le renderer selon l'app + la vue courante
   ---------------------------------------------------------------- */
function renderView() {
  const container = document.getElementById('view-content');
  if (!container) return;

  /* Toujours réinitialiser les styles inline posés par renderIframe()
     pour que le overflow-y:scroll du CSS reprenne la main */
  container.style.overflow = '';
  container.style.padding  = '';

  /* Restaurer la toolbar ERP (masquée par les modules plein écran) */
  const _tb = document.getElementById('toolbar');
  if (_tb) _tb.style.display = '';

  const app  = AppState.currentApp;
  const view = AppState.currentView;

  // Chaque module a son propre renderer
  switch (app) {
    case 'dashboard':    renderDashboard(view, container);    break;
    case 'crm':
      // Déléguer au module CRM dédié (js/modules/crm.js)
      if (typeof CRM !== 'undefined') {
        CRM.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'ventes':
      /* Lien externe → ouvrir dans un nouvel onglet */
      if (view === 'devis-analyser') {
        window.open('apps/devis-analyser.html', '_blank');
        break;
      }
      /* Contacts et Pipeline délégués au module CRM */
      if ((view === 'contacts' || view === 'pipeline') && typeof window.CRM !== 'undefined') {
        window.CRM.init(document.getElementById('toolbar-actions'), container, view);
      } else if (typeof window.Sales !== 'undefined') {
        try {
          window.Sales.init(document.getElementById('toolbar-actions'), container, view);
        } catch(e) {
          container.innerHTML = `<div style="padding:24px;color:var(--accent-red,#ff6b6b);">
            <strong>Erreur module Ventes</strong><br><code>${e.message}</code></div>`;
          console.error('[renderView] Sales.init error:', e);
        }
      } else {
        container.innerHTML = '<div style="padding:24px;color:var(--text-muted);">Module Ventes non chargé.</div>';
      }
      break;
    case 'stock':
      /* Fournisseurs et achats délégués au module Purchases */
      if (['suppliers','po','purchase-report'].includes(view) && typeof Purchases !== 'undefined') {
        Purchases.init(document.getElementById('toolbar-actions'), container, view);
      } else if (typeof Inventory !== 'undefined') {
        Inventory.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'production':
      // La vue Planning charge le dashboard standalone en iframe
      if (view === 'planning') {
        renderIframe('modules/planning-dashboard.html', container);
      } else if (view === 'hcs-designer') {
        renderIframe('modules/hcs-designer.html', container);
      } else if (view === 'andromeda-campaign') {
        renderIframe('apps/andromeda-campaign.html', container);
      } else if (typeof Manufacturing !== 'undefined') {
        Manufacturing.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'comptabilite':
      /* Déléguer au module Comptabilité — 'conseiller' va vers Advisor */
      if (view === 'conseiller') {
        if (typeof Advisor !== 'undefined') {
          Advisor.init(document.getElementById('toolbar-actions'), container);
        }
      } else if (typeof Accounting !== 'undefined') {
        Accounting.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'fidelite':
      if (view === 'programme') {
        renderIframe('apps/andromeda-campaign.html', container);
      } else if (view === 'portail') {
        window.open('apps/compte-client.html', '_blank');
        container.innerHTML = `<div class="table-empty"><p>🔗 Portail client ouvert dans un nouvel onglet.</p></div>`;
      } else if (view === 'envoyer-lien') {
        renderSendLink(container);
      } else {
        container.innerHTML = `<div class="table-empty"><p>⭐ Sélectionnez une vue Fidélité.</p></div>`;
      }
      break;
    case 'rh':           renderRH(view, container);           break;
    case 'parametres':
      if (typeof Users !== 'undefined') {
        Users.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'messagerie':
      if (typeof Discuss !== 'undefined') {
        Discuss.init(document.getElementById('toolbar-actions'), container, view);
      }
      break;
    case 'caisse':
      renderIframe(`modules/${view}.html`, container);
      break;
    case 'agents':
      container.style.padding = '';
      container.style.overflow = '';
      if (typeof Agents !== 'undefined') {
        Agents.init(document.getElementById('toolbar-actions'), container, view);
      } else {
        container.innerHTML = `<div class="table-empty"><p>🤖 Module Agents IA non chargé — vérifiez js/modules/agents.js</p></div>`;
      }
      break;
    case 'outils': {
      /* Vue Advisor IA — rendu inline (pas d'iframe) */
      if (view === 'advisor') {
        container.style.padding = '';
        container.style.overflow = '';
        if (typeof Advisor !== 'undefined') {
          Advisor.init(document.getElementById('toolbar-actions'), container);
        } else {
          container.innerHTML = `<div class="table-empty"><p>⬡ Module Advisor non chargé — vérifiez js/modules/advisor.js</p></div>`;
        }
      } else {
        /* Vérifier si vue externe (Applications HCS) */
        const outilsApp = APPS.find(a => a.id === 'outils');
        const viewDef   = outilsApp ? outilsApp.views.find(v => v.id === view) : null;
        if (viewDef && viewDef.external && viewDef.url) {
          /* Apps intégrées dans l'ERP via iframe — HCS Builder, Hub, Pass, Cockpit */
          const IFRAME_APPS = ['ext-hcs-builder', 'ext-hub', 'ext-pass-hcs', 'ext-cockpit', 'ext-andromeda', 'dtf-plaques-transfert', 'dtf-laize-1yard-22po'];
          if (IFRAME_APPS.includes(view)) {
            renderIframe(viewDef.url, container);
          } else {
            window.open(viewDef.url, '_blank');
          }
        } else {
          renderIframe(`modules/${view}.html`, container);
        }
      }
      break;
    }
    default:             container.innerHTML = `<div class="table-empty"><p>Module "${app}" à venir.</p></div>`;
  }
}

/* ----------------------------------------------------------------
   TOOLBAR ACTIONS : boutons contextuels selon le module/vue
   ---------------------------------------------------------------- */
function renderToolbarActions() {
  const zone = document.getElementById('toolbar-actions');
  if (!zone) return;

  const app  = AppState.currentApp;
  const view = AppState.currentView;

  // Ces modules gèrent leur propre toolbar via leur init()
  if (app === 'crm' || app === 'ventes' || app === 'stock' ||
      app === 'production' || app === 'comptabilite' || app === 'messagerie' ||
      app === 'caisse' || app === 'outils' || app === 'parametres') return;

  // Mapping app+vue → boutons (modules sans fichier dédié)
  const actionMap = {
    'achats-bons-achat':[{ label: '+ Bon d\'achat', fn: 'newBonAchat()' }],
    'stock-inventaire':[{ label: '+ Ajustement',  fn: 'newAjustement()' }],
    'production-ordres':[{ label: '+ Ordre de fab.', fn: 'newOrdre()' }],
    'comptabilite-ecritures':[{ label: '+ Écriture', fn: 'newEcriture()' }],
    'messagerie-general':[{ label: '', fn: '' }] // pas de bouton pour la messagerie
  };

  const key = `${app}-${view}`;
  const actions = actionMap[key] || [];

  zone.innerHTML = actions
    .filter(a => a.label)
    .map(a => `<button class="btn btn-primary btn-sm" onclick="${a.fn}">${a.label}</button>`)
    .join('');
}

/* ----------------------------------------------------------------
   TOOLBAR : liaison des événements (recherche, switch vue)
   ---------------------------------------------------------------- */
function bindToolbar() {
  // Recherche
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value.toLowerCase();
      renderView(); // relancer le rendu filtré
    });
  }

  // Switch vue liste / kanban
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.viewMode = btn.dataset.view;
      renderView();
    });
  });
}

/* ----------------------------------------------------------------
   MODAL : ouverture / fermeture
   ---------------------------------------------------------------- */
function bindModal() {
  const overlay  = document.getElementById('modal-container');
  const closeBtn = document.getElementById('modal-close');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay)  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Fermer avec Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

function openModal(html, size = '') {
  const overlay = document.getElementById('modal-container');
  const box     = document.getElementById('modal-box');
  const content = document.getElementById('modal-content');
  if (!overlay || !box || !content) return;

  content.innerHTML = html;
  box.className = 'modal-box' + (size ? ` modal-${size}` : '');
  overlay.style.display = 'flex';
}

function closeModal() {
  const overlay = document.getElementById('modal-container');
  if (overlay) overlay.style.display = 'none';
}

/* ================================================================
   RENDERERS PAR MODULE
   ================================================================ */

/* ---- DASHBOARD ---- */
function renderDashboard(view, container) {
  const db      = Store.getDB();
  const now     = new Date();
  const session = Auth.getSession();
  const isAdmin = session && session.role === 'admin';

  /* ── FINANCE ── */
  const moisCur   = now.getMonth();
  const anCur     = now.getFullYear();
  const moisLabel = now.toLocaleDateString('fr-FR', { month: 'long' });

  const caMois = (db.factures || [])
    .filter(f => {
      if (!['Payée','Payé'].includes(f.statut)) return false;
      const d = new Date(f.date || f._createdAt);
      return d.getMonth() === moisCur && d.getFullYear() === anCur;
    })
    .reduce((s, f) => s + (f.totalTTC || 0), 0);

  const tresorerie = (db.ecritures || [])
    .filter(e => ['512000','530000','512','530'].includes(String(e.compte || '')))
    .reduce((s, e) => s + (Number(e.debit) || 0) - (Number(e.credit) || 0), 0);

  const impayeesListe    = (db.factures || []).filter(f => !['Payée','Payé','Annulée','Annulé'].includes(f.statut));
  const facturesImpayees = impayeesListe.length;
  const montantImpayees  = impayeesListe.reduce((s, f) => s + (f.totalTTC || 0), 0);

  const depensesMois = (db.ecritures || [])
    .filter(e => {
      const c = String(e.compte || '');
      if (!/^6/.test(c)) return false;
      const d = new Date(e.date || e._createdAt);
      return d.getMonth() === moisCur && d.getFullYear() === anCur;
    })
    .reduce((s, e) => s + (Number(e.debit) || 0), 0);

  const resultatNet = caMois - depensesMois;
  const objectifCA  = Number(localStorage.getItem('hcs_objectif_ca') || 500000);
  const objectifPct = objectifCA > 0 ? Math.min(100, Math.round((caMois / objectifCA) * 100)) : 0;

  /* ── VENTES ── */
  const commandesEnCours = (db.commandes || [])
    .filter(c => ['Confirmé','En cours','Prêt','En production'].includes(c.statut)).length;
  const devisEnAttente = (db.devis || [])
    .filter(d => ['Brouillon','Envoyé','En attente'].includes(d.statut)).length;
  const alertesStock = (db.produits || [])
    .filter(p => (p.stock || 0) <= (p.stockMin || 5)).length;

  /* ── PRODUCTION ── */
  const ofEnProd = (db.ordresFab || [])
    .filter(of => ['En cours','Planifié','Prêt'].includes(of.statut)).length;
  const ofListe = (db.ordresFab || [])
    .filter(of => ['En cours','Planifié','Prêt'].includes(of.statut))
    .sort((a, b) => new Date(a.datePrevue || a._createdAt || 0) - new Date(b.datePrevue || b._createdAt || 0))
    .slice(0, 5);

  /* ── ACHATS ── */
  const bonsAchat = (db.bonsAchat || [])
    .filter(b => !['Reçu','Annulé'].includes(b.statut))
    .sort((a, b) => new Date(b._createdAt || 0) - new Date(a._createdAt || 0))
    .slice(0, 5);
  const stockBas = (db.produits || [])
    .filter(p => (p.stock || 0) <= (p.stockMin || 5) && (p.stockMin || 5) > 0)
    .sort((a, b) => (a.stock || 0) - (b.stock || 0))
    .slice(0, 4);

  /* ── PIPELINE CRM ── */
  const STAGES_CRM = ['Nouveau','Qualifié','Proposition','Négociation','Gagné'];
  const STAGE_COLORS = { Nouveau:'#6B7280', Qualifié:'#2563EB', Proposition:'#D97706', Négociation:'#7C3AED', Gagné:'#16A34A' };
  const pipeline       = (db.opportunites || []).filter(o => !['Gagné','Perdu'].includes(o.statut)).length;
  const pipelineTotal  = (db.opportunites || []).reduce((s, o) => s + (o.montant || 0), 0);
  const oppsByStade    = {};
  STAGES_CRM.forEach(s => { oppsByStade[s] = { count: 0, montant: 0 }; });
  (db.opportunites || []).forEach(o => {
    const s = o.stade || 'Nouveau';
    if (oppsByStade[s]) { oppsByStade[s].count++; oppsByStade[s].montant += (o.montant || 0); }
  });
  const topOpps = (db.opportunites || [])
    .filter(o => o.statut !== 'Perdu')
    .sort((a, b) => (b.montant || 0) - (a.montant || 0))
    .slice(0, 5);

  /* ── AGENTS IA ── */
  const agentsHistory = (() => {
    try { return JSON.parse(localStorage.getItem('hcs_agents_histories') || '{}'); } catch(e) { return {}; }
  })();
  const AGENTS_DASH = [
    { id:'agent_hcs_triage_1',             nom:'TEIVA',    role:'Triage',     icon:'📨', color:'#10B981' },
    { id:'agent_011Ca1i5Lk4BaMSRTMCtdkjk', nom:'TAMATOA',  role:'Commercial', icon:'🤝', color:'#4A5FFF' },
    { id:'agent_hcs_picwish',              nom:'PicWish',  role:'Visuel',     icon:'🖼', color:'#8B5CF6' },
    { id:'agent_hcs_planning',             nom:'Planning', role:'Production', icon:'📅', color:'#F59E0B' },
    { id:'agent_hcs_marketing',            nom:'Marketing',role:'Marketing',  icon:'📡', color:'#EC4899' },
    { id:'agent_hcs_catalogue',            nom:'Catalogue',role:'Catalogue',  icon:'📦', color:'#0891B2' },
    { id:'agent_hcs_logo',                 nom:'Logo',     role:'Design',     icon:'🎨', color:'#F97316' },
    { id:'agent_hcs_finance',              nom:'Finance',  role:'Finance',    icon:'💰', color:'#16A34A' }
  ];

  /* ── CA 30 jours ── */
  const days30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days30.push({ date: d.toISOString().slice(0, 10), label: d.getDate() + '/' + (d.getMonth() + 1), ca: 0 });
  }
  (db.factures || []).filter(f => ['Payée','Payé'].includes(f.statut)).forEach(f => {
    const key  = (f.date || f._createdAt || '').slice(0, 10);
    const slot = days30.find(x => x.date === key);
    if (slot) slot.ca += (f.totalTTC || 0);
  });

  /* ── Activité récente ── */
  const allActivity = [
    ...(db.ecritures || []).map(e => ({ ...e, _type: 'ecriture' })),
    ...(db.factures  || []).map(f => ({ ...f, _type: 'facture'  })),
    ...(db.commandes || []).map(c => ({ ...c, _type: 'commande' }))
  ].sort((a, b) => new Date(b._updatedAt || b._createdAt || b.date || 0) - new Date(a._updatedAt || a._createdAt || a.date || 0)).slice(0, 5);

  /* ── Alertes ── */
  const alertsList = [];
  if (stockBas.length > 0)
    alertsList.push({ type:'warning', icon:'📦', msg:`${stockBas.length} produit(s) sous le seuil : ${stockBas.slice(0,2).map(p=>p.nom).join(', ')}${stockBas.length>2?'…':''}` });
  if (impayeesListe.length > 0)
    alertsList.push({ type:'error', icon:'🧾', msg:`${impayeesListe.length} facture(s) impayée(s) — ${fmt(montantImpayees)}` });
  const retard = (db.commandes || []).filter(c => ['Confirmé','En production'].includes(c.statut) && c.dateLivraison && new Date(c.dateLivraison) < now);
  if (retard.length > 0)
    alertsList.push({ type:'error', icon:'⏰', msg:`${retard.length} commande(s) en retard de livraison.` });

  /* ── Helpers HTML ── */
  const sTitle = (icon, label, sub, linkApp, linkLabel) =>
    `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:16px;">${icon}</span>
      <div style="flex:1;">
        <span style="font-size:14px;font-weight:700;">${label}</span>
        ${sub ? `<span style="font-size:11px;color:#6B7280;margin-left:8px;">${sub}</span>` : ''}
      </div>
      ${linkApp ? `<button class="btn btn-ghost btn-sm" onclick="openApp('${linkApp}')" style="font-size:11px;padding:2px 8px;">${linkLabel||'Voir →'}</button>` : ''}
    </div>`;

  const pill = (label, value, color) =>
    `<span style="padding:2px 8px;border-radius:12px;font-size:11px;background:${color}22;color:${color};font-weight:600;">${label}: ${value}</span>`;

  const agentMini = (agent) => {
    const hist    = agentsHistory[agent.id] || [];
    const lastMsg = hist.filter(m => m.role === 'assistant').slice(-1)[0];
    const preview = lastMsg ? escapeHtml(lastMsg.content.substring(0, 55)) + '…' : 'Aucune activité';
    const lastTs  = hist.length > 0 ? (hist[hist.length - 1].ts || '') : '';
    const active  = hist.length > 0;
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);cursor:pointer;"
      onclick="openApp('agents');setTimeout(()=>openView('chat'),80)">
      <div style="position:relative;flex-shrink:0;">
        <div style="width:30px;height:30px;border-radius:50%;background:${agent.color}22;display:flex;align-items:center;justify-content:center;font-size:14px;">${agent.icon}</div>
        <div style="position:absolute;bottom:0;right:0;width:8px;height:8px;border-radius:50%;background:${active?'#16A34A':'#6B7280'};border:2px solid var(--bg-primary,#1a0e07);"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:11px;font-weight:600;">${agent.nom} <span style="font-weight:400;color:#6B7280;">· ${agent.role}</span></div>
        <div style="font-size:10px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</div>
      </div>
      ${lastTs ? `<div style="font-size:10px;color:#6B7280;flex-shrink:0;">${fmtDateRelative(lastTs)}</div>` : ''}
    </div>`;
  };

  const objColor = objectifPct >= 80 ? '#16A34A' : objectifPct >= 50 ? '#D97706' : '#DC2626';

  /* ════════════════════════════════════════════════════════
     RENDU HTML PRINCIPAL
     ════════════════════════════════════════════════════════ */
  container.innerHTML = `

    <!-- En-tête + Raccourcis -->
    <div class="page-header">
      <div class="page-title">Bonjour, ${escapeHtml(session?.prenom || 'Utilisateur')} 👋</div>
      <div class="page-subtitle">Tableau de bord HCS · ${fmtDate(now)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button class="btn btn-primary btn-sm" onclick="openApp('ventes')">📄 Nouveau devis</button>
      <button class="btn btn-secondary btn-sm" onclick="openApp('ventes');setTimeout(()=>openView('orders'),60)">📦 Commande</button>
      <button class="btn btn-secondary btn-sm" onclick="openApp('ventes');setTimeout(()=>openView('contacts'),60)">👤 Contact</button>
      <button class="btn btn-secondary btn-sm" onclick="openApp('crm');setTimeout(()=>openView('pipeline'),60)">🎯 Pipeline</button>
      ${isAdmin ? `
        <button class="btn btn-secondary btn-sm" onclick="openApp('stock')">📋 Produit</button>
        <button class="btn btn-secondary btn-sm" onclick="openApp('production')">🏭 OF</button>
        <button class="btn btn-secondary btn-sm" onclick="openApp('caisse')">🛒 Caisse</button>
        <button class="btn btn-secondary btn-sm" onclick="openApp('comptabilite')">💰 Compta</button>
      ` : ''}
    </div>

    <!-- Alertes -->
    <div style="margin-bottom:16px;">
      ${alertsList.length === 0
        ? `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;background:rgba(22,163,74,0.1);border:1px solid rgba(22,163,74,0.25);border-radius:8px;color:#16A34A;font-size:13px;">✅ Tout est en ordre — aucune alerte.</div>`
        : alertsList.map(a => {
            const bg  = a.type==='error' ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)';
            const bdr = a.type==='error' ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.25)';
            const cl  = a.type==='error' ? '#DC2626' : '#D97706';
            return `<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;background:${bg};border:1px solid ${bdr};border-radius:8px;color:${cl};font-size:13px;margin-bottom:6px;">
              <span style="font-size:15px;">${a.icon}</span><span>${escapeHtml(a.msg)}</span></div>`;
          }).join('')}
    </div>

    <!-- ══════════════════════════════════════════
         SECTION 1 — FINANCE & BUDGET
         ══════════════════════════════════════════ -->
    <div style="margin-bottom:6px;">${sTitle('💰','Finance & Budget', moisLabel + ' · XPF', 'comptabilite', 'Comptabilité →')}</div>

    <!-- 6 KPIs Finance -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px;">
      <div id="dash-k1"></div>
      <div id="dash-k7"></div>
      <div id="dash-k-res"></div>
      <div id="dash-k-imp"></div>
      <div id="dash-k-dep"></div>
      <div id="dash-k-obj"></div>
    </div>

    <!-- Sparkline CA + Budget -->
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;margin-bottom:24px;">
      <div class="card">
        <div class="card-header">
          <div class="card-title">CA des 30 derniers jours</div>
          <div style="font-size:12px;color:#6B7280;">Factures payées · XPF</div>
        </div>
        <div style="padding:4px 16px 14px;">
          <div id="dash-sparkline" style="height:85px;"></div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF;margin-top:4px;">
            <span>${days30[0].label}</span><span>${days30[14].label}</span><span>${days30[29].label}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div class="card-title">Budget mensuel</div>
          <div style="font-size:12px;color:#6B7280;">Objectif vs Réalisé</div>
        </div>
        <div style="padding:0 16px 14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:12px;color:#6B7280;">Réalisé</span>
            <span style="font-size:13px;font-weight:700;color:#16A34A;">${fmt(caMois)}</span>
          </div>
          <div style="background:rgba(255,255,255,0.08);border-radius:6px;height:8px;overflow:hidden;margin-bottom:4px;">
            <div style="height:100%;width:${objectifPct}%;background:linear-gradient(90deg,${objColor},${objColor}88);border-radius:6px;transition:width 0.8s ease;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#6B7280;margin-bottom:14px;">
            <span>0</span>
            <span style="color:${objColor};font-weight:600;">${objectifPct}%</span>
            <span style="cursor:pointer;text-decoration:underline dotted;"
              onclick="var v=prompt('Objectif CA mensuel (XPF):','${objectifCA}');if(v&&!isNaN(v)){localStorage.setItem('hcs_objectif_ca',v);renderDashboard('overview',document.getElementById('view-content'));}">
              ${fmt(objectifCA)}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:12px;color:#6B7280;">Recettes</span>
              <span style="font-size:12px;font-weight:600;color:#16A34A;">+${fmt(caMois)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:12px;color:#6B7280;">Dépenses</span>
              <span style="font-size:12px;font-weight:600;color:#DC2626;">−${fmt(depensesMois)}</span>
            </div>
            <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
            <div style="display:flex;justify-content:space-between;">
              <span style="font-size:12px;font-weight:600;">Résultat net</span>
              <span style="font-size:13px;font-weight:700;color:${resultatNet>=0?'#16A34A':'#DC2626'};">${resultatNet>=0?'+':''}${fmt(resultatNet)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         SECTION 2 — PLANNING
         ══════════════════════════════════════════ -->
    <div style="margin-bottom:6px;">${sTitle('📅','Planning','Production · Achats · R&D')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px;">

      <!-- Production -->
      <div class="card">
        <div style="padding:12px 14px 0;">${sTitle('⚙️','Production',ofEnProd+' OF actifs','production','Atelier →')}</div>
        <div style="padding:0 14px 12px;">
          ${ofListe.length === 0
            ? `<div style="padding:12px;text-align:center;color:#6B7280;font-size:12px;">Aucun OF en cours</div>`
            : ofListe.map(of => {
                const sc = of.statut==='En cours'?'#16A34A': of.statut==='Prêt'?'#2563EB':'#D97706';
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <div style="width:7px;height:7px;border-radius:50%;background:${sc};flex-shrink:0;"></div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(of.ref||of.id||'—')}</div>
                    <div style="font-size:10px;color:#6B7280;">${escapeHtml(of.produit||of.client||'')}${of.datePrevue?' · '+fmtDate(of.datePrevue):''}</div>
                  </div>
                  <span style="font-size:9px;padding:1px 5px;border-radius:8px;background:${sc}22;color:${sc};flex-shrink:0;">${escapeHtml(of.statut)}</span>
                </div>`;
              }).join('')}
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:8px;">
            ${pill('En cours',(db.ordresFab||[]).filter(o=>o.statut==='En cours').length,'#16A34A')}
            ${pill('Planifié',(db.ordresFab||[]).filter(o=>o.statut==='Planifié').length,'#D97706')}
            ${pill('Prêt',(db.ordresFab||[]).filter(o=>o.statut==='Prêt').length,'#2563EB')}
          </div>
        </div>
      </div>

      <!-- Achats -->
      <div class="card">
        <div style="padding:12px 14px 0;">${sTitle('🛒','Achats',bonsAchat.length+' bons en attente','stock','Stock →')}</div>
        <div style="padding:0 14px 12px;">
          ${bonsAchat.length === 0
            ? `<div style="padding:8px 0;color:#6B7280;font-size:12px;text-align:center;">Aucun bon en attente</div>`
            : bonsAchat.map(b => `
              <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-size:13px;flex-shrink:0;">📄</span>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(b.reference||b.fournisseur||'—')}</div>
                  <div style="font-size:10px;color:#6B7280;">${escapeHtml(b.fournisseur||'')} · ${fmtDate(b.date)}</div>
                </div>
                <span style="font-size:10px;font-weight:600;color:#D97706;flex-shrink:0;">${fmt(b.totalTTC||0)}</span>
              </div>`).join('')}
          <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
            <div style="font-size:10px;font-weight:600;color:#6B7280;margin-bottom:4px;">⚠️ Stock critique</div>
            ${stockBas.length === 0
              ? `<div style="font-size:11px;color:#16A34A;">✅ Aucun produit critique</div>`
              : stockBas.map(p => `
                <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:10px;">
                  <span style="color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:110px;">${escapeHtml(p.nom)}</span>
                  <span style="color:#DC2626;font-weight:600;">${p.stock||0}/${p.stockMin||5}</span>
                </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- R&D / Devis -->
      <div class="card">
        <div style="padding:12px 14px 0;">${sTitle('🔬','R&D · Devis actifs',devisEnAttente+' en cours','ventes','Devis →')}</div>
        <div style="padding:0 14px 12px;">
          ${(db.devis||[]).filter(d=>['Brouillon','Envoyé','En attente'].includes(d.statut))
              .sort((a,b)=>new Date(b._updatedAt||0)-new Date(a._updatedAt||0)).slice(0,5)
              .map(d => {
                const sc = d.statut==='Envoyé'?'#2563EB':'#D97706';
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <div style="width:7px;height:7px;border-radius:50%;background:${sc};flex-shrink:0;"></div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(d.client||d.ref||'—')}</div>
                    <div style="font-size:10px;color:#6B7280;">${escapeHtml(d.ref||'')} · ${fmtDate(d.date||d._createdAt)}</div>
                  </div>
                  <span style="font-size:10px;font-weight:600;color:${sc};flex-shrink:0;">${fmt(d.totalTTC||0)}</span>
                </div>`;
              }).join('') || `<div style="padding:12px;text-align:center;color:#6B7280;font-size:12px;">Aucun devis actif</div>`}
          <div style="display:flex;gap:4px;margin-top:8px;">
            ${pill('Brouillon',(db.devis||[]).filter(d=>d.statut==='Brouillon').length,'#6B7280')}
            ${pill('Envoyé',(db.devis||[]).filter(d=>d.statut==='Envoyé').length,'#2563EB')}
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         SECTION 3 — PIPELINE CRM
         ══════════════════════════════════════════ -->
    <div style="margin-bottom:6px;">${sTitle('🎯','Pipeline CRM',pipeline+' opportunités actives · '+fmt(pipelineTotal)+' total','crm','Pipeline →')}</div>
    <div class="card" style="margin-bottom:24px;">
      <div style="padding:14px 16px;">
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px;">
          ${STAGES_CRM.map(s => {
            const data  = oppsByStade[s] || { count:0, montant:0 };
            const color = STAGE_COLORS[s];
            return `<div style="text-align:center;padding:10px 6px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid ${color}30;cursor:pointer;"
              onclick="openApp('crm');setTimeout(()=>openView('pipeline'),80)">
              <div style="font-size:22px;font-weight:800;color:${color};">${data.count}</div>
              <div style="font-size:11px;font-weight:600;margin:2px 0;">${s}</div>
              <div style="font-size:10px;color:#6B7280;">${data.montant>0?fmt(data.montant):'—'}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="font-size:11px;font-weight:600;color:#6B7280;margin-bottom:6px;">Top opportunités</div>
        ${topOpps.length === 0
          ? `<div style="padding:12px;text-align:center;color:#6B7280;font-size:12px;">Aucune opportunité active</div>`
          : topOpps.map(o => {
              const color = STAGE_COLORS[o.stade] || '#6B7280';
              const prob  = o.probabilite || 0;
              return `<div style="display:flex;align-items:center;gap:10px;padding:7px 8px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:4px;cursor:pointer;"
                onclick="openApp('crm');setTimeout(()=>openView('pipeline'),80)">
                <div style="width:9px;height:9px;border-radius:50%;background:${color};flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:600;">${escapeHtml(o.nom||'—')}</div>
                  <div style="font-size:10px;color:#6B7280;">${escapeHtml(o.stade)} · prob. ${prob}%</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-size:11px;font-weight:700;color:${color};">${fmt(o.montant||0)}</div>
                  <div style="width:56px;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;margin-top:3px;">
                    <div style="height:100%;width:${prob}%;background:${color};border-radius:2px;"></div>
                  </div>
                </div>
              </div>`;
            }).join('')}
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         SECTION 4 — MARKETING & AGENTS IA
         ══════════════════════════════════════════ -->
    <div style="margin-bottom:6px;">${sTitle('📡','Marketing & Agents IA','Actions · Planning · Feedback')}</div>
    <div style="display:grid;grid-template-columns:2fr 3fr;gap:14px;margin-bottom:24px;">

      <!-- Marketing -->
      <div class="card">
        <div style="padding:12px 14px 0;">${sTitle('📣','Actions marketing','','outils','Andromeda →')}</div>
        <div style="padding:0 14px 12px;">
          <div style="font-size:10px;font-weight:600;color:#6B7280;margin-bottom:6px;">CAMPAGNES & ACTIONS</div>
          <div id="dash-mkt-actions"></div>
          <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;">
            <div style="font-size:10px;font-weight:600;color:#6B7280;margin-bottom:4px;">AJOUTER UNE ACTION</div>
            <div style="display:flex;gap:6px;">
              <input id="new-mkt-input" type="text" placeholder="Nouvelle action marketing…"
                style="flex:1;padding:5px 8px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;font-size:11px;background:transparent;color:inherit;outline:none;"
                onkeydown="if(event.key==='Enter'){var v=this.value.trim();if(v){var m=JSON.parse(localStorage.getItem('hcs_mkt_actions')||'[]');m.unshift({text:v,date:new Date().toISOString()});localStorage.setItem('hcs_mkt_actions',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));}}" />
              <button onclick="var v=document.getElementById('new-mkt-input')?.value?.trim();if(v){var m=JSON.parse(localStorage.getItem('hcs_mkt_actions')||'[]');m.unshift({text:v,date:new Date().toISOString()});localStorage.setItem('hcs_mkt_actions',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));}"
                style="padding:5px 10px;background:var(--caramel,#c4813a);color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;flex-shrink:0;">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Agents IA -->
      <div class="card">
        <div style="padding:12px 14px 0;">${sTitle('🤖','Agents IA',AGENTS_DASH.length+' agents configurés','agents','Agents →')}</div>
        <div style="padding:0 14px 12px;display:grid;grid-template-columns:1fr 1fr;gap:5px;">
          ${AGENTS_DASH.map(a => agentMini(a)).join('')}
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         BOTTOM — Activité + Mémos
         ══════════════════════════════════════════ -->
    <div style="display:grid;grid-template-columns:3fr 2fr;gap:14px;">
      <div class="card">
        <div class="card-header"><div class="card-title">Activité récente</div></div>
        <div style="padding:0 16px 14px;" id="dash-activities"></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">📝 Mémos rapides</div></div>
        <div id="dash-memos" style="padding:0 4px 4px;"></div>
      </div>
    </div>
  `;

  /* ── Post-render : KPIs Finance ── */
  statCard('dash-k1',    { icon:'💰', value:caMois,          label:'CA du mois',    color:'#16A34A', format:true, sub:'Factures payées · '+moisLabel });
  statCard('dash-k7',    { icon:'🏦', value:tresorerie,      label:'Trésorerie',    color:'#0891B2', format:true, sub:'Banque + Caisse' });
  statCard('dash-k-res', { icon:resultatNet>=0?'📈':'📉', value:Math.abs(resultatNet), label:'Résultat net', color:resultatNet>=0?'#16A34A':'#DC2626', format:true, sub:resultatNet>=0?'Bénéfice':'Perte' });
  statCard('dash-k-imp', { icon:'🧾', value:montantImpayees, label:'Impayées',      color:facturesImpayees>0?'#DC2626':'#6B7280', format:true, sub:facturesImpayees+' facture(s)' });
  statCard('dash-k-dep', { icon:'💸', value:depensesMois,    label:'Dépenses mois', color:'#D97706', format:true, sub:'Comptes charges' });
  statCard('dash-k-obj', { icon:'🎯', value:objectifPct,     label:'Objectif CA',   color:objColor, sub:'% atteint ce mois' });

  /* ── Sparkline ── */
  sparkline('dash-sparkline', { values: days30.map(d => d.ca), color:'#16A34A', height:80 });

  /* ── Activité récente ── */
  document.getElementById('dash-activities').innerHTML = _dashActivities(allActivity);

  /* ── Actions marketing ── */
  (function() {
    const el = document.getElementById('dash-mkt-actions');
    if (!el) return;
    const actions = JSON.parse(localStorage.getItem('hcs_mkt_actions') || '[]');
    if (actions.length === 0) {
      el.innerHTML = `<div style="font-size:11px;color:#6B7280;padding:4px 0;">Aucune action enregistrée — ajoutez une action ci-dessous.</div>`;
      return;
    }
    el.innerHTML = actions.slice(0, 5).map((a, i) => `
      <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:13px;flex-shrink:0;">📣</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:11px;line-height:1.4;">${escapeHtml(a.text)}</div>
          <div style="font-size:10px;color:#6B7280;">${fmtDateRelative(a.date)}</div>
        </div>
        <button onclick="event.stopPropagation();var m=JSON.parse(localStorage.getItem('hcs_mkt_actions')||'[]');m.splice(${i},1);localStorage.setItem('hcs_mkt_actions',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));"
          style="background:none;border:none;cursor:pointer;color:#6B7280;font-size:12px;padding:0;flex-shrink:0;">✕</button>
      </div>`).join('');
  })();

  /* ── Mémos rapides ── */
  (function() {
    const el = document.getElementById('dash-memos');
    if (!el) return;
    const memos = JSON.parse(localStorage.getItem('hcs_memos') || '[]');
    el.innerHTML = `<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px 8px;">
      ${memos.slice(0, 4).map((m, i) => `
        <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;background:rgba(196,129,58,0.08);border-radius:6px;border:1px solid rgba(196,129,58,0.2);">
          <span style="font-size:11px;flex:1;line-height:1.4;">${escapeHtml(m.text)}</span>
          <button onclick="event.stopPropagation();var m=JSON.parse(localStorage.getItem('hcs_memos')||'[]');m.splice(${i},1);localStorage.setItem('hcs_memos',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));"
            style="background:none;border:none;cursor:pointer;color:#c4813a;font-size:12px;padding:0;flex-shrink:0;">✕</button>
        </div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:4px;">
        <input id="new-memo-input" type="text" placeholder="Nouvelle note…"
          style="flex:1;padding:5px 8px;border:1px solid rgba(255,255,255,0.12);border-radius:6px;font-size:11px;background:transparent;color:inherit;outline:none;"
          onkeydown="if(event.key==='Enter'){var v=this.value.trim();if(v){var m=JSON.parse(localStorage.getItem('hcs_memos')||'[]');m.unshift({text:v,date:new Date().toISOString()});localStorage.setItem('hcs_memos',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));}}" />
        <button onclick="var v=document.getElementById('new-memo-input')?.value?.trim();if(v){var m=JSON.parse(localStorage.getItem('hcs_memos')||'[]');m.unshift({text:v,date:new Date().toISOString()});localStorage.setItem('hcs_memos',JSON.stringify(m));renderDashboard('overview',document.getElementById('view-content'));}"
          style="padding:5px 10px;background:var(--caramel,#c4813a);color:#fff;border:none;border-radius:6px;font-size:11px;cursor:pointer;flex-shrink:0;">+</button>
      </div>
    </div>`;
  })();
}

/** Génère le HTML des dernières activités pour le dashboard */
function _dashActivities(items) {
  if (!items || items.length === 0) {
    return `<div style="padding:20px;text-align:center;color:#9CA3AF;font-size:14px;">Aucune activité récente</div>`;
  }
  const icons = { ecriture: '📒', facture: '🧾', commande: '📦' };
  return items.map(item => {
    const icon   = icons[item._type] || '📌';
    const label  = item.libelle || item.ref || item.numero || item.id || '—';
    const sub    = item.client || (item.compte ? 'Compte ' + item.compte : '');
    const amount = item._type === 'ecriture'
      ? Math.max(Number(item.debit) || 0, Number(item.credit) || 0)
      : (item.totalTTC || 0);
    const date   = item._updatedAt || item._createdAt || item.date || '';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #F3F4F6;">
        <span style="font-size:18px;flex-shrink:0;">${icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(label))}</div>
          ${sub ? `<div style="font-size:11px;color:#6B7280;">${escapeHtml(String(sub))}</div>` : ''}
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${amount > 0 ? `<div style="font-size:12px;font-weight:700;color:#059669;">${fmt(amount)}</div>` : ''}
          <div style="font-size:11px;color:#9CA3AF;">${fmtDateRelative(date)}</div>
        </div>
      </div>`;
  }).join('');
}

/* ---- CRM — délégué à js/modules/crm.js ---- */
// Les fonctions CRM (pipeline, contacts, entreprises) sont dans CRM.init()

/* ---- VENTES — délégué à js/modules/sales.js ---- */
// Les fonctions Ventes (quotes, orders, invoices, rapport) sont dans Sales.init()

/* ---- ACHATS — délégué à js/modules/purchases.js ---- */
// Les fonctions Achats (suppliers, po, purchase-report) sont dans Purchases.init()

/* ---- STOCK — délégué à js/modules/inventory.js ---- */
// Les fonctions Stock (products, categories, stock-moves, stock-report) sont dans Inventory.init()

/* ---- PRODUCTION — délégué à js/modules/manufacturing.js ---- */
// Les fonctions Production (mo, bom, work-centers) sont dans Manufacturing.init()

/* ---- COMPTABILITÉ — délégué à js/modules/accounting.js ---- */
// Les fonctions Comptabilité (journal, accounts, pl-report, balance, tax-report)
// sont dans Accounting.init()

/* ---- IFRAME GÉNÉRIQUE — utilisé par Caisse et Outils HCS ---- */
/**
 * Charge un fichier HTML dans un iframe plein écran dans la zone de contenu.
 * @param {string} src - Chemin relatif vers le fichier HTML (ex: 'modules/caisse-pos.html')
 * @param {HTMLElement} container - Zone de rendu (#view-content)
 */
function renderIframe(src, container) {
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  /* Masquer la toolbar ERP — le module plein écran a sa propre UI */
  const _tb = document.getElementById('toolbar');
  if (_tb) _tb.style.display = 'none';
  container.innerHTML = `
    <iframe
      src="${src}"
      style="width:100%; height:calc(100vh - 60px); border:none; display:block;"
      allow="clipboard-read; clipboard-write"
    ></iframe>
  `;
}

/* ---- RH ---- */
function renderRH(view, container) {
  if (typeof RH !== 'undefined' && typeof RH.init === 'function') {
    RH.init(view, container);
  } else {
    container.innerHTML = `
      <div class="table-empty">
        <div class="empty-icon">👤</div>
        <p>Module RH — chargement…</p>
      </div>`;
  }
}

/* ---- FIDÉLITÉ — Envoyer un lien magique au client ---- */
async function renderSendLink(container) {
  const ERP_API_LOCAL = 'https://highcoffeeshirts.com/erp/api';
  const CLIENT_PORTAL_LOCAL = 'https://highcoffeeshirts.com/erp/apps/compte-client.html';

  container.innerHTML = `
    <div style="max-width:520px;margin:40px auto;padding:0 16px">
      <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:6px">📧 Envoyer un lien d'accès client</h2>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:24px">
        Génère un lien magique et l'envoie par email au client. Il peut consulter ses points fidélité et définir son mot de passe.
      </p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="display:block;font-size:.82rem;color:var(--text-muted);margin-bottom:5px">Email du client *</label>
          <input id="sl-email" type="email" placeholder="client@mail.com"
            style="width:100%;box-sizing:border-box;padding:10px 12px;background:var(--input-bg,#1e1e2e);border:1px solid var(--border,#333);border-radius:8px;color:var(--text-primary,#fff);font-size:.9rem">
        </div>
        <div>
          <label style="display:block;font-size:.82rem;color:var(--text-muted);margin-bottom:5px">Nom du client (optionnel)</label>
          <input id="sl-name" type="text" placeholder="Prénom Nom"
            style="width:100%;box-sizing:border-box;padding:10px 12px;background:var(--input-bg,#1e1e2e);border:1px solid var(--border,#333);border-radius:8px;color:var(--text-primary,#fff);font-size:.9rem">
        </div>
        <button id="sl-btn" onclick="window._sendMagicLink()"
          style="padding:12px;background:var(--caramel,#c4813a);color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:.9rem">
          Envoyer le lien magique
        </button>
        <div id="sl-result" style="display:none;padding:12px 14px;border-radius:8px;font-size:.85rem"></div>
      </div>
    </div>`;

  window._sendMagicLink = async function() {
    const email = document.getElementById('sl-email')?.value.trim();
    const name  = document.getElementById('sl-name')?.value.trim();
    const btn   = document.getElementById('sl-btn');
    const res   = document.getElementById('sl-result');
    if (!email || !email.includes('@')) { alert('Email invalide.'); return; }

    btn.disabled = true;
    btn.textContent = 'Envoi en cours…';
    res.style.display = 'none';

    try {
      /* 1. Générer le token */
      const r1 = await fetch(`${ERP_API_LOCAL}/compte_client`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action: 'request_link', email, name: name || undefined })
      });
      const d1 = await r1.json();
      if (!d1.token) throw new Error(d1.error || 'Génération token échouée');
      const magicUrl = `${CLIENT_PORTAL_LOCAL}?token=${d1.token}`;

      /* 2. Envoyer l'email */
      const clientName = name || d1.name || email.split('@')[0];
      const emailHtml = `
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;font-size:14px;color:#222">
  <tr><td style="background:#c4813a;padding:20px 28px;border-radius:8px 8px 0 0">
    <strong style="color:#fff;font-size:20px">High Coffee Shirt</strong>
    <span style="display:block;color:rgba(255,255,255,.8);font-size:12px">Papeete, Polynésie française</span>
  </td></tr>
  <tr><td style="padding:24px 28px;background:#fff">
    <p style="font-size:17px;font-weight:700;margin:0 0 8px">🔗 Accédez à votre espace fidélité</p>
    <p style="color:#444;margin:0 0 20px">Bonjour <strong>${clientName}</strong>,<br>
    Retrouvez vos points fidélité, votre historique d'achats et vos avantages HCS en un clic :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr><td style="background:#1a6ee0;border-radius:8px;text-align:center;padding:14px">
        <a href="${magicUrl}" style="color:#fff;font-weight:700;font-size:14px;text-decoration:none">🔗 Accéder à mon espace client HCS →</a>
      </td></tr>
    </table>
    <p style="color:#888;font-size:12px;margin:0 0 16px">Ce lien est valable <strong>24 heures</strong>. Vous pouvez définir un mot de passe pour vous connecter à tout moment.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border:1px solid #f0a030;border-radius:8px;font-size:13px">
      <tr><td style="padding:12px 16px;font-weight:700;color:#8a6200">⭐ Programme Fidélité HCS</td></tr>
      <tr><td style="padding:0 16px 12px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;color:#555">🥉 Rookie</td><td style="text-align:right;color:#555">0 XPF — 1 pt/100 XPF</td></tr>
          <tr><td style="padding:4px 0;color:#4facfe">🥈 Regular</td><td style="text-align:right;color:#4facfe">50 000 XPF — 1,2 pt/100 XPF</td></tr>
          <tr><td style="padding:4px 0;color:#a78bfa">🥇 Pro</td><td style="text-align:right;color:#a78bfa">150 000 XPF — 1,5 pt/100 XPF</td></tr>
          <tr><td style="padding:4px 0;color:#f6a800">🏆 Ambassadeur</td><td style="text-align:right;color:#f6a800">300 000 XPF — 2 pt/100 XPF</td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f5f5f5;padding:14px 28px;border-radius:0 0 8px 8px;font-size:12px;color:#888;text-align:center">
    High Coffee Shirt · Papeete, Tahiti · highcoffeeshirt@gmail.com
  </td></tr>
</table>`;

      const r2 = await fetch('https://highcoffeeshirts.com/erp/api/send_email.php', {
        method: 'POST', headers: {'Content-Type':'application/json','x-api-key': localStorage.getItem('hcs_api_key') || 'hcs-erp-2026'},
        body: JSON.stringify({
          to: email,
          subject: '🔗 Votre espace client High Coffee Shirt',
          bodyHtml: emailHtml,
          body: ' ',
          fromName: 'High Coffee Shirt'
        })
      });
      const d2 = await r2.json();
      if (!d2.success) throw new Error(d2.error || 'Envoi email échoué');

      res.style.display = 'block';
      res.style.background = 'rgba(34,197,94,.1)';
      res.style.border = '1px solid rgba(34,197,94,.3)';
      res.style.color = '#22c55e';
      res.innerHTML = `✅ Lien envoyé à <strong>${email}</strong>`;
    } catch(err) {
      res.style.display = 'block';
      res.style.background = 'rgba(239,68,68,.1)';
      res.style.border = '1px solid rgba(239,68,68,.3)';
      res.style.color = '#ef4444';
      res.innerHTML = `❌ Erreur : ${err.message}`;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Envoyer le lien magique';
    }
  };
}

/* ---- MESSAGERIE — délégué à js/modules/discuss.js ---- */
// Les fonctions Discussion (inbox, general, production, ventes) sont dans Discuss.init()

/* ================================================================
   FONCTIONS UTILITAIRES DE RENDU
   ================================================================ */

/* Badge de statut selon la valeur */
function badgeStatut(statut, context) {
  const map = {
    'Brouillon':    'badge-brouillon',
    'Confirmé':     'badge-confirme',
    'En cours':     'badge-en-cours',
    'Terminé':      'badge-termine',
    'Livré':        'badge-livre',
    'Annulé':       'badge-annule',
    'Payé':         'badge-paye',
    'En attente':   'badge-en-attente',
    // CRM
    'Nouveau':      'badge-gray',
    'Qualifié':     'badge-blue',
    'Proposition':  'badge-orange',
    'Négociation':  'badge-violet',
    'Gagné':        'badge-green',
    'Perdu':        'badge-red'
  };
  const cls = map[statut] || 'badge-gray';
  return `<span class="badge ${cls}">${statut || '—'}</span>`;
}

/* Initiales pour les avatars */
function initiales(nom) {
  if (!nom) return '?';
  return nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

/* Échapper le HTML dans les messages */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Stubs pour les formulaires (à enrichir) */
function newOpportunite() { openModal('<div class="modal-title">Nouvelle opportunité</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newContact()     { openModal('<div class="modal-title">Nouveau contact</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newDevis()       { openModal('<div class="modal-title">Nouveau devis</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newCommande()    { openModal('<div class="modal-title">Nouvelle commande</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newFacture()     { openModal('<div class="modal-title">Nouvelle facture</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newProduit()     { openModal('<div class="modal-title">Nouveau produit</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newBonAchat()    { openModal('<div class="modal-title">Nouveau bon d\'achat</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newAjustement()  { openModal('<div class="modal-title">Ajustement de stock</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newOrdre()       { openModal('<div class="modal-title">Nouvel ordre de fabrication</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function newEcriture()    { openModal('<div class="modal-title">Nouvelle écriture</div><p style="color:var(--text-secondary)">Formulaire à venir.</p>'); }
function openOpp(id)      { openModal(`<div class="modal-title">Opportunité #${id}</div><p style="color:var(--text-secondary)">Fiche détail à venir.</p>`); }

/* ================================================================
   MENU ADMIN (⚙️) — accessible uniquement aux admins depuis la topbar
   ================================================================ */

/**
 * Ouvre la modale d'administration (export / import / reset).
 */
function openAdminModal() {
  openModal(`
    <div class="modal-title">⚙️ Administration HCS ERP</div>
    <div style="display:flex;flex-direction:column;gap:20px;margin-top:20px;">

      <div>
        <div style="font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;
                    letter-spacing:.08em;margin-bottom:10px;">Base de données</div>
        <div style="display:flex;flex-direction:column;gap:8px;">

          <button class="btn btn-secondary" style="justify-content:flex-start;gap:10px;"
            onclick="Store.exportJSON();closeModal();">
            📥 <span>Exporter toute la base (JSON)</span>
          </button>

          <label class="btn btn-secondary"
            style="justify-content:flex-start;gap:10px;cursor:pointer;">
            📤 <span>Importer une base (JSON)</span>
            <input type="file" accept=".json" id="admin-import-file"
              style="display:none;" />
          </label>

          <button class="btn btn-secondary"
            style="justify-content:flex-start;gap:10px;color:#DC2626;border-color:#FCA5A5;"
            onclick="confirmResetDB()">
            🗑️ <span>Réinitialiser les données (seed)</span>
          </button>
        </div>
      </div>

      <div style="font-size:12px;color:#6B7280;background:#F9FAFB;
                  border-radius:8px;padding:12px;line-height:1.8;">
        <strong>Version :</strong> HCS ERP v1.0.0<br>
        <strong>Comptes :</strong> admin / yannick (admin) · vendeur (vendeur)<br>
        <strong>Stockage :</strong> localStorage du navigateur
      </div>
    </div>
  `);

  /* Liaison du champ file après l'injection dans le DOM */
  setTimeout(() => {
    const fileInput = document.getElementById('admin-import-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        Store.importJSON(file)
          .then(() => {
            toast('Base importée avec succès. Rechargement en cours…', 'success');
            closeModal();
            setTimeout(() => location.reload(), 1500);
          })
          .catch(err => toast('Erreur import : ' + err.message, 'error'));
      });
    }
  }, 100);
}

/** Confirmation avant réinitialisation des données. */
function confirmResetDB() {
  if (confirm('⚠️ ATTENTION\n\nRéinitialiser toutes les données avec le seed initial ?\nCette action est irréversible.')) {
    Store.reset();
    closeModal();
    toast('Données réinitialisées. Rechargement…', 'success');
    setTimeout(() => location.reload(), 1500);
  }
}

/* ================================================================
   RECHERCHE GLOBALE (Ctrl+K)
   Cherche dans : contacts, produits, devis, commandes, factures
   ================================================================ */

/** Active le raccourci Ctrl+K pour ouvrir la recherche globale. */
function initGlobalSearch() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      /* Déléguer à la Command Palette si disponible */
      if (typeof CommandPalette !== 'undefined') {
        CommandPalette.open();
      } else {
        openSearchModal();
      }
    }
    /* Ctrl+N = nouveau devis */
    if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey) {
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        openApp('ventes');
        setTimeout(() => openView('quotes'), 60);
      }
    }
  });
}

/** Ouvre (ou réaffiche) la modale de recherche globale. */
function openSearchModal() {
  let overlay = document.getElementById('global-search-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-search-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9000;
      background:rgba(0,0,0,0.5);
      display:flex; align-items:flex-start; justify-content:center;
      padding-top:10vh;
    `;
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeSearchModal();
    });
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="
      background:#fff; border-radius:14px; width:640px; max-height:72vh;
      display:flex; flex-direction:column; overflow:hidden;
      box-shadow:0 24px 80px rgba(0,0,0,0.35);
    ">
      <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid #E5E7EB;">
        <span style="font-size:20px;color:#6B7280;">🔍</span>
        <input type="text" id="global-search-input"
          placeholder="Rechercher contacts, produits, devis, commandes, factures…"
          style="flex:1;border:none;outline:none;font-size:16px;background:transparent;color:#111827;"
          autofocus />
        <kbd style="font-size:11px;color:#9CA3AF;background:#F3F4F6;padding:3px 8px;
                    border-radius:4px;white-space:nowrap;">Échap</kbd>
      </div>
      <div id="global-search-results" style="overflow-y:auto;flex:1;min-height:80px;"></div>
    </div>
  `;
  overlay.style.display = 'flex';

  const input = document.getElementById('global-search-input');
  if (input) {
    input.addEventListener('input', debounce(e => _performGlobalSearch(e.target.value), 180));
    input.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearchModal(); });
    _performGlobalSearch(''); // état initial
  }
}

/** Ferme la modale de recherche globale. */
function closeSearchModal() {
  const overlay = document.getElementById('global-search-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Effectue la recherche et affiche les résultats groupés par type.
 * @param {string} query
 */
function _performGlobalSearch(query) {
  const resultsEl = document.getElementById('global-search-results');
  if (!resultsEl) return;

  const q = (query || '').toLowerCase().trim();
  if (!q) {
    resultsEl.innerHTML = `
      <div style="padding:28px;text-align:center;color:#9CA3AF;font-size:14px;">
        Commencez à taper pour chercher dans toute la base…
      </div>`;
    return;
  }

  const db = Store.getDB();

  /* Collections à fouiller */
  const COLS = [
    { key: 'contacts',  label: 'Contacts',  icon: '👤', fields: ['nom','email','telephone'], app: 'ventes', view: 'contacts' },
    { key: 'produits',  label: 'Produits',  icon: '📦', fields: ['nom','sku','categorie'],   app: 'stock', view: 'products' },
    { key: 'devis',     label: 'Devis',     icon: '📄', fields: ['ref','client','numero'],   app: 'ventes',view: 'quotes'   },
    { key: 'commandes', label: 'Commandes', icon: '📋', fields: ['ref','client','numero'],   app: 'ventes',view: 'orders'   },
    { key: 'factures',  label: 'Factures',  icon: '🧾', fields: ['ref','client','numero'],   app: 'ventes',view: 'invoices' },
  ];

  let html  = '';
  let found = 0;

  COLS.forEach(col => {
    const matches = (db[col.key] || [])
      .filter(item => col.fields.some(f => String(item[f] || '').toLowerCase().includes(q)))
      .slice(0, 4);

    if (!matches.length) return;
    found += matches.length;

    html += `
      <div style="padding:8px 20px 4px;font-size:11px;font-weight:700;color:#6B7280;
                  text-transform:uppercase;letter-spacing:.08em;">
        ${col.icon} ${col.label}
      </div>`;

    matches.forEach(item => {
      const primary   = item[col.fields[0]] || item.id || '—';
      const secondary = item[col.fields[1]] || item[col.fields[2]] || '';
      html += `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 20px;
                    cursor:pointer;transition:background .1s;"
          onmouseenter="this.style.background='#F3F4F6'"
          onmouseleave="this.style.background=''"
          onclick="closeSearchModal();openApp('${col.app}');setTimeout(()=>openView('${col.view}'),60);">
          <span style="font-size:22px;">${col.icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:#111827;
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${escapeHtml(String(primary))}
            </div>
            ${secondary
              ? `<div style="font-size:12px;color:#6B7280;">${escapeHtml(String(secondary))}</div>`
              : ''}
          </div>
          <span style="font-size:14px;color:#D1D5DB;">→</span>
        </div>`;
    });
  });

  if (!found) {
    html = `
      <div style="padding:28px;text-align:center;color:#9CA3AF;font-size:14px;">
        Aucun résultat pour
        <strong style="color:#6B7280;">"${escapeHtml(query)}"</strong>
      </div>`;
  }
  resultsEl.innerHTML = html;
}

/* ================================================================
   POINT D'ENTRÉE — appelé par auth.js après connexion
   ================================================================ */
// Exposé globalement pour être appelé depuis auth.js
window.initApp = initApp;
