# Guide smoke — Patrick A (page preuve) + B (Déjà attesté)

**Env :** FE local ou staging après merge  
**Compte titulaire :** personne qui possède une preuve PB  
**Compte adulte :** attestateur du projet  

Captures demandées Patrick : preuve **titulaire** · preuve **visiteur** · Attester **personne** · Attester **projet** (participant déjà attesté).

---

## A — Page `/pb/:token`

### A-titulaire (connectée, c’est sa preuve)

1. Connecte-toi comme titulaire → **Mes preuves** → ouvre une preuve (URL `/pb/…`).
2. **PASS si** :
   - Au-dessus de la bande : **‹ Mes preuves** (ramène à `/badges`).
   - Pas de « Copier le lien » ni « Ajouter à un profil ».
   - Sous-titre PDF : **Avec QR code** (sans `/verify`).

### A-visiteur

1. Ouvre le **même** lien `/pb/…` en navigation privée / déconnecté (ou autre compte).
2. **PASS si** : pas de « ‹ Mes preuves » · mêmes boutons cachés · « Avec QR code ».

---

## B — Déjà attesté

Prérequis : dans un projet, l’adulte A a déjà attesté la compétence X à la personne P.

### B1 — Depuis la carte de la personne

1. Attester depuis la fiche de P → série → étape Compétence.
2. **PASS si** :
   - Bloc **DÉJÀ ATTESTÉ** (capitales, gris) sans « — figé au geste ».
   - Carte compétence (picto, code/nom, phase) · skill en texte gris · pas de ✓ / date / « sa preuve est née » · non cliquable.
   - X n’apparaît plus dans les pastilles sélectionnables.

### B2 — Depuis le projet

1. Attester depuis le projet → choisir compétence X → étape Participants.
2. **PASS si** :
   - P n’a **pas** de case · apparaît sous **Déjà attesté** (nom gris).
   - « Tout sélectionner » ne prend pas P.
   - Compteur = participants encore sélectionnables.

---

## Après smokes

Captures + CR clôture (`docs/fe-session-close-mock-cr.md`) → **un seul message** Patrick → GO staging.
