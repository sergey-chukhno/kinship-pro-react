# CR — Attester Lot 2 · 5 reprises (avant GO)

**Branche :** `feat/fe-session-participants-import`  
**Réponse :** 29/10/2026 — lu contre P2.13 V1.4.1  
**Compte smoke :** Alicia Cordial · Formation Google Test  
**Date smokes :** 29/10/2026

---

## Contexte

Patrick a validé le geste Lot 2 (4 temps, second clic, soi absente, lastSeries, copy) et demandé **cinq reprises** + réponse sur l’écart **7 participants / liste à 5**, avant GO merge.

---

## Reprises livrées

| #      | Écran        | Correction                                                                                                                                                              | Statut |
| ------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **R1** | Compétence   | Cartes = compétences parent (C1…S2) via tree API ; pastilles = CPS spécifiques (codes) ; Phase en étiquette ; stepper toujours **« Compétence »**                       | **OK** |
| **R2** | Succès       | 1 carte (participant · date · items) + « Et n autres — voir les n preuves » ; Terminer = lien ; Autre compétence = clair ; Même compétence, autres participants = plein | **OK** |
| **R3** | Série        | Groupe « Distribuées… » masqué si vide ; sous-titre « Un constat, un ou plusieurs participants. »                                                                       | **OK** |
| **R4** | Constat      | Attester **inactif** à 0 coché ; checklist aussi en **entrée individuelle** (fiche participant — bug corrigé 29/10)                                                     | **OK** |
| **R5** | Participants | « Sélectionner les participants. » ; `Rechercher…` ; code devant (`S1.2 · …`)                                                                                           | **OK** |

### Correctif bonus smoke

En entrée **individuelle** (Attester depuis une carte participant), les items de constat n’étaient pas rendus alors que le compteur affichait `0/n` et bloquait le CTA. Checklist branchée sur le même `ChecklistItems` que le mode groupe.

---

## Smokes locaux (2026-10-29) — R1–R5 + R1b + R2 PASS

| #       | Parcours         | Résultat | Détail                                                                                            |
| ------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------- |
| **R3**  | Série            | **PASS** | Sous-titre constat ; pas de Distribuées vide ; Catalogue Kinship seul                             |
| **R1**  | Compétence CPS   | **PASS** | 6 cartes parent C1–S2 ; pastilles codes ; Phase 1/2 étiquette ; stepper « Compétence »            |
| **R1b** | Constat labels   | **PASS** | `C1.5 · … · Phase 1` (pas Découverte)                                                             |
| **R4**  | 0 coché → attest | **PASS** | Individuel Doe John + groupe Fisher/Bodin ; Attester inactif → 1 coché → Confirmer → succès       |
| **R5**  | Participants     | **PASS** | Copy + Rechercher… + `S1.2 · …` ; Alicia absente ; 5 listés                                       |
| **R2**  | Succès ×2        | **PASS** | 1 carte Fisher + « Et 1 autre… » ; Terminer lien ; Autre compétence clair ; Même compétence plein |

---

## Question — 7 vs 5

**Observé smoke (Formation Google Test) :**

| Source              | Nombre                                                      |
| ------------------- | ----------------------------------------------------------- |
| Bandeau projet      | **7** participants                                          |
| Onglet Participants | **(6)** confirmés (Alicia + Doe, Fisher, Alice, Leo, Bodin) |
| Liste Attester      | **5** (confirmés hors Alicia)                               |

**Conclusion :** pas un 6ᵉ confirmé « manquant » dans Attester.  
Attester = 6 confirmés − soi (Alicia) → **5**.  
Le **7** du bandeau vient du compteur stats (`confirmed_members` / overview), **décalé d’1** par rapport à la liste réelle de l’onglet — pas un préparé visible (`+0 en attente`). À croiser côté BE / stats si besoin ; hors blocage GO FE.

---

## Hors scope (inchangé — Sergey)

- lastSeries serveur
- Peupler « Distribuées… » (`series_owner`)
- Autorités / Imprimer

---

## Fichiers clés

- `src/utils/cpsPastilleLabels.ts` (+ test)
- `src/utils/seriesTreeHelpers.ts` — `treeCompetencesAsCards`
- `src/components/Modals/AttestCompetenceModal.tsx`
- `src/components/Modals/BadgeAssignmentModal.css`

**Tests auto :** `cpsPastilleLabels` · `seriesTreeHelpers` · `badgeLevelLabels` — PASS

---

## Poussée GO finale (30/10) — avant merge

| Point | Correction |
| --- | --- |
| Écran 2 pastilles | Intitulé fiche + code (mot pour mot) ; ordre SPF ; wrap CSS |
| Succès individuel | « Preuve de compétence produite » (singulier) |
| Constat individuel | « Facultatif — rien n’est exigé » + « + Preuve ou objet » / « + Commentaire » ; plus de ligne « Phase 1 — commentaire… » ; bandeau Déjà attesté **conservé** |

Smokes **P1–P3 PASS** (30/10) — détail : `docs/fe-attest-lot2-go-finale-cr.md`.  
Capture A2 → GO Patrick → merge.

---
