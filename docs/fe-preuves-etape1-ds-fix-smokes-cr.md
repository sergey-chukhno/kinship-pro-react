# CR smokes — Preuves étape 1 · correctif DS + 404/410

**Date :** 27/11/2026  
**Env :** FE staging (Vercel) · `feat/fe-preuves-etape1-ds-fix` déjà mergée  
**Sources :** mail Patrick 27/11 §14 · V1.8.7  
**CR technique :** [`fe-preuves-etape1-ds-fix-cr.md`](fe-preuves-etape1-ds-fix-cr.md)

**Base URL :** `kinship-pro-react-env-staging-sergeychukhno-3185s-projects.vercel.app`  
**Fixtures staging :** `REACT_APP_PROOF_PAGE_FIXTURES=1` (confirmé — `demo-*` répondent)

---

## Captures §14

| # | Point | URL | Résultat | Note |
| --- | --- | --- | --- | --- |
| 3 | Visiteur + vérif (poste) | `/proof/demo-link-verify` | **PASS** | Hero + sceau · « Vérifiable sans compte. » · CTA Vérifier |
| 3 | Visiteur + vérif (téléphone ~400px) | idem | **PASS*** | K bande 22 · n° `PF·2027·FR` · accordéon « Détails et vérification » · *voir PARTIAL fond |
| 4 | Exportable | `/proof/demo-exportable` | **PASS** | ★ rond or + contour page or |
| 5 | Titulaire + droits | `/proof/demo-sharing-closed` | **PASS** | Léa · gestes disabled · phrase email · pas Vos liens · Exercer mes droits · zone après onglets |
| 5 | Masqué | `/proof/demo-masked` | **PASS** | Identité masquée · avatar `?` soft |
| 5 | Effacé | `/proof/demo-erased` | **PASS** | Données civiles effacées · avatar `?` soft |
| 6 | Deux repères | `/proof/demo-two-markers` | **PASS** | 60 h · 12 participants · contour teinte bande |
| 404 | Token inconnu | `/proof/token-inconnu` | **PASS** | « Cette page n'est pas disponible. » · pied kinshipedu.fr + © |
| 410 | Lien supprimé | `/proof/demo-gone` | **PASS** | « Ce lien a été supprimé. » + phrase nouveau lien · même pied |
| 8–9 | noindex | 404 + 410 (+ pages preuve) | **PASS** | `meta robots=noindex,nofollow` · title Preuve Kinship |
| 10 | Pastille OF | Cadre (plusieurs demos) | **PASS** | Corail · ◆ Organisme de formation certifié |

\* **PARTIAL §11 (soft)** — téléphone : carte blanche OK, mais le fond **autour** de la page reste le beige `--ppg-bg` (Patrick : plein blanc). Contenu / accordéon / n° coupés : OK.

---

## Fixtures / prod (revérifié)

| Env | Comportement observé / config |
| --- | --- |
| Staging | `REACT_APP_PROOF_PAGE_FIXTURES=1` · demos OK |
| Production | flag absent / `0` → pas de fixtures (garantie code) |

---

## Suite

- Joindre captures §14 au message Patrick.  
- Attendre **GO étape 2** (Preuve Formation).  
- Soft §11 fond téléphone : corriger si Patrick le demande avant / pendant étape 2.
