# CR Ticket 62 · Catalogue de formations (FE mocks)

**Branche :** `feat/fe-62-formation-catalogue` (depuis `staging`)  
**Statut :** UI + mocks locaux + **passe conformité maquettes** (P4.3 / P4.3 bis / P4.2-1 / P4.11). **Pas de merge staging** tant que les APIs Sergey + GO Patrick ne sont pas là.

## Livré (maquettes P4.3 → P4.2-1 → P4.3 bis → P4.11)

| Jalon    | Contenu                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------- |
| P4.3     | Tunnel création : Create (3 cartes) → fiche wizard 3 écrans ; org / type / MC UE verrouillés au 1er save |
| P4.2     | Catalogue fiches (liste, filtres, cartes) ; « Ouvrir une session » = stub ticket 16                      |
| P4.3 bis | Deltas MC UE : compteur or, série obligatoire, évaluation or, pas de lignes libres                       |
| P4.11    | Import CSV modèle + preview catalog/draft/rejected ; RNCP ignoré si flag off                             |

## Fichiers clés

- `src/types/formationCatalogue.ts`
- `src/utils/formationCatalogueStore.ts` · `src/utils/euMcGateCopy.ts`
- `src/api/FormationCatalogue.ts` (+ tests)
- `FormationFicheWizard` · `CatalogueFormationsPage` · `CatalogueImportPage`
- Wiring : `PageType`, `MainLayout`, `useAuthInit`, `CreateProjectPage`, `Sidebar`, dashboard OF

## Tests

- Unitaires : `euMcGateCopy.test.ts`, `FormationCatalogue.test.ts`
- Manuel : `docs/fe-62-smoke-guide.md`

## Smoke tests

Contexte : Alicia école → switcher **Atelier Numérique Formation** (dé-shelve temporaire OF).  
Guide : `docs/fe-62-smoke-guide.md` (numérotation smoke session ≠ table du guide).

| #   | Parcours                                                                                               | Résultat |
| --- | ------------------------------------------------------------------------------------------------------ | -------- |
| 1   | Dashboard OF — tuiles Catalogue / Sessions                                                             | OK       |
| 2   | Catalogue de formations (seed)                                                                         | OK       |
| 3   | Créer formation non-MC → tunnel fiche                                                                  | OK       |
| 4   | MC UE (gate mock) — Droit européen                                                                     | OK       |
| 5   | Titre déjà pris (clash)                                                                                | OK       |
| 6   | Import P4.11 — Excel refus mock + CSV (5 lues / 2 catalogue / 2 brouillons / 1 non créée) + modèle CSV | OK       |
| 7   | Ouvrir une session → toast stub ticket 16                                                              | OK       |

## Dé-shelve temporaire FE-62 pour les tests smoke

Pour permettre le smoke sans API OF Sergey, la branche **réactive temporairement** :

| Élément                              | Fichier                          | Comportement smoke                            |
| ------------------------------------ | -------------------------------- | --------------------------------------------- |
| `canCreateFormation()`               | `ofActivationStore.ts`           | `true` si dossier OF mock `activated`         |
| Contexte `formation` valide au login | `useAuthInit.ts`                 | accepte `of-demo` (+ API si présente)         |
| Switcher orgas                       | `Sidebar.tsx` · `UserHeader.tsx` | entrée **Atelier Numérique Formation** (mock) |
| Route `/of-activation`               | `MainLayout` · `useAuthInit`     | page réactivée                                |
| Créer → Formation                    | `Sidebar` (edu/pro)              | actif si OF activé                            |
