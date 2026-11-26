# CR — Preuves étape 1 · Socle (V1.8.7)

**Branche FE :** `feat/fe-preuves-etape-1`  
**Base :** `origin/staging` (envoi 2 déjà mergé)  
**Sources :** 34 V1.8.7 · P6.1 V0.14.2 (10, 15, 40–43, 48–49, partie 8) · téléphone V0.15.1 partie 5 B · ref V1.5  
**API :** fixtures mock (Sergey étape 2 absente) · `REACT_APP_PROOF_PAGE_API=1` pour brancher plus tard  
**Merge :** **après GO Patrick**

---

## Livré

| Zone | Statut |
| --- | --- |
| Types + reader unique (règle 9) | OK — `types/proofPage.ts`, `api/proofPage.ts` |
| Fixtures smoke | OK — tokens `demo-*` + project `101` / `102` |
| Shell page `/proof/:token` + `/proof/project/:id` | OK |
| Bande · bandeau · Titulaire (4 cas) · repères · vérif · onglets · zone titulaire · pied | OK |
| Interrupteurs (flags JSON, défaut off) | OK |
| noindex | OK — meta `robots=noindex,nofollow` à l’ouverture |
| 404 / 410 | OK — pages neutres proposées |
| CSS variables DS | OK — `styles/proof-page-tokens.css` (pas de hex dans les composants UI) |

---

## Propositions (1.8 — à trancher)

1. **noindex :** balise `<meta name="robots" content="noindex, nofollow">` injectée au mount de `ProofPageRoute` (pas de SSR).
2. **Reprise vs création :** nouvelle coquille `ProofPage/` (mots **Titulaire**) ; `/pb` `/pe` + `ProofFullView` **inchangés** (hors périmètre 6 étapes). Patterns tabs inspirés de `ProjectProofDetail`, sans réutiliser « Porteur ».
3. **Route titulaire proposée :** `/proof/project/:projectId` → `GET /api/v1/projects/:id/proof`.
4. **404 :** « Preuve introuvable » · **410 :** « Lien supprimé » (textes ci-dessus ; Patrick tranche).

---

## Smokes locaux (fixtures)

| URL | Cas |
| --- | --- |
| `/proof/demo-link` | Visiteur · écran 10 |
| `/proof/demo-holder` ou `/proof/project/101` | Titulaire · 15 |
| `/proof/demo-masked` · `demo-initial` · `demo-erased` | Titulaire 40–42 |
| `/proof/demo-sharing-closed` ou `/proof/project/102` | 43 email non vérifié |
| `/proof/demo-exportable-gated` | ★ caché (flag off) |
| `/proof/demo-flags-on` | Interrupteurs allumés |

---

## Hors scope (étapes suivantes)

Contenu riche Formation / MC / Projet / Stage · partage API · miniatures · carte téléphone · « Ouvrir la preuve » (07) · Après Vérifier · Compétence / Présence / Certification.
