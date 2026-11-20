# CR — Masquer « Clôturer » si session À VENIR

**Date :** 2026-11-20  
**Branche FE :** `feat/fe-hide-close-cta-coming`  
**GO Patrick :** 20/11 — option 1 uniquement (pas de toast dédié)

---

## Contexte

Smoke `proof_number` : sur `#82` (`coming`, début non déclaré), le CTA **Clôturer la session** apparaissait encore → `POST /close` 422 (*Only in_progress…*) + toast « Validation Failed ».

Patrick : le bouton ne s’affiche **que** quand la session est **en cours** (début déclaré). Sans bouton, l’appel ne part plus.

---

## Livré

- Helper `canShowCloseFormationSessionCta` : exige `startDeclared` + hero `in_progress` + pas `ended` ; respecte `can_close_project` / fallback structure + fin déclarée.
- Affiche session + TB org (cartes « Clôturer ») branchés sur ce gate.
- Tests unitaires du helper.

---

## Smoke local / staging (court)

| # | Cas | Attendu |
| --- | --- | --- |
| 1 | Session **À VENIR** (ex. `#82`) | **Pas** de CTA Clôturer (affiche + TB) |
| 2 | Session **EN COURS** + fin déclarée + droit close | CTA Clôturer visible |
| 3 | Session **TERMINÉE** | Pas de CTA Clôturer |

---

## Verdict

Petite poussée UX alignée BE / GO Patrick. Prêt smoke staging après merge.
