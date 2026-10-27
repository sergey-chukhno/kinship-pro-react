# CR — Clôture session mock (Lot 1) — P4.6 / P4.2-4·5 / P4.8 org

**Branche :** `feat/fe-session-participants-import`  
**Nature :** écrans seuls, données fictives — **aucun** branchement API clôture  
**Maquette :** P4.6 V0.4 · P4.2 V0.15 (écrans 4–5) · P4.8 V0.3 (org) · copy partenaire P4.4/P4.5  
**Date smokes :** 2026-10-27  
**Compte smoke :** Alicia Cordial · TB école · sessions locales **Import Excel Complet** + **Formation Google Test** (id `4`)  
**Tests auto :** `sessionCloseMock.test.ts` — **PASS** (3)

---

## Livré

| Point | Statut |
| ----- | ------ |
| Tokens CSS (`formation-tokens.css`) pétrole / ambre / fonts | **OK** |
| Affiche : CTA « Déclarer la fin » (formateur / À faire) | **OK** |
| Affiche : CTA « Clôturer la session → » (structure, après fin) | **OK** |
| Parcours cliquable : fin → clôture → confirm → naissance → TERMINÉE | **OK** |
| Pastilles Validée / Non validé (P4.6) | **OK** |
| Confirmation ambre « Confirmer la délivrance » | **OK** |
| Naissance Preuve Formation (carte compacte + code PF·…) | **OK** |
| Vue TERMINÉE + tuiles preuve / certificats | **OK** |
| Certificats org P4.8 (envoyé / échec e-mail + encarts assiduité) | **OK** |
| Partenaire : invitation dès ajout ; lien jusqu’à clôture ; 1 usage | **OK** |
| Route publique `/session-co-attest/:token` | **OK** |
| Masquage « + Ajouter un partenaire » après clôture mock | **OK** (voulu) |
| À faire TB formateur / OF | **OK** |

### Hors Lot 1 (Patrick — reporté)

- P4.8 écran 3 « Mes certificats »
- P4.6 écran 5 preuve participante (« Mes preuves »)
- API clôture / Postmark / registre Sergey
- Mur MC UE (variante) — non smokeé cette passe

---

## Smokes locaux (2026-10-27) — tous PASS

| # | Parcours | Résultat | Détail observé |
| - | -------- | -------- | -------------- |
| **S1** | Déclarer la fin (P4.2-4) | **PASS** | TB Alicia → carte « Fin de session » · **Import Excel Complet** → modal → toast « Fin de session déclarée » · CTA fin retiré |
| **S2** | Clôturer → délivrer → naissance → TERMINÉE | **PASS** | Rôle structure · Léa Validée / Nadia Non validé · confirm « Délivrer 1 preuves… » · overlay naissance `PF·2026·FR·659643QM` · chip **clôturée le 2026-10-27** · 1 preuve · 2 certificats |
| **S3** | Certificats org (P4.8 1 / 1bis / 2) | **PASS** | Vue organisme · Léa « Envoyé par e-mail » · 1 à imprimer (échec) · encarts assiduité |
| **S4** | Partenaire + co-attest | **PASS** | Session **Formation Google Test** (id 4, non close) · panneau + copy · toast `/session-co-attest/coattest-4-mvr97oan` · page synthèse sans noms · ✓ Co-attestée par AppleInc, Co-attestant, Company — le 2026-10-27 |

### Notes smoke

- `/formation-affiche/76` (staging Claire) non utilisé : smokes sur sessions locales Alicia.
- Chip **TERMINÉE** peut déjà s’afficher avant clôture mock (statut / dates session) — la clôture mock ajoute **clôturée le …** + tuiles preuve/certificats.
- **S4** d’abord KO sur session déjà close (bouton partenaire masqué) → rejoué sur session ouverte : **PASS**.
- Accords FR cosmétiques à polish plus tard : « 1 preuves » / « ne recevront » dans la modale de confirmation.

---

## Fichiers clés

- `src/styles/formation-tokens.css`
- `src/utils/sessionCloseMock.ts` (+ test)
- `src/components/SessionClose/*`
- `src/components/Pages/FormationSessionAffichePage.tsx`
- `src/components/Pages/FormationSessionSpacePage.tsx`
- `src/components/Pages/AddSessionPartnerModal.tsx`
- `src/components/Pages/SessionCoAttestPage.tsx`
- `src/components/Dashboard/FormateurSessionTodoTile.tsx`
- `src/components/Dashboard/FormationOrgDashboard.tsx`
- `src/App.tsx` (route co-attest)

---

## Suite

**Lot 2** — Attester une compétence P2.13 V1.4.1 (après GO écrit Lot 1).  
Questions Sergey (Patrick en copie) : dernière série · phase compétence · groupe « Distribuées par vos autorités » — voir `docs/fe-attest-sergey-questions.md`.
