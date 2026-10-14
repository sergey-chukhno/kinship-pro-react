# FE-62 — Guide smoke catalogue (API staging Sergey)

Branche : `feat/fe-62-formation-catalogue`  
BE : staging avec PR #388 (`formation_catalog_entries` / imports)  
Maquettes : P4.3 / P4.3 bis V0.4

## Préparation

1. FE sur cette branche + `REACT_APP_DB_BASE_URL` pointant vers le BE staging (migré).
2. Compte **admin / superadmin / référent** d’une **School** ou **Company** réelle (plus de mock `of-demo`).
3. Connexion → switcher → choisir l’école ou l’entreprise.
4. Sidebar : **Créer → Formation** actif si contexte `school` ou `company`.

## Parcours smoke API

| # | Étape | Attendu |
|---|--------|---------|
| 1 | Catalogue de formations | Liste API (vide ou fiches) ; pas d’erreur org |
| 2 | Créer formation (sans MC) → fiche → brouillon / catalogue | `POST` draft puis `POST .../list` si complet |
| 3 | Case MC UE | Gate depuis `meta.eu_mc_gate` (setting / plan / trust / allowed) |
| 4 | MC UE compteur | `compliance.count` serveur sur la fiche (ex. 8/11) |
| 5 | Choisir une série | Liste F2 réelle (soft_skills, CPS, …) ; badges numériques |
| 6 | Titre déjà pris | 422 validation / message clash |
| 7 | Image | Ajouter une image → visible après brouillon / catalogue |
| 8 | Charger un tableau | Zone fichier seule ; analyze ; durée `N h` ; confirm |
| 9 | Retirer / supprimer | Carte catalogue → Retirer ; brouillon → Supprimer |
| 10 | RNCP (si flag on) | Blur code → snapshot serveur (sinon erreur) — voir CR Patrick |
| 11 | Ouvrir une session | CTA présent, pas de toast ticket 16 |

## Hors scope

- Ticket 16 (session depuis fiche)
- Merge staging FE sans GO Patrick
- Mock OF / `of-demo` (re-shelvé)
