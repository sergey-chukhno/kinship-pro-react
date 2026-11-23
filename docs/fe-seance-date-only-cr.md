# CR — Séances : date seule (plus de 09h00 — 12h30)

**Branche FE :** `feat/fe-seance-date-only`  
**Base :** `origin/staging`  
**GO Patrick :** 23/11 — date seule tant que le serveur ne garde pas les heures

---

## Livré

- Plus de défaut / affichage **`09h00 — 12h30`** sur les séances de session formation (mapper, store, liste affiche, carte TB formateur, meta financeur).
- Liste séances : **date seule** (+ lieu si présent).
- **Pas** de saisie d’heures (attend l’API Sergey). Aucune modif BE.

---

## Smoke

| # | Cas | Attendu |
| --- | --- | --- |
| 1 | Affiche session · onglet Séances | Ligne type `10/11/2026` · **pas** d’horaires |
| 2 | Création / Séance 1 | Pas de faux créneau dans la liste |

---

## Verdict

Petite poussée conforme. Prêt merge staging.
