# FE-62 — Guide smoke catalogue formations (mocks locaux)

Branche : `feat/fe-62-formation-catalogue`  
Maquettes : **P4.3 V0.4** + **P4.3 bis V0.4** (13/10)  
Prérequis : compte avec contexte OF (`showingPageType === 'of'`), localStorage catalogue seedé au premier chargement.

Les APIs Sergey ne sont **pas** branchées : `FormationCatalogue.ts` + `formationCatalogueStore` (localStorage).

## Préparation

1. `npm start` sur cette branche (hot reload).
2. Connecte-toi (ex. Alicia école).
3. Bas gauche / switcher d’orgas → choisir **Atelier Numérique Formation** (OF mock).
4. **Attendu :** thème pétrole, dashboard « Espace organisme de formation », actions Catalogue / Sessions.
5. Optionnel — reset catalogue démo console :  
   `localStorage.removeItem('kinship.formationCatalogue.v1'); location.reload()`  
   (rechoisir l’OF dans le switcher après reload si besoin)

## Parcours smoke (session Patrick / V0.4)

| # | Étape | Attendu |
|---|--------|---------|
| 1 | Dashboard OF | Tuiles **Catalogue** + **Sessions** ; pas de mention ticket 16 / hub |
| 2 | Catalogue | Cartes seed ; **pas** de ligne « aucun programme · ticket 16 » ; **pas** de légende Contour or ; CTA « Ouvrir une session → » sans toast d’indispo |
| 3 | Créer → Formation (sans MC) | Create : org « ✓ Organisme de formation certifié » ; **pas** « Trois choix… » / Qualiopi / « bientôt disponible » ; Continuer → bandeau `Formation · {org}` ; Jury **Non** sélectionné |
| 4 | Créer → Formation + MC UE | Case cochée → compteur **4/11** + phrase V0.4 ; fiche : compteur **incrémental** (ex. titre+durée+éval+modalité sans programme → **8/11**) ; &lt; 9 → « n’est pas complet » ; 9/11 → phrase inscrits |
| 4b | Retouches Patrick (14/10) | Import contrôle : durée **« 21 h »** ; chargement : **zone fichier seule** (pas de bouton natif / « Aucun fichier choisi ») |
| 5 | Titre déjà pris | Message clash org |
| 6 | Charger un tableau | Bandeau **Charger un tableau** ; `.xlsx` **accepté** (aperçu mock serveur, pas de refus convert) ; CSV → preview 4 compteurs ; pas de wording mock/convert/MC UE |
| 7 | Ouvrir une session | CTA présent ; **pas** de toast ticket 16 |

## Flags mock (serveur fictif)

Dans `src/api/FormationCatalogue.ts` :

- `eu_mc_gate.allowed` + `reason`: `setting` \| `plan` \| `trust`
- `certification_links_enabled`: champ RNCP fiche + colonne import ignorée si `false`

## Hors scope smoke

- Merge staging, APIs réelles, ticket 16 (session depuis fiche), CR merge Patrick.
- Re-shelve OF avant merge staging.
