# CR — Attester une compétence (Lot 2) — P2.13 V1.4.1

**Branche :** `feat/fe-session-participants-import`  
**Nature :** FE Attester aligné maquette P2.13 V1.4.1 — pas de nouveau contrat API  
**Maquette :** `docs/maquettes/P2.13_KIN_UX_ATTESTER_COMPETENCE_V1_4_1.html`  
**Réponses Sergey :** `docs/fe-attest-sergey-questions.md` (2026-10-28)  
**Compte smoke :** Alicia Cordial · projet Formation Google Test  
**Tests auto :** `attestLastSeries.test.ts` · `badgeLevelLabels.test.ts` · `cpsSeries.test.ts` — **PASS**  
**Notes / guide :** `docs/fe-attest-lot2-notes.md` · `docs/fe-attest-lot2-smoke-guide.md`  
**Reprises Patrick (29/10) :** `docs/fe-attest-lot2-reprises-cr.md`  
**Poussée GO finale (30/10) :** `docs/fe-attest-lot2-go-finale-cr.md` · message dans `docs/fe-attest-lot2-message-patrick.md`

---

## Livré (Lot 2)

| Point | Statut |
| ----- | ------ |
| Plus d’étape wizard **Axe** (axes = titres + chips filtre sur l’écran compétence) | **OK** |
| Pastilles niveaux / **Phase 1–2** (CPS) — clic → participants ou constat | **OK** |
| Confirm en **double clic** sur le même CTA (overlay « Attester ces constats ? » retiré) | **OK** |
| Skip série si **dernière connue** (`localStorage` `attest:lastSeries:{userId}:{projectId}`) / une seule série ; tag « dernière utilisée » | **OK** |
| Masquer **soi-même** dans la liste participants | **OK** |
| Groupe « Distribuées par vos autorités » — **placeholder** vide (attendre `series_owner` BE) | **OK** |
| Copy « preuve(s) de **compétence** » (compétence au singulier) | **OK** |
| Fix cosmétique CPS : pastilles / hint **Phase 1 / Phase 2** (plus Découverte / Appropriation via clé `key:` / `id:`) | **OK** |

### Hors Lot 2 FE (ticket BE / reporté)

- Persistance last-series **serveur**
- Peupler « Distribuées… » (`series_owner` / authority_*)
- Imprimer / actions PDF hors scope

---

## Smokes locaux (2026-10-28) — S1–S5 PASS

Projet : **Formation Google Test** · Alicia.

| # | Parcours | Résultat | Détail observé |
| --- | --- | --- | --- |
| **S1** | Série — pastilles + groupes | **PASS** | Vos séries / Distribuées (vide) / Catalogue · pastille → compétences (pas d’Axe) |
| **S2** | Compétences + pastilles | **PASS** | Axes en titres + chips filtre · pastille avance · *(fix post-smoke : labels CPS → Phase 1/2)* |
| **S3** | Participants sans soi | **PASS** | Fiche Alicia absente · sélection multi OK |
| **S4** | Constat + double-clic | **PASS** | CTA → Confirmer · pas d’overlay · copy preuve(s) de compétence |
| **S5** | lastSeries skip | **PASS** | Re-open → compétences direct · tag « dernière utilisée » au retour Série |

### Captures pour Patrick (A1–A5)

| # | Écran |
| --- | --- |
| A1 | Série — pastilles + Distribuées placeholder |
| A2 | Compétences — pastilles **Phase 1 / Phase 2** (CPS) + axes |
| A3 | Participants — sans soi |
| A4 | Constat — bouton Confirmer (2e état) |
| A5 | Re-open — skip série (lastSeries) |

---

## Fichiers clés

- `src/components/Modals/AttestCompetenceModal.tsx`
- `src/components/Modals/BadgeAssignmentModal.css` (pastilles / layout P2.13)
- `src/utils/attestLastSeries.ts` (+ test)
- `src/utils/badgeLevelLabels.ts` (+ test — `key:competences_psychosociales` → Phase)
- `docs/fe-attest-sergey-questions.md`
- `docs/fe-attest-lot2-notes.md`
- `docs/fe-attest-lot2-smoke-guide.md`

---

## Suite

**GO** sur Lot 2 Attester (écrans) → tickets BE Sergey (`series_owner`, last-series serveur) quand priorisés.
