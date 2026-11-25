# CR — Lot 3 envoi 2 corrections FE

**Branche FE :** `feat/fe-lot3-envoi2`  
**Base :** `origin/staging` (envoi 1 déjà mergé)  
**Env :** FE staging (après PR) + API staging  
**Merge :** **après GO**

---

## Livré (FE)

| # | Point | Statut |
| --- | --- | --- |
| 01a/b | Accepter/Refuser · Se rattacher/Partenariat **sans hover** | OK |
| 03 | Mes écoles **En attente** après demande · refresh **Changer d'organisation** sans reload | OK |
| 05a/b | **Gérer →** preuves → reste **Espace de gestion** (plus `project-management`) | OK |
| 08 | Bandeau &lt;15 : **vos preuves de compétence** (singulier) | OK |
| 18a/b/c | Affiche → **fiche de la session** (titre, bouton, phrase séances) | OK |

---

## Hors scope / en attente

| # | Point | Note |
| --- | --- | --- |
| **07a/b** | Ouvrir la preuve · même interrupteur Preuve Projet 
| **En attente Patrick** — non codé dans cette poussée |

---

## Détail technique

### 01
- [`OrganizationCard.css`](src/components/Network/OrganizationCard.css) : actions carte toujours visibles (`opacity`/`visibility` permanents), containment `flex-wrap` conservé.

### 03
- [`OrganizationsSection.tsx`](src/components/Settings/OrganizationsSection.tsx) : mapping `my_status`/`status` ; après `joinSchool`, reload + **optimistic** `pending` si l’API omet la ligne ; `getCurrentUser` + `setUser` pour rafraîchir `available_contexts` ; refresh au `window focus`.
- **Hotfix staging :** boucle clignotement (deps `showError` + `setIsLoading(true)` à chaque load) — corrigée : loader stable via refs, refresh **silent** (pas de plein écran « Chargement… »).

### 05
- [`ProjectSpacePage.tsx`](src/components/Pages/ProjectSpacePage.tsx) : tile Preuves ne navigue plus vers `/project-management` — reste sur `/project-space` onglet Gestion.

### 08
- [`Dashboard.tsx`](src/components/Pages/Dashboard.tsx) : `vos preuves de compétence`.

### 18
- Titre **Fiche de la session** (`FormationSessionAffichePage`, `FormationAffiche`)
- CTA **Voir la fiche de la session →** (`FormationSessionSpacePage`, `FormateurSessionTodoTile`)
- Phrase séances Patrick exacte (`FormationSessionSpacePage`)

---

## Smokes (après PR staging)

| # | Cas | Attendu |
| --- | --- | --- |
| S01 | Réseau · cartes / demandes | Boutons visibles **sans** hover |
| S03 | Paramètres · Rejoindre une école | **En attente** dans Mes écoles ; switcher maj sans F5 |
| S05 | Espace projet · Gérer → preuves | Reste Espace de gestion |
| S08 | Compte &lt;15 · TB | Singulier compétence |
| S18 | Session · titre / espace / phrase | « fiche de la session » |

---

## Verdict

5 points FE prêts pour PR staging. 
**07 reporté** (attente réponse). 
**Pas de merge sans GO.**
