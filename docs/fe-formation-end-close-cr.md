# CR — Clôture formation API (KIN_API_FORMATION_END_CLOSE_V15 · ticket 24)

**Date smokes locaux :** 2026-11-17  
**Branche FE :** `feat/fe-formation-end-close` (depuis `origin/staging`)  
**Env :** FE local (`localhost:3001`) + BE staging / local aligné ticket **24** (pas 24bis)  
**Contrat :** KIN_API_FORMATION_END_CLOSE_V15 §6 / §6ter  
**Corrections Patrick 12/11 :** 4 points copy / UI  
**Hors scope :** page partenaire P4.6 écran 2 · ticket **24bis**

---

## Contexte

Lot 1 clôture était **mock** (écrans seuls). Ce lot branche l’affiche + TB sur l’API réelle : `declare_end` / `withdraw_end` / `end_declaration` / `close`, avec flags `can_declare_end` · `can_close_project` · `active_end_declaration`, et les 4 retouches copy du 12/11.

GO merge staging **après** ce CR + captures (comme A+B).

---

## Livré

| # | Point | Détail | Statut |
| --- | --- | --- | --- |
| **API** | Client V15 | `declareFormationSessionEnd` · `withdrawFormationSessionEnd` · `getFormationEndDeclaration` · `closeFormationSession` (+ `participant_outcomes`, `assessment_results_attached`, `trainer_names_shown`) | **OK** |
| **Erreurs** | Codes → FR | `not_in_progress` · `not_responsible_trainer` · `already_declared` · `closure_forbidden_for_role` · etc. | **OK** |
| **Mapper** | Session | Flags + déclaration active mappés depuis le projet API | **OK** |
| **Affiche** | Hors mock close | Déclarer fin / clôturer appellent l’API (id projet **numérique**) | **OK** |
| **TB** | Formateur / org | Cartes fin / clôturer pilotées par flags API | **OK** |
| **C1** | Dates | Modal déclarer fin : plage en **jj/mm/aaaa** | **OK** |
| **C2** | Phrase conformité | « L’organisme vérifiera la conformité avant de clôturer. » | **OK** |
| **C3** | Joindre | Ligne « Joindre les résultats… » **cachée** ; notes saisissables **conservées** ; payload `assessment_results_attached: true` | **OK** |
| **C4** | Europass | Retrait « exportable vers Europass » (panel + confirm) | **OK** |
| **Tests** | Copy | `sessionCloseCopy.test.ts` enrichi (erreurs FR + dates datetime) | **OK** |

### Fichiers clés

- `src/api/FormationSessions.ts` — endpoints end/close  
- `src/api/Badges.ts` — `badge_role` si besoin clôture  
- `src/utils/formationSessionApiMapper.ts` · `src/types/formationSession.ts`  
- `src/components/Pages/FormationSessionAffichePage.tsx`  
- `src/components/SessionClose/DeclareSessionEndModal.tsx` · `SessionClosePanel.tsx` · `SessionCloseConfirmModal.tsx`  
- `src/components/Dashboard/FormateurSessionTodoTile.tsx` · `FormationOrgDashboard.tsx`  
- `src/utils/sessionCloseCopy.ts` (+ test)

---

## Smokes locaux (2026-11-17)

**Session API :** Import Excel Complet · id projet **`5`** · formateur responsable **Bodin Louis** · Ecole primaire Victor Hugo  
**Compte :** Bodin Louis en **admin** structure (TB org Qualiopi) — nécessaire pour sortir du dashboard membre perso sans tuiles formation  
**Parcours :** affiche `/formation-affiche/5` (pas le TB pour S1/S2)

| # | Parcours | Résultat | Détail observé |
| --- | --- | --- | --- |
| **S1** | Déclarer la fin (formateur) | **PASS** | Dates **jj/mm/aaaa** · phrase conformité · POST `/api/v1/projects/5/declare_end` OK · fin déclarée par Bodin Louis |
| **S2** | Clôturer → délivrer → naissance → TERMINÉE | **PASS** | Panel jury · **pas** « Joindre » · **pas** Europass · toast « Session clôturée » · overlay « Votre Preuve Formation est née » · chip **TERMINÉE** / clôturée · PF générée (`PF-2024-FR-5QM`) · 0 participant |
| **S3** | TB spot-check | **PARTIEL** | Bodin admin → TB **organisme** (pas tuiles formateur « Déclarer la fin »). Carte clôturer org non rejouée après S2 (session déjà close). À revalider en staging avec **formateur** + **Alicia** org séparés. |

### Notes smoke / pièges

1. **Ids `sess-…`** : sessions du store mock local. `POST …/projects/sess-…/declare_end` → **404 Resource not found**. Smoke API **uniquement** sur id numérique catalogue (`/formation-affiche/5`).
2. **Rôles :** membre seul = dashboard perso sans cartes formation ; admin Qualiopi = TB org (clôturer), pas la carte formateur « Déclarer la fin ». Les CTA S1/S2 ont été validés sur **l’affiche**.
3. **Hors scope :** partenaire P4.6-2 · 24bis · Postmark / registre côté Sergey si hors ticket 24.

### Captures pour Patrick

| # | Contenu |
| --- | --- |
| 1 | Modal **Déclarer la fin** — dates jj/mm/aaaa + phrase conformité |
| 2 | Panneau **Clôture** — Décision du jury · sans Joindre · sans Europass |
| 3 | Overlay **Preuve Formation est née** + toast Session clôturée |
| 4 | Affiche **TERMINÉE** / clôturée + bandeau preuve |

---

## Demande

**GO merge** de `feat/fe-formation-end-close` → **staging** après relecture / captures.  
Smokes staging (idéalement 2 comptes : formateur + org) recommandés avant prod / Sergey.
