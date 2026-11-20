# CR — Lot 1 corrections (Attester + affiche projet)

**Branche FE :** `feat/fe-lot1-corrections`  
**Base :** `origin/staging`  
**GO Patrick :** lot de 5 (avant thème / P4.9)

---

## Livré

| # | Point | Statut |
| --- | --- | --- |
| 1 | Modal Attester : titre **Choisissez le projet** · croix à côté | OK |
| 2 | Liste : `in_progress` seulement · pas session formation · pas clos/à venir | OK (filtre FE) |
| 3 | Copy : **portant 1 constat** / **portant N constats** (sans le/les) | OK |
| 4 | Affiche : **1 participant** (accord) | OK |
| 5 | Affiche : masquer **0 preuves** · retirer overlay « couverture — 2 photos max » | OK |

### Note Sergey (point 2)

Filtre appliqué **côté FE** sur la liste Attester (`status === in_progress`, exclusion `project_kind=formation` / `formation_catalog_entry_id`). Si l’API doit aussi restreindre, à confirmer avec Sergey.

---

## Captures attendues (1 / point)

1. Modal titre + croix  
2. Liste sans session formation / projet clos  
3. 1er clic Attester — copy constats  
4. Affiche « 1 participant »  
5. Affiche sans « 0 preuves » / sans overlay couverture  

---

## Verdict

Petite poussée lot 1. Prêt smoke staging après merge.
