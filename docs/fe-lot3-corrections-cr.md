# CR — Lot 3 corrections FE (envoi 1 Patrick)

**Branche FE :** `feat/fe-lot3-corrections`  
**Base :** `origin/staging`  
**Env :** FE staging (après PR) + API staging  
**Merge :** **après GO Patrick** (pas avant)

---

## Livré (FE)

| # | Point | Statut |
| --- | --- | --- |
| 1 | Boutons **Partenariat** / **Refuser** contenus dans la carte (`flex-wrap`) | OK |
| 2 | Paramètres : **Rejoindre une organisation** · **Mes organisations** | OK |
| 8 | Bandeau &lt;15 ans : copy courte Patrick | OK |
| 9 | Déclarer le début : phrase financeur **seulement si** `has_funders` | OK |
| 11a–f | Labels techniques → FR (rôles, classe, school/company types) | OK |
| 12 | Toast création élève FR (details utiles ou générique) | OK |
| 13a–d | Accords neutres + **Ajouter l'élève** (N=1) | OK |

---

## Hors FE

| # | Point | Note |
| --- | --- | --- |
| **15** | Bandeau « date de fin » le jour J | **Passé à Sergey** — correction BE `show_end_date_warning`. **FE inchangé.** |

---

## Détail technique utile (Sergey)

### Point 9
- Mapper session : `hasFunders: Boolean(p.has_funders)` dans `projectToFormationSession`.
- Modal « Déclarer le début » (affiche session + FormationAffiche) : phrase « Le financeur associé est informé du début. » **uniquement** si `session.hasFunders`.

### Point 12 — payload erreur création élève
- Toast cible : si `details` (string / array / object) contient un message **FR utile** → l’afficher ; sinon si `message` non-anglais → l’afficher ; sinon fixe : **« La création de l'élève n'a pas abouti. »**
- Cas observé Patrick : message EN du type *An error occurred while creating the student* → remplacé par le générique FR (à améliorer côté API avec `details` FR actionnable).

### Point 11
- Rôles : `translateRole` (`roleTranslations.ts`) — ex. `collegien` → Collégien, `secondary_school_teacher` / `secondary school teacher` → Professeur de collège/lycée.
- Classe élève : libellé = partie avant ` - ` (plus d’append `level.level`).
- Types org : `orgTypeLabels.ts` — `college` → Collège, `medico_social` → Médico-social, `information_et_orientation` → Information et orientation.

---

## Smokes (à faire sur staging après PR)

| # | Cas | Attendu |
| --- | --- | --- |
| S1 | Réseau · hover « + Ajouter un partenaire » / demandes | Boutons dans la carte |
| S2 | Paramètres · organisations | Titres organisation |
| S8 | Compte &lt;15 · TB | Nouveau bandeau |
| S9 | Session sans / avec financeur · Déclarer début | Phrase financeur si et seulement si funders |
| S11 | Élève / Créer / Adhésion / Partenaire / Participant | Labels FR |
| S12 | Création élève en erreur | Toast FR |
| S13 | Affiche projet · classe entière | Accords + bouton 1 élève |

### Captures (1 / point FE)
S’appuyer sur les LOT3_* Patrick + re-captures staging.

---

## Verdict

Lot 3 FE prêt pour PR staging. **Ne pas merger sans GO Patrick.** Point 15 = Sergey.
