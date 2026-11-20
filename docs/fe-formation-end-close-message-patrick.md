# Message Patrick — Clôture formation API V15 (ticket 24) · à coller

---

Patrick —

Clôture formation : mock Lot 1 branché sur l’**API V15** (ticket **24**, pas 24bis) + tes **4 corrections du 12/11**.

### Livré
- Affiche : `declare_end` / `close` (jury · `participant_outcomes` · `assessment_results_attached: true` sans UI « Joindre »).
- Flags API : `can_declare_end` · `can_close_project` · déclaration active.
- Copy 12/11 :
  1. dates **jj/mm/aaaa** dans la modal déclarer la fin ;
  2. phrase **« L’organisme vérifiera la conformité avant de clôturer. »** ;
  3. « Joindre… » **caché**, notes **restent** ;
  4. plus de **« exportable vers Europass »**.

### Smokes locaux (17/11) — S1 + S2 **PASS**
Session API id **5** · Import Excel Complet · Bodin Louis (admin structure pour le TB org).  
Captures : modal fin · panneau clôture · naissance PF · TERMINÉE.

**S3 TB** : spot-check **partiel** (un seul compte admin = TB org, pas les tuiles formateur). À rejouer staging avec formateur + org séparés.

**Piège :** ne pas smoke sur ids mock `sess-…` → 404 ; uniquement id projet numérique.

Hors scope : partenaire P4.6-2 · 24bis.

CR détaillé : `docs/fe-formation-end-close-cr.md`  
Branche : `feat/fe-formation-end-close`

J’attends ton **GO** de merge en staging.

Merci,  
Rimma
