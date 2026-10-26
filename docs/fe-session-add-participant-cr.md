# CR — Ajouter un participant + warnings import (contrat 49 V1.3 §11)

**Branche :** `feat/fe-session-participants-import`  
**Contrat :** KINSHIP Contrat API — 49 V1.3 §11 (participants session OF)  
**BE local :** `staging` @ `82d4333` (PR #395)  
**Maquette panneau :** P4.4 (Patrick validé)  
**Date smokes :** 2026-10-26  
**Compte smoke :** Alicia Cordial · session BE **Formation Google Test** (id numérique)

---

## Livré

### B — Panneau « + Ajouter un participant »

| Point | Statut |
| ----- | ------ |
| `POST /api/v1/projects/:id/pre_register` | **OK** |
| Body `first_name`, `last_name`, `birthday`, `email` + org | **OK** |
| 201 → inscription + refresh liste · statut **inscrit** | **OK** |
| Warning &lt; 15 ans sous la date (sans blocage) | **OK** |
| 422 e-mail déjà utilisé → erreur dans la modale | **OK** |
| `phone` facultatif | non affiché (écran Patrick) ; supporté côté API si fourni |

### A — Analyze import + `warnings`

| Point | Statut |
| ----- | ------ |
| Mapper `warnings[]` (line, code, message) | **OK** |
| Afficher warning par ligne dans l’aperçu | **OK** |
| Ligne warning reste importable (CTA compte OK) | **OK** |
| `under_15` hors `reject_preview` (filtre FE défensif) | **OK** |

---

## Smokes locaux (2026-10-26)

| # | Parcours | Résultat | Détail |
| - | -------- | -------- | ------ |
| **B1** | Ajouter adulte (John Doe) | **PASS** | Participants (1) · **inscrit** |
| **B2** | DOB &lt; 15 ans (Bob Fisher) | **PASS** | Warning · Ajouter OK · Participants (2) · **inscrit** |
| **B3** | E-mail déjà utilisé (`john.doe@exemple.fr`) | **PASS** | Erreur dans la modale · pas de double ligne |
| **A1** | Analyze `session_participants_a1_smoke.csv` | **PASS** | Warning sous Leo · 2 importables · pas dans écartés |

### Notes

- Smoke sur session **BE** (URL id numérique) ; les anciennes URLs `sess-…` (store local) donnent 404.
- B3 : message BE observé **« Adresse email est déjà utilisé(e) »** (contrat citait plutôt « Déjà inscrit à la session. ») — comportement conforme.
- Affichage liste parfois `Prénom Nom` inversé vs saisie formulaire — hors scope de ce CR.

---

## Fichiers clés

- `src/api/FormationSessionPreRegister.ts`
- `src/components/Pages/AddSessionParticipantModal.tsx`
- `src/components/Pages/FormationSessionSpacePage.tsx`
- `src/api/FormationSessionParticipantsImport.ts` (+ UI import)

**Tests auto :** PreRegister + Import + Modal · PASS

---

## Hors scope

Soft-delete, rapprochement UI, Postmark, Options de session, champ téléphone UI.
