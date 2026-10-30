# Lot 2 — Attester une compétence (P2.13 V1.4.1)

**GO Lot 1 :** Patrick 28/10/2026 — écrans clôture validés ; API plus tard (contrat Sergey).  
**Maquette :** `docs/maquettes/P2.13_KIN_UX_ATTESTER_COMPETENCE_V1_4_1.html`  
**Réponses Sergey :** `docs/fe-attest-sergey-questions.md` (2026-10-28)

## Checklist P2.13

- [x] Plus d’étape wizard **Axe**
- [x] Écran compétence : toute la série, axes en **titres** + chips filtre « Tous les axes »
- [x] **Pastilles** niveaux / Phase (clic → participants ou constat) — labels CPS via `catalog_key` / `key:` (pas Soft Skills)
- [x] Confirm en **double clic** sur le même CTA (overlay confirm retiré)
- [x] Skip série si **dernière connue** (localStorage) / une seule série ; tag « dernière utilisée »
- [x] Masquer **soi-même** dans la liste participants
- [x] Groupe « Distribuées… » **placeholder** (Sergey : attendre `series_owner` BE)
- [x] Copy « preuve(s) de compétence » (compétence au singulier)

## Helpers

- `src/utils/attestLastSeries.ts` — clé `attest:lastSeries:{userId}:{projectId}`

## Entrées

`ProjectAffichePage` · `ProjectManagement` · `Badges` · Sidebar → `SelectProjectForBadgeModal`

## Reprises Patrick (29/10) — avant GO

Voir `docs/fe-attest-lot2-reprises-patrick.md` (cartes parent CPS, succès, Distribuées, Attester 0 coché, copy participants).

## Hors scope FE (ticket BE)

- Persistance last-series serveur
- Peupler « Distribuées par vos autorités » (`series_owner` / authority_*)
