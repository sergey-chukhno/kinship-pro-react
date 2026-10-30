# Questions Sergey — Attester P2.13 (Patrick en copie)

**Envoyées :** après GO Lot 1 (clôture mock)  
**Réponses Sergey :** 2026-10-28  

---

## Q1 — Dernière série

**Réponse :** pas de champ API dédié (`last_series` / préférence user×projet).

- En attendant : **localStorage FE** (ou state session) — plan validé.
- Clé FE : `attest:lastSeries:{userId}:{projectId}` → `badge_series_id` et/ou `catalog_key` + nom.
- Proche mais ≠ contrat : `program_snapshot` (séries du programme) ; heuristique via dernier badge de `GET …/projects/:id/badges`.
- Vrai « last used » persistant → **ticket BE** plus tard.

## Q2 — Phase d’une compétence

**Réponse :** pas de `phase` sur `SeriesTreeCompetence`.

- Tree : `id`, `name`, `code`, `position`, `badges[]` (`id`, `name`, `level`, `level_label`).
- CPS : phase seed = `level` (`level_1` / `level_2`) ; série `level_label: "Phase"` → affichage « Phase 1 / Phase 2 ».
- **FE :** dériver depuis `badges[].level` (+ `level_label`). Pas d’attente d’un champ `phase` sur la compétence.

## Q3 — « Distribuées par vos autorités »

**Réponse :** `catalog_key` ≠ autorités.

| Signal actuel | Bucket FE |
| --- | --- |
| `catalog_key` présent | Catalogue Kinship |
| `catalog_key` null (+ série org) | Vos séries (heuristique) |

Modèle BE non exposé aujourd’hui : `badge_series.series_owner` (`KINSHIP` \| `ORGANIZATION` \| `AUTHORITY`), `authority_entity_*`, `org_series_access.access_source = authority_grant`.

`GET /api/v1/badges` (et tree) n’exposent **pas** `series_owner` / autorités → bucket **vide / placeholder** jusqu’à ticket BE.

---

## Message d’origine (réf.)

Sergey — questions FE Attester P2.13 (Rimma / Patrick en copie)

1. **Dernière série** : champ API ? Shape `badge_series_id` / `catalog_key` + nom. En attendant localStorage FE.
2. **Phase** : dériver depuis badges ou ajouter `phase` sur le nœud ?
3. **Distribuées par vos autorités** : quel champ / endpoint ?

Merci.
