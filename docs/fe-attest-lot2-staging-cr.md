# CR — Attester Lot 2 · smokes staging (après merge)

**Date :** 2026-10-30  
**Environnement :** FE staging (Vercel `staging`) + API staging  
**Merge :** `feat/fe-session-participants-import` → `staging` (Patrick GO 30/10)  
**URL FE :** `kinship-pro-react-env-staging-sergeychukhno-3185s-projects.vercel.app`  
**Compte :** Claire V. (directeur_entreprise · CFPJ)  
**Projet :** Journaliste — formation complète (RNCP40281) · **EN COURS** · 21 participants  
**Guide :** `docs/fe-attest-lot2-staging-smoke.md`  
**Message :** `docs/fe-attest-lot2-message-patrick-staging.md`

---

## Verdict

**Smokes ST1–ST6 : PASS** (après activation contrat CFPJ par Sergey).  
3 preuves de compétence créées en vrai sur staging. Captures A2 / A5 / A6 jointes au message.

---

## Parcours validés

| # | Parcours | Résultat | Détail |
| --- | --- | --- | --- |
| **ST1** | Série CPS | **PASS** | Sous-titre « Un constat… » ; pas de Distribuées vide ; org CFPJ |
| **ST2** | Compétence | **PASS** | Cartes parent ; pastilles intitulé + code ; Phase ; ordre C1.1… |
| **ST3** | Participants | **PASS** | « Sélectionner… » ; `Rechercher…` ; code devant ; Claire absente (20 = 21 − soi) |
| **ST4** | Constat 0→1 | **PASS** | Attester inactif à 0 ; actif à 1 ; Confirmer |
| **ST5** | Succès ×2 | **PASS** | 2 preuves ; carte + « Et 1 autre… » ; hiérarchie boutons |
| **ST6** | Entrée individuelle | **PASS** | Facultatif… ; succès « Preuve de compétence produite » (Camille) |

### Captures

| # | Écran |
| --- | --- |
| A2 | Compétence — pastilles intitulé + code |
| A5 | Succès groupe (2 preuves) |
| A6 | Succès individuel (singulier) |

---

## Créé sur staging

| # | Type | Compétence | Destinataire(s) | Projet | Date |
| --- | --- | --- | --- | --- | --- |
| 1 | Preuve de compétence | C1.1 et C1.2 · Renforcer sa connaissance de soi et penser de façon critique | Diego B. | Journaliste — formation complète (RNCP40281) | 30/10/2026 |
| 2 | Preuve de compétence | idem | Sami P. | idem | 30/10/2026 |
| 3 | Preuve de compétence | idem | Camille A. | idem | 30/10/2026 |

**Org attestante :** CFPJ (contrat actif).

---

## Incidents smoke (résolus / notés)

1. **ST5 premier essai** — toast `Organization must have an active contract to assign badges` (CFPJ sans contrat). **Sergey a activé le contrat** → rejeu OK.
2. **ST6** — toast `Veuillez sélectionner une organisation` si multi-org + skip Série (lastSeries) : le sélecteur org n’apparaît qu’à l’étape Série. **Contournement :** Retour → Série → choisir **CFPJ**. À traiter en FE (afficher le sélecteur hors étape 0) — hors blocage GO staging.

---

## Hors scope (inchangé)

- lastSeries serveur · Distribuées (`series_owner`) · autorités  
- Fix UX sélecteur org en entrée individuelle / lastSeries (ticket FE suivant)
