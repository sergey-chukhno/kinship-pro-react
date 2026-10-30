# Guide smoke staging — Attester Lot 2 (après merge)

**Merge :** `feat/fe-session-participants-import` → `staging` (Patrick GO 30/10)  
**Commit tip staging :** `ff2f6ad` (merge)  
**Environnement :** FE staging (Vercel, branche `staging`) + API staging  
**Compte :** Alicia (ou compte école staging habituel)  
**Attendre :** déploiement Vercel vert sur `staging` avant de commencer

---

## Objectif Patrick

1. Rejouer les smokes **sur staging** (pas en local).  
2. Lui rendre la **liste de ce que tu y crées** (preuves / constats).

---

## Prérequis

1. FE staging à jour (commit merge visible / deploy OK).
2. Projet **en cours** avec ≥ 2 participants confirmés (idéalement dont toi).
3. Optionnel : vider `localStorage` `attest:lastSeries:*` pour retester l’écran Série.

---

## Parcours smoke (ordre recommandé)

| # | Parcours | PASS si | Créé / noté |
| --- | --- | --- | --- |
| **ST1** | Série CPS | Sous-titre « Un constat… » ; pas de Distribuées vide ; stepper « Compétence » | — |
| **ST2** | Compétence | Cartes parent C1…S2 ; pastilles **intitulé + code** ; ordre C1.1… ; Phase étiquette | Capture A2 |
| **ST3** | Participants (mode projet) | « Sélectionner… » ; `Rechercher…` ; code devant ; soi absente | Compte liste |
| **ST4** | Constat 0→1 | Attester inactif à 0 ; actif à 1 ; double-clic | — |
| **ST5** | Succès ×2 (groupe) | 1 carte + « Et n autres… » ; Terminer lien ; Même compétence plein | **2 preuves** (noter noms) |
| **ST6** | Entrée fiche 1 participant | Facultatif… + boutons ; succès « Preuve de **compétence** produite » | **1 preuve** |

Hors Attester (déjà sur la branche, smoke rapide si temps) : clôture session **mock** — ne crée pas de preuve BE réelle.

---

## Liste à remplir — « ce que tu y crées » (staging)

À coller dans le message Patrick après smokes.

| # | Type | Compétence / badge | Destinataire(s) | Projet | Date | Preuve / id si visible |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Preuve de compétence | _ex. S1.2 · …_ | _Fisher B., Bodin L._ | _…_ | _jj/mm_ | _PB·… ou n°_ |
| 2 | | | | | | |
| 3 | | | | | | |

**Comptes / org utilisés :**  
**URL staging :**  
**Écarts / bugs :** aucun / …

---

## Captures utiles

| # | Écran |
| --- | --- |
| A2 | Compétence — pastilles intitulé + code |
| A5 | Succès groupe |
| A6 | Succès individuel (singulier) |
