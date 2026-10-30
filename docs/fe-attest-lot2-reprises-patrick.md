# Attester Lot 2 — 5 reprises Patrick (avant GO)

**Réponse Patrick :** 29/10/2026 — lu contre P2.13 V1.4.1  
**Branche :** `feat/fe-session-participants-import`  
**CR Lot 2 initial :** `docs/fe-attest-lot2-cr.md`

---

## Reprises livrées

| # | Écran | Correction |
| --- | --- | --- |
| **R1** | Compétence | Cartes = compétences parent (C1…) ; pastilles = CPS spécifiques (codes) ; Phase en étiquette ; stepper **« Compétence »** |
| **R2** | Succès | 1 carte (participant + date + items) + « Et n autres… » ; hiérarchie Terminer lien / Autre compétence clair / Même compétence plein |
| **R3** | Série | Groupe Distribuées masqué si vide ; sous-titre « Un constat, un ou plusieurs participants. » |
| **R4** | Constat | Bouton Attester **inactif** à 0 coché ; checklist aussi en **entrée individuelle** (fiche participant) |
| **R5** | Participants | « Sélectionner les participants. » ; `Rechercher…` ; code devant (`C1.6 · …`) |

---

## Question — 7 participants / liste à 5 (répondue smoke 29/10)

**Observé :** bandeau **7** · onglet **6** confirmés · Attester **5** (sans Alicia).  
Pas de préparé manquant dans Attester ; écart bandeau vs liste = stats `confirmed_members` (+1). Détail : `docs/fe-attest-lot2-reprises-cr.md`.

## Smokes 29/10

**R3 · R1 · R1b · R4 · R5 · R2 — tous PASS.** CR : `docs/fe-attest-lot2-reprises-cr.md`.

---

## Guide smoke R1–R5 (captures pour GO)

Compte : Alicia · Formation Google Test (ou projet ≥ 2 participants confirmés).

| # | Parcours | PASS si |
| --- | --- | --- |
| **R1** | CPS → écran Compétence | ~6 cartes parent (C1…S2) ; pastilles codes (C1.5, C1.1 et C1.2…) ; Phase 1/2 en étiquette ; stepper « Compétence » |
| **R1b** | Constat après pastille CPS | Libellé Phase 1 / Phase 2 (pas Découverte) |
| **R3** | Écran Série (vider lastSeries si besoin) | Pas de bloc « Distribuées… » vide ; sous-titre constat |
| **R5** | Participants | Copy + Rechercher… + `C1.x · titre` ; compter liste vs affiche ; noter le manquant |
| **R4** | Constat 0 coché | Attester gris/inactif → actif au 1er check → double-clic |
| **R2** | Après attestation (≥2 personnes) | 1 carte riche + « Et n autres » ; boutons hiérarchisés ; Autre compétence garde la sélection |

### Captures Patrick

| # | Écran |
| --- | --- |
| A2 | Compétence — cartes parent + pastilles codes |
| A2b | Constat — Phase 1/2 |
| A3 | Participants — mots |
| A4 | Constat — 0 coché (bouton inactif) |
| A5 | Succès — carte + suites |

---

## Fichiers

- `src/utils/cpsPastilleLabels.ts` (+ test)
- `src/utils/seriesTreeHelpers.ts` — `treeCompetencesAsCards`
- `src/components/Modals/AttestCompetenceModal.tsx`
- `src/components/Modals/BadgeAssignmentModal.css`
