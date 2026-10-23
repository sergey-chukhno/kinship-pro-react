# CR — Ajouter un participant (P4.4 écran seul)

**Branche :** `feat/fe-session-participants-import`  
**Commit :** `d5b8785` — `feat(fe): P4.4 add participant panel on session space.`  
**Maquette :** P4.4 V0.1 zoom A / B / C (Patrick)  
**Date smokes :** 2026-10-23  
**Compte / session :** Claire · IMPORT EXCEL COMPLET · School #56016 · Antoine Morel  

---

## Intégration BE — non faite

L’écran est **FE seul** : append local via `updateFormationSession` (store session).  
**Aucun POST / contrat API** n’est branché.  
Le branchement attendra le **contrat Sergey** (mêmes trois points / famille que l’import participants P4.2).

---

## Livré

| Point | Statut |
| ----- | ------ |
| Entrée depuis espace session → Gestion → **+ Ajouter un participant** | **OK** |
| Modale : Nom · Prénom · Date de naissance · E-mail (tous obligatoires) | **OK** |
| Hint : « La personne est prévenue par e-mail… » | **OK** |
| Warning « Date de naissance : moins de 15 ans. » sans blocage | **OK** |
| Après Ajouter → ligne **inscrit** (même rendu que l’import, 1 personne) | **OK** (local) |
| Intégration API BE | **non faite** — attend contrat Sergey |

**Composant :** `AddSessionParticipantModal`  
**Tests auto :** 5/5 PASS (`AddSessionParticipantModal.test.tsx`)

---

## Smokes locaux (2026-10-23)

| # | Parcours | Résultat | Détail |
| - | -------- | -------- | ------ |
| **S1** | Ouvrir panneau | **PASS** | 4 champs ✱ · hint · Annuler / Ajouter |
| **S2** | DOB &lt; 15 ans | **PASS** | Warning ambre · Ajouter actif |
| **S3** | Annuler | **PASS** | Participants (0) inchangé |
| **S4** | Ajouter adulte (Léa Martin) | **PASS** | Participants (1) · inscrit |
| **S5** | Ajouter &lt; 15 ans (Nadia Benali) | **PASS** | Participants (2) · les deux inscrits |

---

## Hors scope

- POST / contrat Sergey  
- Soft-delete, rapprochement, templates Postmark  
- Options de la session  
- Genre du statut (« inscrite ») — label FE **inscrit**
