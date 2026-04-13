/* ================================================================
   HCS ERP — js/modules/rh.js
   Module Ressources Humaines : Employés, Congés, Planning hebdomadaire
   Exporté via window.RH — initialisé par app.js via RH.init()
   ================================================================ */

'use strict';

const RH = (() => {

  /* ----------------------------------------------------------------
     CONSTANTES MÉTIER
     ---------------------------------------------------------------- */

  const POSTES = [
    'Directeur', 'Gérant', 'Commercial', 'Technicien DTF',
    'Technicien Broderie', 'Graphiste', 'Caissier', 'Livreur', 'Stagiaire', 'Autre'
  ];

  const DEPARTEMENTS = [
    'Direction', 'Production', 'Commercial', 'Comptabilité', 'Logistique', 'Autre'
  ];

  const STATUTS_EMP = ['Actif', 'En congé', 'Inactif'];

  const TYPES_CONGE = [
    'Congé annuel', 'Maladie', 'Sans solde',
    'Maternité / Paternité', 'Événement familial', 'Formation', 'Récupération'
  ];

  const STATUTS_CONGE = ['En attente', 'Approuvé', 'Refusé'];

  /* ----------------------------------------------------------------
     UTILITAIRES INTERNES
     ---------------------------------------------------------------- */

  /* Délègue à escapeHtml() de utils.js pour la sécurité DOM */
  function _esc(str) {
    return escapeHtml(str == null ? '' : String(str));
  }

  /* Délègue à fmt() de utils.js pour les montants XPF */
  function _fmt(n) {
    return typeof fmt === 'function' ? fmt(n || 0) : (n || 0).toLocaleString('fr-FR') + ' XPF';
  }

  /* Délègue à fmtDate() de utils.js pour les dates */
  function _fmtD(d) {
    return typeof fmtDate === 'function' ? fmtDate(d) : (d ? String(d).slice(0, 10) : '—');
  }

  /* Calcule le nombre de jours calendaires entre deux dates (inclus) */
  function _nbJours(debut, fin) {
    if (!debut || !fin) return 0;
    const ms = new Date(fin) - new Date(debut);
    if (ms < 0) return 0;
    return Math.floor(ms / 86400000) + 1;
  }

  /* Génère une couleur déterministe à partir du nom (pour les avatars) */
  function _avatarColor(nom) {
    const palette = ['#4a5fff', '#00d4aa', '#ffc857', '#b07bff', '#ff6b6b'];
    let h = 0;
    for (let i = 0; i < (nom || '').length; i++) {
      h = nom.charCodeAt(i) + ((h << 5) - h);
    }
    return palette[Math.abs(h) % palette.length];
  }

  /* Initiales d'un nom (max 2 caractères) */
  function _initiales(nom) {
    if (!nom) return '?';
    return nom.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  /* Retourne le nom d'un employé à partir de son id */
  function _empNom(empId) {
    const e = Store.getById('employes', empId);
    return e ? e.nom : (empId || '—');
  }

  /* Badge coloré pour le statut d'un employé */
  function _badgeEmp(statut) {
    const map = { 'Actif': 'badge-green', 'En congé': 'badge-orange', 'Inactif': 'badge-gray' };
    return `<span class="badge ${map[statut] || 'badge-gray'}">${_esc(statut)}</span>`;
  }

  /* Badge coloré pour le statut d'un congé */
  function _badgeConge(statut) {
    const map = { 'En attente': 'badge-orange', 'Approuvé': 'badge-green', 'Refusé': 'badge-red' };
    return `<span class="badge ${map[statut] || 'badge-gray'}">${_esc(statut)}</span>`;
  }

  /* ================================================================
     VUE EMPLOYÉS
     Liste + formulaire création / modification
     ================================================================ */

  let _empSearch = ''; // état de la recherche texte

  function _renderEmployes(toolbar, area) {
    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="rh-btn-new-emp">+ Nouvel employé</button>`;

    document.getElementById('rh-btn-new-emp')
      ?.addEventListener('click', () => _openEmpModal(null, toolbar, area));

    _drawEmployesList(toolbar, area);
  }

  /* Rendu de la liste (rappelé à chaque filtre ou CRUD) */
  function _drawEmployesList(toolbar, area) {
    const tous = Store.getAll('employes');
    const q    = _empSearch.toLowerCase();

    /* Filtrage textuel sur nom, poste, département */
    const filtered = tous.filter(e =>
      !q
      || (e.nom         || '').toLowerCase().includes(q)
      || (e.poste       || '').toLowerCase().includes(q)
      || (e.departement || '').toLowerCase().includes(q)
    );

    /* KPIs calculés à la volée */
    const actifs   = tous.filter(e => e.statut === 'Actif').length;
    const enConge  = tous.filter(e => e.statut === 'En congé').length;
    const masseSal = tous
      .filter(e => e.statut !== 'Inactif')
      .reduce((s, e) => s + (e.salaire || 0), 0);

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Employés
          <span style="font-size:0.65em;color:var(--text-muted);font-weight:400;margin-left:6px;">
            ${filtered.length} / ${tous.length}
          </span>
        </div>
      </div>

      <!-- KPIs résumés -->
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">
        <div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:1.4em;">👥</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-green);font-family:monospace;">${actifs}</div>
          <div style="font-size:0.72em;color:var(--text-muted);">Employés actifs</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:1.4em;">🏖️</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-orange);font-family:monospace;">${enConge}</div>
          <div style="font-size:0.72em;color:var(--text-muted);">En congé</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:1.4em;">💰</div>
          <div style="font-size:0.95em;font-weight:700;color:var(--accent-blue);font-family:monospace;">${_fmt(masseSal)}</div>
          <div style="font-size:0.72em;color:var(--text-muted);">Masse salariale</div>
        </div>
      </div>

      <!-- Barre de recherche -->
      <div style="position:relative;max-width:300px;margin-bottom:16px;">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                     color:var(--text-muted);font-size:13px;pointer-events:none;">🔍</span>
        <input type="text" id="rh-emp-search"
          placeholder="Nom, poste, département…"
          class="form-control"
          style="height:34px;padding-left:32px;font-size:13px;"
          value="${_esc(_empSearch)}" />
      </div>

      ${filtered.length === 0
        ? `<div class="table-empty">
             <div class="empty-icon">👥</div>
             <p>Aucun employé trouvé.</p>
           </div>`
        : `<div class="card" style="overflow:auto;">
             <table class="table">
               <thead>
                 <tr>
                   <th>Nom</th>
                   <th>Poste</th>
                   <th>Département</th>
                   <th>Salaire / mois</th>
                   <th>Embauche</th>
                   <th>Statut</th>
                 </tr>
               </thead>
               <tbody>
                 ${filtered.map(e => `
                 <tr style="cursor:pointer;" data-eid="${_esc(e.id)}">
                   <td>
                     <div style="display:flex;align-items:center;gap:8px;">
                       <div class="avatar"
                         style="background:${_avatarColor(e.nom)};flex-shrink:0;">
                         ${_initiales(e.nom)}
                       </div>
                       <strong>${_esc(e.nom)}</strong>
                     </div>
                   </td>
                   <td style="font-size:0.85em;">${_esc(e.poste || '—')}</td>
                   <td style="font-size:0.85em;">${_esc(e.departement || '—')}</td>
                   <td style="font-family:monospace;font-size:0.85em;color:var(--accent-green);">
                     ${e.salaire ? _fmt(e.salaire) : '—'}
                   </td>
                   <td style="font-size:0.85em;">${_fmtD(e.dateEmbauche)}</td>
                   <td>${_badgeEmp(e.statut)}</td>
                 </tr>`).join('')}
               </tbody>
             </table>
           </div>`
      }`;

    /* Recherche en temps réel (sans rechargement page) */
    document.getElementById('rh-emp-search')?.addEventListener('input', (ev) => {
      _empSearch = ev.target.value;
      _drawEmployesList(toolbar, area);
    });

    /* Clic sur une ligne → ouvre le formulaire de modification */
    area.querySelectorAll('[data-eid]').forEach(row => {
      row.addEventListener('click', () => _openEmpModal(row.dataset.eid, toolbar, area));
    });
  }

  /* Formulaire modal employé (création et modification) */
  function _openEmpModal(empId, toolbar, area) {
    const e     = empId ? Store.getById('employes', empId) : null;
    const isNew = !e;

    /* Options des selects */
    const posteOpts  = POSTES.map(p =>
      `<option value="${_esc(p)}" ${e?.poste === p ? 'selected' : ''}>${_esc(p)}</option>`
    ).join('');
    const deptOpts   = DEPARTEMENTS.map(d =>
      `<option value="${_esc(d)}" ${e?.departement === d ? 'selected' : ''}>${_esc(d)}</option>`
    ).join('');
    const statutOpts = STATUTS_EMP.map(s =>
      `<option value="${_esc(s)}" ${(e?.statut || 'Actif') === s ? 'selected' : ''}>${_esc(s)}</option>`
    ).join('');

    showModal(isNew ? 'Nouvel employé' : 'Modifier : ' + e.nom, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label required">Nom complet</label>
          <input type="text" class="form-control" id="emp-nom"
            value="${_esc(e?.nom || '')}" placeholder="Prénom NOM" />
        </div>

        <div class="form-group">
          <label class="form-label">Poste</label>
          <select class="form-control" id="emp-poste">
            <option value="">— Choisir —</option>${posteOpts}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Département</label>
          <select class="form-control" id="emp-dept">
            <option value="">— Choisir —</option>${deptOpts}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Salaire mensuel (XPF)</label>
          <input type="number" class="form-control" id="emp-salaire"
            value="${e?.salaire || ''}" placeholder="150000" min="0" />
        </div>

        <div class="form-group">
          <label class="form-label">Date d'embauche</label>
          <input type="date" class="form-control" id="emp-embauche"
            value="${e?.dateEmbauche || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">Téléphone</label>
          <input type="tel" class="form-control" id="emp-tel"
            value="${_esc(e?.telephone || '')}" placeholder="87 xx xx xx" />
        </div>

        <div class="form-group">
          <label class="form-label">Email professionnel</label>
          <input type="email" class="form-control" id="emp-email"
            value="${_esc(e?.email || '')}" placeholder="prenom@highcoffeeshirt.pf" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Statut</label>
          <select class="form-control" id="emp-statut">${statutOpts}</select>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="emp-notes" rows="3"
            placeholder="Informations complémentaires…">${_esc(e?.notes || '')}</textarea>
        </div>

        <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          ${!isNew
            ? `<button class="btn btn-danger btn-sm" id="emp-del">🗑 Supprimer</button>`
            : '<span></span>'}
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" id="emp-cancel">Annuler</button>
            <button class="btn btn-primary" id="emp-save">
              ${isNew ? '+ Créer' : '✔ Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('emp-cancel')?.addEventListener('click', closeModal);
    document.getElementById('emp-save')?.addEventListener('click', () => _saveEmploye(empId, toolbar, area));

    /* Bouton suppression (modification uniquement) */
    document.getElementById('emp-del')?.addEventListener('click', () => {
      closeModal();
      showConfirm(
        `Supprimer l'employé "${e.nom}" ?`,
        () => {
          Store.remove('employes', empId);
          Store.addAuditLog(`Supprimé employé "${e.nom}"`, 'rh');
          toast('Employé supprimé.', 'success');
          _drawEmployesList(toolbar, area);
        },
        null, 'Supprimer', true
      );
    });
  }

  /* Sauvegarde employé (création ou mise à jour) */
  function _saveEmploye(empId, toolbar, area) {
    const nom = (document.getElementById('emp-nom')?.value || '').trim();
    if (!nom) { toast('Le nom est obligatoire.', 'error'); return; }

    const record = {
      nom,
      poste:        document.getElementById('emp-poste')?.value                  || '',
      departement:  document.getElementById('emp-dept')?.value                   || '',
      salaire:      Number(document.getElementById('emp-salaire')?.value)        || 0,
      dateEmbauche: document.getElementById('emp-embauche')?.value               || '',
      telephone:    document.getElementById('emp-tel')?.value                    || '',
      email:        document.getElementById('emp-email')?.value                  || '',
      statut:       document.getElementById('emp-statut')?.value                 || 'Actif',
      notes:        document.getElementById('emp-notes')?.value                  || ''
    };

    if (empId) {
      Store.update('employes', empId, record);
      Store.addAuditLog(`Modifié employé "${nom}"`, 'rh');
      toast('Employé mis à jour.', 'success');
    } else {
      Store.create('employes', record);
      Store.addAuditLog(`Créé employé "${nom}"`, 'rh');
      toast('Employé créé.', 'success');
    }

    closeModal();
    _drawEmployesList(toolbar, area);
  }

  /* ================================================================
     VUE CONGÉS
     Demandes + approbation / refus inline
     ================================================================ */

  let _congeStatutFilter = 'Tous'; // filtre actif par statut

  function _renderConges(toolbar, area) {
    toolbar.innerHTML = `
      <button class="btn btn-primary btn-sm" id="rh-btn-new-conge">+ Nouvelle demande</button>`;

    document.getElementById('rh-btn-new-conge')
      ?.addEventListener('click', () => _openCongeModal(null, toolbar, area));

    _drawCongesList(toolbar, area);
  }

  /* Rendu de la liste des congés */
  function _drawCongesList(toolbar, area) {
    const tous = Store.getAll('conges');

    /* Filtrage par statut */
    const filtered = _congeStatutFilter === 'Tous'
      ? tous
      : tous.filter(c => c.statut === _congeStatutFilter);

    /* Tri chronologique inverse (plus récent en premier) */
    const sorted = [...filtered].sort((a, b) => new Date(b.dateDebut) - new Date(a.dateDebut));

    /* KPIs */
    const enAttente = tous.filter(c => c.statut === 'En attente').length;
    const approuves = tous.filter(c => c.statut === 'Approuvé').length;

    const statuts = ['Tous', ...STATUTS_CONGE];

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">Demandes de congés
          <span style="font-size:0.65em;color:var(--text-muted);font-weight:400;margin-left:6px;">
            ${filtered.length} / ${tous.length}
          </span>
        </div>
      </div>

      <!-- KPIs -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:20px;max-width:380px;">
        <div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:1.4em;">⏳</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-orange);font-family:monospace;">${enAttente}</div>
          <div style="font-size:0.72em;color:var(--text-muted);">En attente d'approbation</div>
        </div>
        <div class="card" style="padding:14px;text-align:center;">
          <div style="font-size:1.4em;">✅</div>
          <div style="font-size:1.4em;font-weight:700;color:var(--accent-green);font-family:monospace;">${approuves}</div>
          <div style="font-size:0.72em;color:var(--text-muted);">Approuvés</div>
        </div>
      </div>

      <!-- Filtres par statut -->
      <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
        ${statuts.map(s => `
          <button class="btn btn-sm ${_congeStatutFilter === s ? 'btn-primary' : 'btn-ghost'}"
            data-sfil="${_esc(s)}"
            style="font-size:12px;">
            ${_esc(s)}
          </button>`).join('')}
      </div>

      ${sorted.length === 0
        ? `<div class="table-empty">
             <div class="empty-icon">🏖️</div>
             <p>Aucune demande de congé pour ce filtre.</p>
           </div>`
        : `<div class="card" style="overflow:auto;">
             <table class="table">
               <thead>
                 <tr>
                   <th>Employé</th>
                   <th>Type</th>
                   <th>Du</th>
                   <th>Au</th>
                   <th>Jours</th>
                   <th>Motif</th>
                   <th>Statut</th>
                   <th>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 ${sorted.map(c => `
                 <tr>
                   <td>
                     <div style="display:flex;align-items:center;gap:6px;">
                       <div class="avatar"
                         style="width:24px;height:24px;font-size:9px;flex-shrink:0;
                                background:${_avatarColor(_empNom(c.employeId))};">
                         ${_initiales(_empNom(c.employeId))}
                       </div>
                       <span style="font-size:0.85em;">${_esc(_empNom(c.employeId))}</span>
                     </div>
                   </td>
                   <td style="font-size:0.82em;">${_esc(c.type || '—')}</td>
                   <td style="font-size:0.82em;">${_fmtD(c.dateDebut)}</td>
                   <td style="font-size:0.82em;">${_fmtD(c.dateFin)}</td>
                   <td style="text-align:center;font-weight:600;font-size:0.85em;">
                     ${c.nbJours || '—'}
                   </td>
                   <td style="font-size:0.82em;max-width:150px;
                              overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                     ${_esc(c.motif || '—')}
                   </td>
                   <td>${_badgeConge(c.statut)}</td>
                   <td>
                     <div style="display:flex;gap:4px;flex-wrap:wrap;">
                       ${c.statut === 'En attente' ? `
                         <button class="btn btn-sm"
                           style="background:var(--accent-green);color:#fff;font-size:11px;padding:2px 8px;"
                           data-approve="${_esc(c.id)}" title="Approuver">✔</button>
                         <button class="btn btn-sm btn-danger"
                           style="font-size:11px;padding:2px 8px;"
                           data-refuse="${_esc(c.id)}" title="Refuser">✕</button>
                       ` : ''}
                       <button class="btn btn-ghost btn-sm"
                         style="font-size:11px;padding:2px 8px;"
                         data-edit-conge="${_esc(c.id)}" title="Modifier">✏</button>
                     </div>
                   </td>
                 </tr>`).join('')}
               </tbody>
             </table>
           </div>`
      }`;

    /* Changement de filtre statut */
    area.querySelectorAll('[data-sfil]').forEach(btn => {
      btn.addEventListener('click', () => {
        _congeStatutFilter = btn.dataset.sfil;
        _drawCongesList(toolbar, area);
      });
    });

    /* Approbation inline */
    area.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const conge = Store.getById('conges', btn.dataset.approve);
        if (!conge) return;
        Store.update('conges', conge.id, { statut: 'Approuvé' });

        /* Met à jour le statut de l'employé si le congé est en cours aujourd'hui */
        const now   = new Date();
        const debut = new Date(conge.dateDebut);
        const fin   = new Date(conge.dateFin);
        if (conge.employeId && now >= debut && now <= fin) {
          Store.update('employes', conge.employeId, { statut: 'En congé' });
        }

        Store.addAuditLog(`Congé approuvé pour "${_empNom(conge.employeId)}"`, 'rh');
        toast('Congé approuvé.', 'success');
        _drawCongesList(toolbar, area);
      });
    });

    /* Refus inline */
    area.querySelectorAll('[data-refuse]').forEach(btn => {
      btn.addEventListener('click', () => {
        const conge = Store.getById('conges', btn.dataset.refuse);
        if (!conge) return;
        Store.update('conges', conge.id, { statut: 'Refusé' });
        Store.addAuditLog(`Congé refusé pour "${_empNom(conge.employeId)}"`, 'rh');
        toast('Congé refusé.', 'info');
        _drawCongesList(toolbar, area);
      });
    });

    /* Ouvrir le formulaire de modification */
    area.querySelectorAll('[data-edit-conge]').forEach(btn => {
      btn.addEventListener('click', () => _openCongeModal(btn.dataset.editConge, toolbar, area));
    });
  }

  /* Formulaire modal congé (création et modification) */
  function _openCongeModal(congeId, toolbar, area) {
    const c     = congeId ? Store.getById('conges', congeId) : null;
    const isNew = !c;

    const empOpts  = Store.getAll('employes').map(e =>
      `<option value="${_esc(e.id)}" ${c?.employeId === e.id ? 'selected' : ''}>${_esc(e.nom)}</option>`
    ).join('');
    const typeOpts = TYPES_CONGE.map(t =>
      `<option value="${_esc(t)}" ${c?.type === t ? 'selected' : ''}>${_esc(t)}</option>`
    ).join('');
    const statOpts = STATUTS_CONGE.map(s =>
      `<option value="${_esc(s)}" ${(c?.statut || 'En attente') === s ? 'selected' : ''}>${_esc(s)}</option>`
    ).join('');

    showModal(isNew ? 'Nouvelle demande de congé' : 'Modifier la demande', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label required">Employé</label>
          <select class="form-control" id="conge-emp">
            <option value="">— Choisir un employé —</option>${empOpts}
          </select>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Type de congé</label>
          <select class="form-control" id="conge-type">${typeOpts}</select>
        </div>

        <div class="form-group">
          <label class="form-label required">Date de début</label>
          <input type="date" class="form-control" id="conge-debut"
            value="${c?.dateDebut || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label required">Date de fin</label>
          <input type="date" class="form-control" id="conge-fin"
            value="${c?.dateFin || ''}" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Motif</label>
          <input type="text" class="form-control" id="conge-motif"
            value="${_esc(c?.motif || '')}" placeholder="Motif de la demande…" />
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Statut</label>
          <select class="form-control" id="conge-statut">${statOpts}</select>
        </div>

        <div style="grid-column:1/-1;display:flex;justify-content:space-between;
                    align-items:center;margin-top:8px;">
          ${!isNew
            ? `<button class="btn btn-danger btn-sm" id="conge-del">🗑 Supprimer</button>`
            : '<span></span>'}
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" id="conge-cancel">Annuler</button>
            <button class="btn btn-primary" id="conge-save">
              ${isNew ? '+ Soumettre' : '✔ Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    `);

    document.getElementById('conge-cancel')?.addEventListener('click', closeModal);
    document.getElementById('conge-save')?.addEventListener('click', () => _saveConge(congeId, toolbar, area));

    document.getElementById('conge-del')?.addEventListener('click', () => {
      closeModal();
      showConfirm(
        'Supprimer cette demande de congé ?',
        () => {
          Store.remove('conges', congeId);
          Store.addAuditLog('Supprimé demande de congé', 'rh');
          toast('Demande supprimée.', 'success');
          _drawCongesList(toolbar, area);
        },
        null, 'Supprimer', true
      );
    });
  }

  /* Sauvegarde congé avec validation des dates */
  function _saveConge(congeId, toolbar, area) {
    const employeId = document.getElementById('conge-emp')?.value;
    const dateDebut = document.getElementById('conge-debut')?.value;
    const dateFin   = document.getElementById('conge-fin')?.value;

    if (!employeId) { toast('Sélectionnez un employé.', 'error'); return; }
    if (!dateDebut) { toast('La date de début est obligatoire.', 'error'); return; }
    if (!dateFin)   { toast('La date de fin est obligatoire.', 'error'); return; }
    if (dateFin < dateDebut) {
      toast('La date de fin doit être après la date de début.', 'error'); return;
    }

    const record = {
      employeId,
      type:     document.getElementById('conge-type')?.value   || 'Congé annuel',
      dateDebut,
      dateFin,
      nbJours:  _nbJours(dateDebut, dateFin), // calculé automatiquement
      motif:    document.getElementById('conge-motif')?.value  || '',
      statut:   document.getElementById('conge-statut')?.value || 'En attente'
    };

    if (congeId) {
      Store.update('conges', congeId, record);
      Store.addAuditLog(`Modifié congé de "${_empNom(employeId)}"`, 'rh');
      toast('Demande mise à jour.', 'success');
    } else {
      Store.create('conges', record);
      Store.addAuditLog(`Nouvelle demande de congé pour "${_empNom(employeId)}"`, 'rh');
      toast('Demande soumise.', 'success');
    }

    closeModal();
    _drawCongesList(toolbar, area);
  }

  /* ================================================================
     VUE PLANNING
     Tableau hebdomadaire : présences, congés, weekends
     ================================================================ */

  function _renderPlanning(toolbar, area) {
    /* Pas de bouton toolbar pour cette vue — lecture seule */
    toolbar.innerHTML = '';
    _drawPlanning(area);
  }

  function _drawPlanning(area) {
    const employes = Store.getAll('employes').filter(e => e.statut !== 'Inactif');
    /* Seuls les congés approuvés apparaissent dans le planning */
    const congesApprouves = Store.getAll('conges').filter(c => c.statut === 'Approuvé');

    /* Calcule la date du lundi de la semaine courante */
    const today        = new Date();
    const jourSemaine  = today.getDay();                    // 0=dim, 1=lun, …, 6=sam
    const offsetLundi  = jourSemaine === 0 ? -6 : 1 - jourSemaine;
    const lundi        = new Date(today);
    lundi.setDate(today.getDate() + offsetLundi);
    lundi.setHours(0, 0, 0, 0);

    /* Génère les 7 jours de la semaine */
    const jours = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lundi);
      d.setDate(lundi.getDate() + i);
      return d;
    });

    const todayStr  = today.toISOString().slice(0, 10);
    const joursNoms = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const moisNoms  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
                       'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    /* Détermine le statut d'un employé pour un jour donné */
    function _statutJour(emp, jour) {
      const dateStr = jour.toISOString().slice(0, 10);
      const dow     = jour.getDay(); // 0=dim, 6=sam
      if (dow === 0 || dow === 6) return 'weekend';
      const enConge = congesApprouves.some(c =>
        c.employeId === emp.id &&
        dateStr >= c.dateDebut &&
        dateStr <= c.dateFin
      );
      return enConge ? 'conge' : 'present';
    }

    /* Styles visuels par statut */
    const cellStyle = {
      present: 'background:#D1FAE5;color:#065F46;',
      conge:   'background:#FEF3C7;color:#92400E;',
      weekend: 'background:#F3F4F6;color:#9CA3AF;'
    };
    const cellLabel = { present: '✓', conge: '🏖️', weekend: '' };

    area.innerHTML = `
      <div class="page-header">
        <div class="page-title">
          Planning — Semaine du ${lundi.getDate()} ${moisNoms[lundi.getMonth()]}
        </div>
        <div class="page-subtitle">${employes.length} employé(s) actif(s) ou en congé</div>
      </div>

      <!-- Légende des couleurs -->
      <div style="display:flex;gap:16px;margin-bottom:16px;font-size:12px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="width:16px;height:16px;background:#D1FAE5;border-radius:3px;
                      border:1px solid #6EE7B7;"></div>
          <span>Présent</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="width:16px;height:16px;background:#FEF3C7;border-radius:3px;
                      border:1px solid #FCD34D;"></div>
          <span>Congé approuvé</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <div style="width:16px;height:16px;background:#F3F4F6;border-radius:3px;
                      border:1px solid #E5E7EB;"></div>
          <span>Weekend</span>
        </div>
      </div>

      ${employes.length === 0
        ? `<div class="table-empty">
             <div class="empty-icon">📅</div>
             <p>Aucun employé actif dans le système.</p>
             <button class="btn btn-primary btn-sm" id="rh-goto-emp"
               style="margin-top:8px;">+ Ajouter un employé</button>
           </div>`
        : `<div class="card" style="overflow:auto;">
             <table class="table" style="min-width:600px;">
               <thead>
                 <tr>
                   <th style="min-width:160px;">Employé</th>
                   ${jours.map(j => {
                     const isToday = j.toISOString().slice(0, 10) === todayStr;
                     const isWE    = j.getDay() === 0 || j.getDay() === 6;
                     return `<th style="text-align:center;width:80px;
                               ${isWE    ? 'color:var(--text-muted);'                : ''}
                               ${isToday ? 'color:var(--accent-blue);font-weight:700;' : ''}">
                       <div>${joursNoms[j.getDay()]}</div>
                       <div style="font-size:11px;font-weight:400;">
                         ${j.getDate()}/${j.getMonth() + 1}
                       </div>
                     </th>`;
                   }).join('')}
                 </tr>
               </thead>
               <tbody>
                 ${employes.map(emp => `
                 <tr>
                   <td>
                     <div style="display:flex;align-items:center;gap:7px;">
                       <div class="avatar"
                         style="width:24px;height:24px;font-size:9px;flex-shrink:0;
                                background:${_avatarColor(emp.nom)};">
                         ${_initiales(emp.nom)}
                       </div>
                       <div>
                         <div style="font-size:0.85em;font-weight:600;">${_esc(emp.nom)}</div>
                         <div style="font-size:0.72em;color:var(--text-muted);">
                           ${_esc(emp.poste || '')}
                         </div>
                       </div>
                     </div>
                   </td>
                   ${jours.map(j => {
                     const stat = _statutJour(emp, j);
                     return `<td style="text-align:center;font-size:13px;
                               border:1px solid var(--border);${cellStyle[stat]}">
                       ${cellLabel[stat]}
                     </td>`;
                   }).join('')}
                 </tr>`).join('')}
               </tbody>
             </table>
           </div>`
      }`;

    /* Raccourci vers la vue Employés si vide */
    document.getElementById('rh-goto-emp')?.addEventListener('click', () => {
      if (typeof RH !== 'undefined') {
        RH.init(
          document.getElementById('toolbar-actions'),
          document.getElementById('view-content'),
          'employes'
        );
      }
    });
  }

  /* ================================================================
     POINT D'ENTRÉE PUBLIC
     Appelé par app.js : RH.init(toolbarEl, containerEl, view)
     ================================================================ */

  function init(toolbarEl, containerEl, view) {
    switch (view) {
      case 'employes':    _renderEmployes(toolbarEl, containerEl); break;
      case 'conges':      _renderConges(toolbarEl, containerEl);   break;
      case 'planning-rh': _renderPlanning(toolbarEl, containerEl); break;
      default:
        containerEl.innerHTML = `
          <div class="table-empty">
            <div class="empty-icon">👤</div>
            <p>Vue RH "${_esc(view)}" inconnue.</p>
          </div>`;
    }
  }

  return { init };

})();

/* Expose globalement pour app.js */
window.RH = RH;
