# CR — Ajouter un participant + warnings import (contrat 49 V1.3 §11)

**Branche :** `feat/fe-session-participants-import`  
**Merge staging FE :** 2026-10-27 (GO Patrick)  
**Contrat :** KINSHIP Contrat API — 49 V1.3 §11 (participants session OF)  
**Maquette panneau :** P4.4 (validé)  
**Fix pré-merge :** astérisque inline « Nom ✱ » (`82d46a0`)

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
| Astérisque inline sur les libellés (P4.4) | **OK** |
| `phone` facultatif | non affiché (écran Patrick) ; supporté côté API si fourni |

### A — Analyze import + `warnings`

| Point | Statut |
| ----- | ------ |
| Mapper `warnings[]` (line, code, message) | **OK** |
| Afficher warning par ligne dans l’aperçu | **OK** |
| Ligne warning reste importable (CTA compte OK) | **OK** |
| `under_15` hors `reject_preview` (filtre FE défensif) | **OK** |

---

## Smokes staging (2026-10-27) — PASS

**Env :** FE staging Vercel + API staging  
**Compte :** Claire V. / CFPJ  
**Session :** Journaliste — formation complète (RNCP40281) · id **76**  
**E-mails de test :** `@example.org` uniquement

| # | Parcours | Résultat | Détail |
| - | -------- | -------- | ------ |
| **B1** | Adulte Alice Dupont | **PASS** | Toast « Participant inscrit » · Participants (1) · e-mail visible · **inscrit** |
| **B2** | &lt; 15 ans Leo Martin (12/03/2015) | **PASS** | Warning sous la date · Ajouter OK · Participants (2) · e-mail masqué (mineur) · **inscrit** |
| **B3** | E-mail déjà utilisé (`alice.smoke.staging@example.org`) | **PASS** | Erreur modale « Adresse email est déjà utilisé(e) » · toujours Participants (2) |
| **A1** | Import `session_participants_a1_smoke.csv` | **PASS** | 2 détectés · warning sous Tom · Importer les 2 · 2 inscrits · Participants (4) |

### Captures

Jointes à l’envoi (panneau B1–B3, aperçu A1 + warning, récap import, liste Participants (4)).

### Notes

- Session URL id **numérique** (76) ; pas de `sess-…` local.
- B3 : message BE **« Adresse email est déjà utilisé(e) »** — conforme (ne pas retoucher côté FE).
- Mineur : e-mail absents de la liste / réponse sérialisée (`exposed_email_for_user` / `is_minor?`) — attendu.
- Ordre affichage liste prénom+nom : OK (saisie test parfois inversée hors scope).

---

## Smokes locaux (2026-10-26) — PASS (réf.)

| # | Parcours | Résultat |
| - | -------- | -------- |
| B1–B3 + A1 | Alicia / session BE Formation Google Test | **PASS** |

---

## Fichiers clés

- `src/api/FormationSessionPreRegister.ts`
- `src/components/Pages/AddSessionParticipantModal.tsx` (+ `.css`)
- `src/components/Pages/FormationSessionSpacePage.tsx`
- `src/api/FormationSessionParticipantsImport.ts` (+ UI import)

**Tests auto :** PreRegister + Import + Modal · PASS

---

## Hors scope

Soft-delete, rapprochement UI, Postmark, Options de session, champ téléphone UI, fenêtre Attester (variables CSS — note séparée).
