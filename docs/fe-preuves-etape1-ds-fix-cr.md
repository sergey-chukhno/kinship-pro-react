# CR — Preuves étape 1 · correctif DS + 404/410 + fixtures prod

**Branche FE :** `feat/fe-preuves-etape1-ds-fix`  
**Base :** `origin/staging` (étape 1 déjà mergée)  
**Mail Patrick :** 27/11 (avant GO étape 2)  
**Merge :** **après GO Patrick**

---

## 1. Fixtures vs production (garantie)

| Env | Comportement |
| --- | --- |
| **Production** | `REACT_APP_PROOF_PAGE_FIXTURES` **non défini** ou `=0` → **aucune fixture** ; token inconnu → **404** |
| **Staging** | `REACT_APP_PROOF_PAGE_FIXTURES=1` sur le projet Vercel staging (à confirmer / poser) |
| **Local** | fixtures ON si `NODE_ENV !== 'production'` |

Code : [`src/utils/proofPageEnv.ts`](../src/utils/proofPageEnv.ts) · [`src/api/proofPage.ts`](../src/api/proofPage.ts).  
Sans le flag staging, les `demo-*` ne répondraient plus non plus en build prod-like.

---

## 2. 404 / 410

| Cas | Texte | Pied | noindex |
| --- | --- | --- | --- |
| 404 | « Cette page n'est pas disponible. » | kinshipedu.fr + © | oui |
| 410 | « Ce lien a été supprimé. Vous pouvez en demander un nouveau à la personne concernée. » | idem | oui |

Fixture 410 : `/proof/demo-gone`

---

## 3–13. Design System (variables `--ppg-*`)

| # | Point | Fait |
| --- | --- | --- |
| 3 | Grand bandeau dégradé hero, sceau 104, titre blanc 34/800, dates 78 % | OK |
| 4 | ★ rond or + contour page 2px (même interrupteur) | OK · `demo-exportable` |
| 5 | Masqué / effacé · avatar soft + `?` / nom muted | OK |
| 6 | Repères contour teinte bande `#C3DCC6` | OK · `demo-two-markers` |
| 7 | QR navy sur blanc, cadre line | OK |
| 8 | Zone titulaire **après** onglets · Partager/Montrer 50 % · pilules | OK |
| 9 | Pied 2 lignes · discover gauche · © droite | OK |
| 10 | Pastille OF certifié corail / ink navy | OK |
| 11 | Téléphone plein blanc · bande K 22 · accordéon « Détails et vérification » · n° coupé après pays | OK |
| 12 | Repères ellipsis, 16/12.5 | OK |
| 13 | Pied téléphone = poste | OK |

---

## Captures smoke (Patrick §14)

| Point | URL poste | Téléphone |
| --- | --- | --- |
| 3 visiteur + vérif | `/proof/demo-link-verify` | idem |
| 4 exportable | `/proof/demo-exportable` | |
| 5 + droits | `/proof/demo-sharing-closed` | |
| 6 deux cases | `/proof/demo-two-markers` | |
| 404 | `/proof/token-inconnu` | |
| 410 | `/proof/demo-gone` | |
| 8–9 | recherche DevTools : hex hors tokens / mots interdits | |

---

## Rappel étape 2 (noté)

« Ouvrir ↗ » sous le lien formation, jamais `/pb` ni `/pe` ; page ouverte sans partage.
