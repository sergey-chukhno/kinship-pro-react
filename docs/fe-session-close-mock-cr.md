# CR — Clôture session mock (Lot 1) — P4.6 / P4.2-4·5 / P4.8 org

**Branche :** `feat/fe-session-participants-import`  
**Nature :** écrans seuls, données fictives — **aucun** branchement API clôture  
**Maquette :** P4.6 V0.4 · P4.2 V0.15 (écrans 4–5) · P4.8 V0.3 (org) · copy partenaire P4.4/P4.5  
**Compte smoke :** Alicia Cordial · TB école · sessions locales  
**Tests auto :** `sessionCloseCopy.test.ts` + `sessionCloseMock.test.ts` — **PASS** (7)

---

## Livré (Lot 1 + 5 corrections Patrick)

| Point                                                                                              | Statut |
| -------------------------------------------------------------------------------------------------- | ------ |
| Tokens CSS (`formation-tokens.css`) pétrole / ambre / fonts                                        | **OK** |
| Parcours : fin → clôture → confirm → naissance → TERMINÉE                                          | **OK** |
| Titre toujours **« Décision du jury »** + phrase non validé (certificat + présences)               | **OK** |
| Certificat org P4.8 modèle officiel (modèle, signataire, cases, 10 ans, QR…)                       | **OK** |
| Vue TERMINÉE : heures·séances·présences·accès · DGEFP · rapport · note PDF                         | **OK** |
| Partenaire : e-mail seul obligatoire ; nom / fonction / org facultatifs                            | **OK** |
| Écriture FR : dates `jj/mm/aaaa` / longues sur certificat · « X heures » · accords singulier · PF· | **OK** |
| Route `/session-co-attest/:token` · masquage partenaire après clôture                              | **OK** |

### Hors Lot 1 (Patrick — reporté)

- P4.8 écran 3 « Mes certificats »
- P4.6 écran 5 preuve participante (« Mes preuves »)
- API clôture / Postmark / registre Sergey
- Mur MC UE (variante) — non smokeé
- Actions mock sans handler : Imprimer / Renvoyer e-mail / DGEFP / Exporter PDF (voulu)

---

## Smokes locaux (2026-10-28) — 5 corrections — tous PASS

Sessions : **Formation Google Test** (id `4`, clôture) · nouvelle session **Import Excel Complet** (id `5`, partenaire).

| #      | Parcours                                   | Résultat | Détail observé                                                                                                                                                                                        |
| ------ | ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | Déclarer la fin                            | **PASS** | TB → Fin de session → modal → toast « Fin de session déclarée » · dates FR dans la modal                                                                                                              |
| **S2** | Clôturer → délivrer → naissance → TERMINÉE | **PASS** | Rôle structure · **Décision du jury** · Leo Non validé · confirm « Délivrer 4 preuves… » / « 1 participant non validé ne recevra pas… » · naissance · chip **clôturée le 28/10/2026** · **30 heures** |
| **S3** | Vue TERMINÉE (P4.6-4)                      | **PASS** | `30 heures · 1 séance tenue · présences… · accès nominatif jusqu’au 28/10/2032` · DGEFP / Qualiopi · rapport + **Le rapport →** · **Imprimer le certificat** (1 échec)                                |
| **S4** | Certificats org (P4.8)                     | **PASS** | Modèle ministère · signataire / fonction / Fait à · cases · dates longues · 10 ans · signature / cachet / QR · encarts assiduité · « Imprimer » sans effet (**mock**, OK)                             |
| **S5** | Ajouter un partenaire                      | **PASS** | Session ouverte id `5` · e-mail seul ✱ · toast `/session-co-attest/coattest-5-…` · PARTENAIRES (1) invitation envoyée                                                                                 |

### Notes smoke

- TB école Alicia : pas de carte « Clôturer la session → » (réservée TB OF Qualiopi) — clôture via affiche en rôle **structure** (`sessionStorage` / Espace → Voir l’affiche).
- Partenaire : rejouer sur session **non** close (masqué après clôture mock — voulu).
- Dates FR partout côté mock (modal déclarer + bandeau « Fin déclarée le »). Patrick GO Lot 1 (28/10) : branchement API plus tard avec contrat Sergey.

### Captures pour Patrick (C1–C6)

| #   | Écran                                                  |
| --- | ------------------------------------------------------ |
| C1  | Panneau clôture — Décision du jury + phrase non validé |
| C2  | Confirm — accords singulier                            |
| C3  | Naissance Preuve Formation                             |
| C4  | Vue TERMINÉE (DGEFP / rapport / méta)                  |
| C5  | Certificat org modèle officiel                         |
| C6  | Ajouter un partenaire — e-mail seul obligatoire        |

---

## Smokes Lot 1 initiaux (2026-10-27) — PASS (référence)

S1–S4 initiaux documentés avant les 5 corrections ; remplacés pour le GO par la passe du **2026-10-28**.

---

## Fichiers clés

- `src/styles/formation-tokens.css`
- `src/utils/sessionCloseMock.ts` (+ test)
- `src/utils/sessionCloseCopy.ts` (+ test) — dates FR, heures, accords, PF·
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

**GO ** sur Lot 1 (corrections smokées)→ puis **Lot 2** Attester P2.13 V1.4.1
