# CR — Lot 2 corrections FE

**Branche FE :** `feat/fe-lot2-corrections`  
**Base :** `origin/staging`  
**GO Patrick :** lot de 5 + note correctif séances (hors lot)

---

## Livré

| # | Point | Statut |
| --- | --- | --- |
| 1 | TB structure : **Tableau de bord — {org}** | OK |
| 2 | Financeurs vides : rien sous le titre (plus de doublon) | OK |
| 3 | **1 preuve de compétence** · tuile/onglet **Preuves de compétence** | OK |
| 4 | Session TERMINÉE : plus de **+ Créer une séance** (header + onglet) | OK |
| 5 | Fiche événement : pas de blocs « Aucune image / description / participant » | OK |

---

## Captures attendues (1 / point)

1. TB — tiret  
2. Affiche financeurs vides  
3. Affiche + tuile « compétence » singulier  
4. Session `#82` TERMINÉE sans Créer une séance  
5. Fiche événement sans empty states  

---

## Note Patrick / Sergey — correctif séances (après lot 2, hors cette poussée)

Priorité Patrick : heures de séance saisissables (création + édition + liste).  
**Le serveur ne garde pas encore les heures** (pas d’API séances / champs horaires) — aujourd’hui `09h00 — 12h30` est un défaut FE local. Persistance API à voir avec Sergey ; FE local possible en attendant. Aucune modif BE dans cette poussée.

---

## Verdict

Lot 2 prêt smoke staging après merge. Correctif heures séances = poussée suivante.
