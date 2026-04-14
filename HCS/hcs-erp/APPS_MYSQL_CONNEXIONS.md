# HCS ERP — Connexion MySQL de tous les outils

> Récapitulatif de l'intégration API MySQL dans les apps HCS  
> API : `https://highcoffeeshirts.com/erp/api/` — Header : `x-api-key: hcs-erp-2026`

---

## Fichier partagé

### `apps/hcs-api-shared.js`

Toutes les apps incluent ce script dans leur `<head>` :
```html
<script src="hcs-api-shared.js"></script>
```

Il expose l'objet global `HCSApi` :

| Méthode | Description |
|---|---|
| `HCSApi.save(table, data)` | POST → API MySQL. Fallback localStorage si hors-ligne |
| `HCSApi.getRecent(table, limit)` | GET les N derniers enregistrements |
| `HCSApi.search(table, query)` | Recherche full-text |
| `HCSApi.ping()` | Teste la connexion API (retourne `true/false`) |
| `HCSApi.showSavedBadge(id, offline)` | Affiche badge "✓ Sauvegardé" 4 secondes |
| `HCSApi.renderHistory(items, opts)` | Génère le HTML d'une liste historique |

---

## Tables MySQL utilisées

| Table | Description |
|---|---|
| `logos` | Logos traités (PicWish, DTF Studio) |
| `assets` | Exports et créations (mockups, concepts, campagnes) |
| `calculs` | Calculs DTF et vinyle |
| `commandes_atelier` | Fiches de production DTF / transferts |
| `landing_pages` | Pages et campagnes créées |

---

## Outils modifiés

### 1. `apps/picwish-pipeline.html` ✅
- **Déclenche** : après traitement complet (détourage + amélioration + recadrage)
- **Table** : `logos`
- **Données** : `{ nom_fichier, client_nom, format: "PNG", statut: "detoure", chemin, date }`
- **Affichage** : section "Logos récents sauvegardés" en bas de page
- **Bouton** : "Voir tous les logos →" → ouvre `modules/stock-dashboard.html#logos-bibliotheque`

### 2. `apps/mockup-forge-v12.html` ✅
- **Déclenche** : après Télécharger ou Archiver (Dropbox)
- **Table** : `assets`
- **Données** : `{ nom, type: "mockup", client_id, tags: "mockupforge,png", notes, date }`
- **Affichage** : panneau "HISTORIQUE EXPORTS" dans le panneau droit

### 3. `apps/dtf-calculator-hcs-v2.html` ✅
- **Déclenche** : après chaque calcul (déduplication anti-rebond)
- **Table** : `calculs`
- **Données** : `{ type: "dtf", quantite, prix_unitaire, prix_total, client_nom, format, date }`
- **Affichage** : badge `#dtf-calc-badge` + panneau historique collapsible

### 4. `apps/calculateur-vinyl-hcs.html` ✅
- **Déclenche** : après chaque calcul (délai 1.5s anti-rebond)
- **Table** : `calculs`
- **Données** : `{ type: "vinyl", quantite, prix_unitaire, prix_total, client_nom, format, date }`
- **Affichage** : badge + panneau historique

### 5. `apps/dtf-plaques-transfert.html` ✅
- **Déclenche** : après chaque calcul `doCalc()`
- **Table** : `commandes_atelier`
- **Données** : `{ type: "dtf-transfert", description, client_nom, quantite, statut: "en-attente", date }`
- **Affichage** : badge `#dtf-transfert-badge` + panneau "Fiches en cours"

### 6. `apps/dtf-studio.html` ✅
- **Déclenche** : après archivage `archiveSession()`
- **Tables** : `logos` (statut: "dtf-original") + `assets` (type: "dtf-studio")
- **Nouveaux boutons** :
  - 🏭 **Atelier** → crée dans `commandes_atelier` (statut: "en-attente")
  - 🖼️ **MockupForge** → ouvre mockup-forge-v12.html avec `localStorage.mfw_client_name`
  - 📋 **Historique ERP** → modal avec les dernières créations

### 7. `apps/andromeda-campaign.html` ✅
- **Déclenche** : après `exportLPTshirt()` ou `exportLP()`
- **Tables** : `landing_pages` (statut: "campagne") + `assets` (type: "campagne")
- **Affichage** : badge + panneau "Campagnes récentes"

### 8. `apps/hcs-builder-v2-fixed.html` ✅
- **Déclenche** : après `exportHTML()`
- **Table** : `landing_pages`
- **Données** : `{ titre, client_nom, url: "", statut: "brouillon", notes, date }`
- **Affichage** : badge + panneau historique des 5 dernières pages

### 9. `apps/tshirt-mockup-studio.html` ✅
- **Déclenche** : après `downloadSelected()` et `exportAllMockups()`
- **Table** : `assets`
- **Données** : `{ nom, type: "mockup", client_id, tags: "tshirt-studio", date }`
- **Affichage** : badge `#tmk-saved-badge` + panneau historique collapsible

### 10. `apps/kustomkoncept.html` ✅
- **Déclenche** : après `exportPDF()`, `exportJPG()`, `saveProject()`
- **Table** : `assets`
- **Données** : `{ nom, type: "concept", client_id, tags: "kustomkoncept", date }`
- **Affichage** : badge `#kk-saved-badge` + panneau "Historique concepts"

### 11. `apps/hcs-dashboard.html` ✅
- **Déclenche** : au chargement de la page
- **Lit** : toutes les tables pour afficher les vrais KPIs
- **Indicateur** : 🟢 Connecté MySQL / 🟡 Hors-ligne

### 12. `apps/hcs-hub.html` ✅
- **Indicateur** : badge fixe en haut à droite (connexion MySQL)
- **Lit** : `logos`, `assets`, `calculs` → met à jour les compteurs

### 13. `apps/hcs-cockpit.html` ✅
- **Indicateur** : badge ERP en haut à droite
- **Lit** : `assets`, `calculs`, `logos` → met à jour `#tb-orders`

---

## Module Stock — Bibliothèque Logos

### `modules/stock-dashboard.html` — Onglet "🖼 Logos" ✅

Nouvel onglet dans le module Stock :
- **Galerie** de tous les logos importés depuis PicWish Pipeline
- **Filtres** : client, statut (détoure/recadré/final), format
- **Bouton** ⬇ Info → affiche le chemin Dropbox
- **Bouton** ⚡ MockupForge → ouvre MockupForge avec le client pré-rempli
- **Accès direct** : `modules/stock-dashboard.html#logos-bibliotheque`

---

## Gestion des erreurs

Tous les appels utilisent `HCSApi.save()` qui :
1. Tente l'appel API
2. En cas d'échec → sauvegarde dans `localStorage` (clé `hcs_fallback_{table}`)
3. Affiche le badge en mode "Hors-ligne" (jaune) au lieu de vert

Les données offline sont récupérables via `HCSApi.getRecent()` qui lit aussi le localStorage.

---

## API PHP — Endpoints disponibles

```
GET    /api/{table}              → liste (params: sort, order, limit, offset)
GET    /api/{table}/{id}         → un enregistrement
POST   /api/{table}              → créer
PUT    /api/{table}/{id}         → modifier
DELETE /api/{table}/{id}         → supprimer
GET    /api/{table}/search?q=... → recherche full-text
```

Toutes les tables sont créées automatiquement par l'API PHP si elles n'existent pas.

---

*Généré le 2026-04-13 — HCS ERP v2*
