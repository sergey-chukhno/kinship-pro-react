# CR Patrick — Ticket 62 · Branchement API staging (complété)

**Branche FE :** `feat/fe-62-formation-catalogue`  
**BE :** staging PR #388 — **aucune modif BE**

## Fait (intégration)

- Façade API : index / show / create / update / list / withdraw / delete / imports / template  
- Org = **School | Company** (`of-demo` re-shelvé)  
- Compteur MC depuis `compliance` serveur  
- **Série programme** : arbres F2 (`badge_series/by_key/:catalog_key/tree`) — plus de DigComp mock  
- **Image** : `main_picture` via PATCH multipart  
- **Retirer** / **supprimer brouillon** sur le catalogue  
- Store localStorage catalogue **purgé**  
- Tests unitaires façade + mapper élargis  

## Lookup RNCP / RS — signalement

Le FE **n’a pas** de client registre France Compétences dédié.

Comportement actuel : au blur du champ code, le FE envoie un **PATCH** fiche avec `targeted_certification_code` ; le BE (`FormationCatalog::CertificationApplier` + `RegistryLookup`) applique le snapshot.

**Question :** ce flux PATCH suffit-il pour l’UX (lecture registre à la saisie), ou veux-tu un **endpoint GET preview** dédié (lookup sans enregistrer) avant le blur/save ?

Si le flag `certification_links_enabled` est off, le champ reste masqué (meta index).

## Autres questions produit (inchangées)

1. Faut-il une liste **`formation_organizations`** dédiée dans le payload user, ou School/Company suffisent ?  
2. `eu_mc_gate` via meta index (org toujours envoyée) vs **endpoint flags** dédié ?

## Smoke

Voir `docs/fe-62-smoke-guide.md` (School/Company + BE staging).  
Ajouts à vérifier : choisir une série F2, image, retirer / supprimer brouillon, code RNCP si flag on.

## Hors scope

- Ticket 16 (session)  
- Merge staging FE sans ton GO  
