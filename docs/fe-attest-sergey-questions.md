# Questions Sergey — Attester P2.13 (Patrick en copie)

À envoyer avec / après le GO Lot 1, avant ou pendant Lot 2 Attester.

---

Sergey — questions FE Attester P2.13 (Rimma / Patrick en copie)

1. **Dernière série** : existe-t-il (ou prévoyez-vous) un champ API « dernière série utilisée par cet utilisateur dans ce projet » (ex. sur le projet, une preference, ou l’arbre) ? Shape souhaitée : `badge_series_id` et/ou `catalog_key` + nom. En attendant on lit un localStorage FE `attest:lastSeries:{userId}:{projectId}`.

2. **Phase d’une compétence** : le tree (`SeriesTreeCompetence`) n’expose pas `phase` ; Phase 1/2 CPS semble portée par `badges[].level` / `level_label` de série. Confirmez-vous qu’on doit **dériver** la phase affichée depuis les badges de la compétence, ou allez-vous ajouter `phase` (ou équivalent) sur le nœud compétence ?

3. **Groupe « Distribuées par vos autorités »** : aujourd’hui le FE ne remplit ce groupe (placeholder). Quel champ / endpoint indique qu’une série est **distribuée par une autorité** vers la structure courante (vs « Vos séries » vs « Catalogue Kinship », qui se basent surtout sur `catalog_key`) ?

Merci.
