# Message Patrick — Preuves étape 1 · à coller

---

Patrick —

**Étape 1 — Socle** poussée sur `feat/fe-preuves-etape-1` · CR : `docs/fe-preuves-etape1-cr.md`  
**En attente de ton GO avant merge staging.**

### Livré
- Page `/proof/:token` (visiteur) + proposition titulaire `/proof/project/:projectId`
- Reader unique (règle 9) + fixtures aux noms V1.8.7 (API Sergey pas encore là)
- Zones socle : bande, bandeau, Titulaire (4 cas), repères, QR+numéro, onglets, zone titulaire (layout, gestes à l’étape 4), pied
- Interrupteurs off par défaut (48/49) ; noindex ; 404 / 410 proposés

### À trancher
1. Route titulaire `/proof/project/:projectId` — OK ?
2. Textes 404 / 410 — OK ?
3. noindex via meta robots au mount — OK ?

Smokes + captures après ton GO / merge.

Merci,  
Rimma
