# FE-62 — Guide smoke catalogue formations (mocks locaux)

Branche : `feat/fe-62-formation-catalogue`  
Prérequis : compte avec contexte OF (`showingPageType === 'of'`), localStorage catalogue seedé au premier chargement.

Les APIs Sergey ne sont **pas** branchées : `FormationCatalogue.ts` + `formationCatalogueStore` (localStorage).

## Préparation

1. `npm start` sur cette branche (hot reload après dé-shelve).
2. Connecte-toi (ex. Alicia école).
3. Bas gauche / switcher d’orgas → choisir **Atelier Numérique Formation** (OF mock).
4. **Attendu :** thème pétrole, dashboard « Espace organisme de formation », actions Catalogue / Créer une formation.
5. Optionnel — reset catalogue démo console :  
   `localStorage.removeItem('kinship.formationCatalogue.v1'); location.reload()`  
   (rechoisir l’OF dans le switcher après reload si besoin)

## Parcours

| # | Étape | Attendu |
|---|--------|---------|
| 1 | Dashboard OF | Tuiles **Catalogue** + **Sessions** |
| 2 | Sidebar → Catalogue de formations | Liste seed (ex. Devenir journaliste, Assertivité) |
| 3 | Créer une fiche / Sidebar Créer une formation | `/create?type=formation` — 3 cartes ; MC UE selon mock flags |
| 4 | Continuer (formation) | `/formation-fiche` — écran fiche (pas createProject étape 2) |
| 5 | Remplir + Continuer | Écran 3 carte + récap → ambre « Ajouter au catalogue » → modal → catalogue |
| 6 | Carte → La fiche | `/formation-fiche/:id` recharge la fiche |
| 7 | Ouvrir une session | Toast stub ticket 16 (pas de session) |
| 8 | Charger un tableau | Modèle CSV → vérifier → importer → fiches au catalogue / brouillon |
| 9 | Gate MC (console) | `__setMockCatalogueFlags` via import test ou recharger après patch mock : case grisée setting/plan/trust |

## Flags mock (serveur fictif)

Dans `src/api/FormationCatalogue.ts` :

- `eu_mc_gate.allowed` + `reason`: `setting` \| `plan` \| `trust`
- `certification_links_enabled`: champ RNCP fiche + colonne import ignorée si `false`

## Hors scope smoke

- Merge staging, APIs réelles, ticket 16 (session depuis fiche), CR merge Patrick.
