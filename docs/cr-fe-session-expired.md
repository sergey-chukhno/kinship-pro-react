# KINSHIP — COMPTE-RENDU — FE session expirée (toast unique + redirect)

**Ticket :** retour usager — onglet laissé ouvert / JWT 24 h  
**Branche :** `fix/fe-session-expired` @ tip (depuis `staging` @ `53fe5d3`)  
**PR :** https://github.com/sergey-chukhno/kinship-pro-react/pull/516  
**Date :** 2026-11-20  
**Périmètre :** FE — intercepteur 401, toast unique, redirect `/login`, keep-alive onglet  
**Hors périmètre :** allonger TTL JWT BE · patch catch-par-catch Pages  

---

## 1. Livré

| Surface | Comportement |
|---------|----------------|
| `axiosClient` response interceptor | 401 + JWT présent (hors login/register/password) → flux session expirée |
| Toast | Un seul : « Votre session a expiré. Veuillez vous reconnecter. » (`sessionStorage` anti-spam) |
| `useToast.showError` | No-op tant que le flag session expirée est actif (plus de pile rouge projets/brouillons/MLDS) |
| UI | Clear JWT/contextes + `setUser(null)` + navigate `/login` |
| Keep-alive | Onglet visible/focus : JWT expiré → même flux ; ≤5 min → `refreshToken` silencieux |
| Login | Clear du flag après login email / code élève |

---

## 2. DoD / tests auto

```bash
npm test -- --watchAll=false --testPathPattern='sessionExpiry|useToast|useSessionKeepAlive|sessionExpiredNavigation'
```

**20 examples, 0 failures** (module session + interceptor hook + toast guard + keep-alive + navigation).

| # | Critère | Résultat |
|---|---------|----------|
| 1 | `useToast` : pas de toast générique si flag session expirée | OK |
| 2 | Intercepteur / `onAxiosClientResponseError` : 401 protégé → expiry ; login exempt | OK |
| 3 | Keep-alive : JWT expiré → expiry ; bientôt expiré → refresh | OK |
| 4 | Navigation : clear user + `/login` sur event | OK |
| — | Idempotence toast / clear storage / decode JWT | OK (suite `sessionExpiry`) |

---

## 3. Smoke staging (après deploy)

Pas besoin d’attendre 24 h. Sur Projets, DevTools console — forcer `exp` passé dans le JWT localStorage, puis reload / focus onglet.

**Attendu :** 1 toast session expirée · redirect `/login` · pas de pile « Erreur lors de la récupération… » · reconnexion OK.

Variante keep-alive : `exp` dans ~2 min + focus → `POST /auth/refresh` silencieux.

---

## 4. Demande

**GO merge écrit** staging FE pour `fix/fe-session-expired`.  
Ensuite deploy staging + smoke §3 → CR de merge court.
