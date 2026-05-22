# HCS ERP — Instructions Claude Code

> Projet : High Coffee Shirt ERP — Vanilla HTML/CSS/JS — Papeete, Tahiti
> Langue : **toujours répondre en français**

---

## ⚡ ACTIVATION RUFLO — OBLIGATOIRE À CHAQUE SESSION

**Au démarrage de chaque conversation sur ce projet, Claude Code DOIT :**

1. Initialiser le swarm Ruflo (`mcp__claude-flow__swarm_init`)
2. Charger la mémoire projet (`mcp__claude-flow__memory_retrieve` namespace `hcs-erp`)
3. Adapter le mode selon la complexité de la tâche (voir tableau ci-dessous)

```javascript
// Séquence d'init automatique — 1 seul message
mcp__claude-flow__swarm_init({ topology: "hierarchical", maxAgents: 6, strategy: "specialized" })
mcp__claude-flow__memory_retrieve({ key: "project/hcs-erp/context", namespace: "hcs-erp" })
```

### Routage par complexité

| Tâche | Mode | Agents |
|---|---|---|
| Bug 1-2 lignes, config | **Direct** — pas de swarm | — |
| Correction ciblée 1 fichier | **Direct** — edit immédiat | — |
| Nouveau module / fonctionnalité | **Swarm** | architect → coder → reviewer |
| Refactoring multi-fichiers (3+) | **Swarm** | analyzer → coder → tester |
| Analyse codebase globale | **Agent Explore** dédié | explorer |
| Bug complexe transverse | **Swarm** | researcher → coder → tester |

---

## 🏗️ Architecture ERP

- **Type :** SPA vanilla HTML/CSS/JS (zéro framework)
- **Entrée :** `index.html`
- **Chemin local :** `C:\Users\highc\HCS\hcs-erp\`
- **URL prod :** https://highcoffeeshirts.com/erp/
- **Déploiement :** `python deploy-sftp.py fichier` (SFTP Paramiko → Planet Hoster)

### Ordre de chargement JS — CRITIQUE

```
seed.js → mysql-api.js → store.js → utils.js
→ composants/ → modules/ → auth.js → app.js
```

> ⚠️ Ne jamais déplacer ou inverser cet ordre. C'est la source de la majorité des bugs.

### Structure

```
hcs-erp/
├── index.html
├── css/             ← variables.css (palette caramel HCS)
├── data/seed.js     ← données initiales — charger EN PREMIER
├── js/
│   ├── store.js     ← CRUD + localStorage + sync MySQL
│   ├── utils.js     ← fmtDate, fmtXPF, escapeHtml…
│   ├── auth.js      ← login / session
│   ├── app.js       ← router principal — charger EN DERNIER
│   ├── components/  ← toast, modal, form, table, kanban, chart
│   └── modules/     ← crm, sales, purchases, inventory,
│                       manufacturing, accounting, discuss,
│                       users, advisor, rh, agents, audit
├── api/             ← PHP MySQL (Planet Hoster)
├── deploy-sftp.py   ← déploiement SFTP
└── .env             ← SFTP_PASS (jamais committé)
```

---

## 📋 Règles de code

- **Commentaires en français**
- Variables et fonctions en **camelCase anglais**
- Monnaie : **toujours XPF** — jamais EUR ou USD dans l'UI
- Fichiers : **< 500 lignes** de préférence
- Pas de framework JS — vanilla uniquement
- `fmtDate()`, `fmtXPF()`, `escapeHtml()` viennent de `utils.js` — toujours vérifier leur dispo avec `typeof fmtDate === 'function'` dans les modules

---

## 🔗 Connexions externes

| Service | Accès |
|---|---|
| API MySQL | `https://highcoffeeshirts.com/erp/api/` — header `x-api-key: hcs-erp-2026` |
| SFTP déploiement | `node41-ca.n0c.com:5022` — user `highftqb` — pass dans `.env` |
| MySQL | `highftqb_HCS_ERP` — user `highftqb_ERP` |

---

## 🧠 Mémoire Ruflo (namespace `hcs-erp`)

Les décisions d'architecture, bugs résolus et patterns appris sont stockés dans AgentDB (HNSW 384 dimensions). Avant tout chantier important :

```javascript
mcp__claude-flow__memory_search({ query: "description de la tâche", namespace: "hcs-erp" })
```

Après chaque correction ou nouvelle fonctionnalité, stocker le pattern :

```javascript
mcp__claude-flow__memory_store({ key: "fix/nom-du-bug", namespace: "hcs-erp", value: { ... } })
```

---

## ⚠️ Points critiques

1. **Ordre JS** : seed → store → utils → composants → modules → auth → app
2. **Monnaie** : XPF uniquement dans l'UI
3. **`fmtDate`** : défini dans `utils.js`, jamais redéfini localement dans `app.js`
4. **QuotaExceededError** : `store.js` a un fallback en 2 niveaux — ne pas supprimer
5. **MySQL DELETE 404** : silencieux par design dans `_syncMySQLDelete`
6. **`pocketbase.js` / `migrate.js`** : supprimés — ne pas réajouter (causaient CSP eval)
7. **PayZen** : currency code 953, montants en centimes (3900 XPF = 390000)

---

*HCS ERP · Grace · Papeete, Polynésie française · 2026*
