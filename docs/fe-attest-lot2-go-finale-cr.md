# CR — Attester Lot 2 · poussée GO finale (avant merge)

**Branche :** `feat/fe-session-participants-import`  
**Demande :** 30/10/2026 — une dernière chose avant le GO  
**Compte smoke :** Alicia Cordial · Formation Google Test · Doe John (entrée individuelle)  
**Date smokes :** 30/10/2026

---

## Contexte

Patrick a validé les 5 reprises ; avant GO, il demande :

1. pastilles écran 2 = **intitulé fiche + code** (pas le code seul), ordre SPF, wrap OK ;
2. entrée individuelle : succès au **singulier** ; constat = mêmes mots que le groupe (Facultatif…) ; bandeau Déjà attesté **gardé**.

---

## Livré

| Point              | Correction                                                                                                                   | Statut |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| Pastilles CPS      | `badge.name` verbatim + tri `sortBadgeNamesBySpfCode` ; CSS `.att-pastille-long` (wrap)                                      | **OK** |
| Succès ×1          | « Preuve de **compétence** produite »                                                                                        | **OK** |
| Constat individuel | Facultatif + « + Preuve ou objet » / « + Commentaire » ; doctrine « Phase 1 — commentaire… » retirée ; Déjà attesté conservé | **OK** |

### Fichiers

- `src/utils/cpsPastilleLabels.ts` (+ test)
- `src/components/Modals/AttestCompetenceModal.tsx`
- `src/components/Modals/BadgeAssignmentModal.css`

**Tests auto :** `cpsPastilleLabels` — PASS

---

## Smokes locaux (2026-10-30) — P1–P3 PASS

| #      | Parcours                          | Résultat | Détail                                                                                                    |
| ------ | --------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| **P1** | Écran Compétence CPS              | **PASS** | Pastilles intitulé + code ; ordre C1.1→C1.6 ; S2.1 puis S2.2 ; wrap                                       |
| **P2** | Constat individuel Phase 1 (C1.1) | **PASS** | Facultatif… ; + Preuve ou objet ; + Commentaire ; pas de ligne Phase 1 optionnelle ; Déjà attesté visible |
| **P3** | Succès individuel                 | **PASS** | « Preuve de compétence produite » ; carte Doe J. · date · item                                            |

---
