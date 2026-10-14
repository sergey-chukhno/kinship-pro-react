# CR Patrick — Ticket 62 · Branchement API staging

**Branche FE :** `feat/fe-62-formation-catalogue`  
**BE :** staging `aca75e8` (PR #388 Sergey) — **aucune modif BE de notre côté**

## Fait

1. UI V0.4 + retouches (compteur incrémental / `21 h` / zone fichier) — smoke OK.
2. **Branchement API** : façade `FormationCatalogue.ts` → endpoints `formation_catalog_entries` + imports (FormData CSV/xlsx tel quel).
3. Mapping FE↔BE (`listed`↔`catalog`, modalités, financement, `compliance` serveur).
4. Org porteuse = **School | Company** du contexte courant (mock `of-demo` **re-shelvé**).
5. Tests unitaires mapper + façade axios.

## Questions produit (pour toi)

1. **`formation_organizations` dans `available_contexts`**  
   Absent côté BE aujourd’hui. Le FE utilise School/Company.  
   Faut-il une **liste OF dédiée** dans le payload user (switcher « espace organisme de formation »), ou School/Company suffisent ?

2. **`eu_mc_gate`**  
   Le FE envoie **toujours** `organization_type` + `organization_id` sur le GET index pour lire `meta.eu_mc_gate`.  
   Un **endpoint flags dédié** te semble utile, ou le meta index suffit ?

## Smoke à rejouer (API)

Voir `docs/fe-62-smoke-guide.md` — compte admin School/Company + BE staging.

## Suite

- Ton GO avant merge staging FE  
- Ticket 16 (session) hors scope  
- Gaps techniques BE éventuels → message séparé à Sergey (aucun patch BE de notre part)
