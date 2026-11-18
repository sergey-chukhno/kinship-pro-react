# Guide smoke — Clôture formation API V15 + corrections 12/11

**Branche :** `feat/fe-formation-end-close`  
**Env :** FE local (ou staging après merge) + BE staging (ticket 24)  
**Hors scope :** page partenaire P4.6-2 · 24bis  

Captures Patrick : déclarer la fin · panel clôture (sans « Joindre », avec notes) · confirm · TERMINÉE.

---

## Prérequis

1. Session formation catalogue **EN COURS** (`start` déjà déclaré).
2. Compte **formateur responsable** de la session.
3. Compte **organisme** (structure) avec droit de clôturer.

---

## S1 — Déclarer la fin (formateur)

1. Affiche session (rôle formateur) → **Déclarer la fin de la session**.
2. Vérifie dates **jj/mm/aaaa** · phrase **« L’organisme vérifiera la conformité avant de clôturer. »**
3. Message facultatif → **Déclarer la fin**.
4. **PASS si** toast OK · bandeau / note « Fin déclarée » côté org · plus de CTA déclarer fin.

---

## S2 — Clôturer (organisme)

1. Affiche (rôle structure) → **Clôturer la session →**.
2. Panel : **Décision du jury** · notes saisissables · **pas** de ligne « Joindre les résultats… » · toggle nom formateur OK.
3. Texte sans **« exportable vers Europass »**.
4. **Clôturer et délivrer** → confirm : même absence Europass → **Confirmer**.
5. **PASS si** overlay naissance · chip **TERMINÉE** · panneau preuve / certificats.

---

## S3 — TB (spot-check)

- Formateur : carte « Déclarer la fin » disparaît après S1.
- Org : carte « Clôturer » présente après S1, absente après S2.

---

## Après smokes

CR + captures → message Patrick → **GO avant merge staging**.
