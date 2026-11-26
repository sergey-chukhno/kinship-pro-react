# Preuves — sources Patrick lues (26/11/2026)

Inventaire pour le **Plan mode** (6 étapes). Extraire locaux sous `docs/_extract_*` (travail, pas livraison).

## Fichiers

| # | Fichier | Statut lecture | Contenu utile |
| --- | --- | --- | --- |
| 1 | `34_VERSION_RIMMA_SIX_ETAPES_V1_8_7_…docx` | **Complet** (466 paragraphes → `_extract_34_v1_8_7.txt`) | Fait foi ; JSON §7.7 ; règles front (règle 9 = un seul reader) ; étapes 1–6 + smokes + mots |
| 2 | `05. P6.1.…V0_14_2…html` | **Complet index** (56 écrans + parties 0–8 → `_extract_05…`) | Jeu poste ; miniatures ; états 40–56 ; partie 8 mots |
| 3 | `5. KIN_UX_TELEPHONE…V0_15_1.html` | **Complet index** (9 parties → `_extract_5…`) | UX téléphone par famille ; partie 5 Formation = socle étape 1 |
| 4 | `4. KIN_UX_REFERENCE_TELEPHONE_V1_5.html` | **Complet** (texte → `_extract_ref_tel_v1_5_text.txt`) | Gabarit 390×844 ; mesures CSS ; libellés ; « ce qui ne s’affiche jamais » ; écran 3 Vérifier = hors scope étapes |
| 5 | `03. P5.1.…V0_8_3…html` | **Complet index** + Mes preuves → `_extract_p5_1_mes_preuves.txt` | Écran 3 Mes preuves (étape 4) ; miniatures P5.1 plus anciennes — **P6.1 fait foi** |

## Règles globales (version)

- Une étape : poussée → CR → GO Patrick → merge → smokes (1 capture / point) + téléphone de l’étape.
- Version > maquette ; doute → Patrick avant code.
- API absente : coder sur noms JSON ; **une seule couche** lit la réponse ; brancher à Sergey.
- Interrupteurs JSON racine : `proof_verify_api_enabled`, `european_export_ui_enabled`, `proof_pdf_enabled`, `rights_page_enabled` — absents = éteint.
- Routes : `GET /api/v1/proof/:token` (public) · `GET /api/v1/projects/:id/proof` (holder) · front `/proof/:token`.
- Familles : `formation_certified` · `formation_other` · `microcredential` · `project_basic` · `project_enriched` · `stage`.
- « Ouvrir la preuve » (07) : étape **5** seulement.
- Carte téléphone en tête : étape **4** ; pas « Après Vérifier » ; pas Compétence / Présence / Certification dans ces 6 étapes.

## Mapping Patrick mail ↔ écrans

| Étape | P6.1 | Téléphone | Sergey |
| --- | --- | --- | --- |
| 1 Socle | 10, 15, 40–43, 48–49 + partie 8 | Partie 5 · B fermé/ouvert | Étape 2 (pas encore) |
| 2 Formation | 10–21, 44–46 | Partie 5 B + « 1 · Ce que… » ; partie 0 « Ouverte depuis… » | Étape 2 |
| 3 Microcertif | 1–9, 47 | Partie 4 B, 1, D | Étape 2 |
| 4 Partage / Mes preuves / minis | zone titulaire 7,15,21,27,33,39 ; 43 ; 45 ; partie 0 (9 minis) ; P5.1 écran 3 | A1–A5, Montrer ; C Partager… | Étape 3 |
| 5 Projet + Ouvrir | 28–39, 50–51 | Partie 3 B+1 ; partie 8 | Étape 2 + numéro |
| 6 Stage | 22–27, 52–56 | Partie 6 B,1,D ; partie 8 | Étape 2 |

## Prêt pour Plan

Oui — les **5 fichiers** sont lus et indexés. Prochaine étape produit : **plan détaillé 6 étapes** (implémentation séquentielle, étape 1 en premier).
