# Note Patrick — Fix recherche Participants (Attester)

**Branche :** `feat/fe-attest-participant-search`  
**Cause :** le filtre matchait aussi `organization`. Sur « Collège Antoine Risso », `s` / `ss` matchaient **tous** les participants. `sss` vidait la grille ; Sofia restait sous **Déjà attesté** (non filtrée).

**Fix :** recherche sur le **nom** (plein + chip « Prénom I. ») uniquement · même filtre sur **Déjà attesté** (bloc masqué si vide).
