# Guide smoke — Attester P2.13 Lot 2 (V1.4.1)

**Compte :** projet avec plusieurs participants (idéalement dont toi-même membre)  
**Entrée :** Affiche projet / Gestion projet / Sidebar « Attester une compétence »

---

## Prérequis

1. FE à jour (Lot 2 Attester).
2. Projet **en cours** avec ≥ 2 participants.
3. Optionnel : vider `localStorage` clé `attest:lastSeries:*` pour retester l’écran Série.

---

## S1 — Série (pastilles + groupes)

1. Ouvrir **Attester une compétence**.
2. Si aucune dernière série : écran **Dans quelle série ?**
   - Groupes : **Vos séries** → **Distribuées…** (placeholder vide) → **Catalogue Kinship**
   - Pastilles (une à la fois), pas de cases à cocher.
3. Choisir une série (ex. Compétences psychosociales ou transversales).
4. **PASS** si clic pastille → écran compétences (pas d’écran Axe).

---

## S2 — Compétences + pastilles Phase / niveaux

1. Toute la série visible ; axes en titres + chips **Tous les axes** / Cognitives…
2. Cartes avec pastilles **Phase 1 / Phase 2** (CPS) ou **Découverte / Appropriation** (soft skills) etc.
3. Clic pastille → participants (ou constat si entrée individuelle).
4. **PASS** si pas d’étape Axe dédiée ; pastille avance.

---

## S3 — Participants (sans soi)

1. Ta propre fiche **absente** de la liste.
2. « Tout sélectionner » OK ; sélectionner 1–3 personnes.
3. Continuer → Constat.
4. **PASS** si soi masqué.

---

## S4 — Constat + double-clic confirm

1. Cocher ≥ 1 constat (si items).
2. Bouton : **Attester — n participants** (1er clic).
3. Devient : **Confirmer — n participants · c’est définitif** (2e clic).
4. **PAS** d’overlay « Attester ces constats ? ».
5. Succès / preuves nées.
6. **PASS** si double-clic + copy « preuve(s) de compétence ».

---

## S5 — lastSeries (skip)

1. Rouvrir Attester **sur le même projet**.
2. Fenêtre s’ouvre **directement** sur les compétences de la dernière série.
3. Tag « dernière utilisée » visible si Retour → Série.
4. **PASS** si skip série ; Retour ramène à la série.

---

## Captures utiles 

| # | Écran |
| --- | --- |
| A1 | Série — pastilles + Distribuées placeholder |
| A2 | Compétences — pastilles Phase / axes |
| A3 | Participants — sans soi |
| A4 | Constat — bouton Confirmer (2e état) |
| A5 | Re-open — skip série (lastSeries) |

---

## Notes

- « Imprimer » / API autorités : hors Lot 2 FE.
- Entrée depuis fiche individuelle : pas d’écran participants (attendu).
- CPS : pastilles / hint = **Phase 1 / Phase 2** (pas Découverte / Appropriation — fix `getLevelLabel` + `catalog_key`).

## Reprises Patrick — smokes R1–R5

Guide dédié : `docs/fe-attest-lot2-reprises-patrick.md` (cartes parent + pastilles codes, succès, Distribuées, 0 coché, mots participants).
