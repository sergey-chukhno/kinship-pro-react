# Plan d'Implémentation : Correction de l'affichage des projets sur le dashboard scolaire

## Problème Identifié

### Symptôme
Les projets créés depuis le dashboard scolaire ne s'affichent pas dans la section "Projets" de la page Projects, même si la création fonctionne correctement.

### Cause Racine

**Différence entre les deux endpoints API utilisés :**

1. **`/api/v1/users/me/projects?by_school=${SchoolID}`** (actuellement utilisé dans `Projects.tsx`)
   - **Retourne** : Uniquement les projets où l'utilisateur est **propriétaire OU participant**
   - **Filtre** : Parmi les projets de l'utilisateur, filtre ceux associés à l'école
   - **Problème** : Si un admin/superadmin crée un projet mais n'est pas explicitement ajouté comme participant, le projet n'apparaît pas

2. **`/api/v1/schools/${schoolId}/projects`** (utilisé dans `Dashboard.tsx`)
   - **Retourne** : **Tous les projets de l'école**
   - **Inclut** : 
     - Projets associés via `school_levels`
     - Projets créés par les membres de l'école avec rôles `referent`, `admin`, `superadmin`
   - **C'est le bon endpoint** pour afficher tous les projets de l'école

### Analyse du Code

**Fichier actuel : `src/components/Pages/Projects.tsx`**
- Ligne 57 : Utilise `getUserProjectsBySchool` qui appelle `/api/v1/users/me/projects?by_school=${SchoolID}`
- Ce endpoint retourne uniquement les projets où l'utilisateur est impliqué

**Fichier de référence : `src/components/Pages/Dashboard.tsx`**
- Ligne 701 : Utilise `getSchoolProjects` qui appelle `/api/v1/schools/${schoolId}/projects`
- Ce endpoint retourne tous les projets de l'école

**Fichiers API :**
- `src/api/Project.ts` : `getUserProjectsBySchool` (mauvais endpoint pour la liste complète)
- `src/api/Dashboard.ts` : `getSchoolProjects` (bon endpoint pour la liste complète)

## Solution Proposée

### Option 1 : Utiliser `getSchoolProjects` pour le dashboard scolaire (Recommandé)

**Avantages :**
- Cohérent avec `Dashboard.tsx`
- Retourne tous les projets de l'école comme attendu
- Fonctionne pour tous les rôles (admin, superadmin, referent)

**Changements nécessaires :**

1. **Modifier `src/components/Pages/Projects.tsx`** :
   - Importer `getSchoolProjects` depuis `src/api/Dashboard.ts`
   - Utiliser `getSchoolProjects` au lieu de `getUserProjectsBySchool` pour `isEdu === true`
   - Garder `getUserProjectsByCompany` pour les entreprises (ou vérifier si le même problème existe)

2. **Vérifier `src/api/Dashboard.ts`** :
   - S'assurer que `getSchoolProjects` est exporté correctement
   - Vérifier les paramètres (actuellement `per_page: 3` pour le dashboard, mais devrait être plus pour Projects)

### Option 2 : Modifier le backend pour inclure les projets créés par les admins

**Inconvénients :**
- Plus complexe
- Nécessite des changements backend
- Peut affecter d'autres parties du système

**Non recommandé** car l'Option 1 est plus simple et cohérente.

## Implémentation Détaillée

### 1. Modifier `src/components/Pages/Projects.tsx`

**Changement dans les imports :**
```typescript
// Avant
import { getUserProjectsBySchool , getUserProjectsByCompany, deleteProject, getAllProjects} from '../../api/Project';

// Après
import { getUserProjectsByCompany, deleteProject, getAllProjects} from '../../api/Project';
import { getSchoolProjects } from '../../api/Dashboard';
```

**Changement dans `fetchProjects` :**
```typescript
// Avant (ligne 57)
const apiFunc = isEdu ? getUserProjectsBySchool : getUserProjectsByCompany;
const response = await apiFunc(contextId);

// Après
let response;
if (isEdu) {
  // Use getSchoolProjects for schools (returns all school projects)
  response = await getSchoolProjects(contextId, false);
} else {
  // Use getUserProjectsByCompany for companies
  response = await getUserProjectsByCompany(contextId);
}
```

**Note** : `getSchoolProjects` a un paramètre `includeBranches` (par défaut `false`). Pour la page Projects, on veut probablement `false` pour ne pas inclure les projets des branches.

### 2. Vérifier `src/api/Dashboard.ts`

**Vérifier la signature de `getSchoolProjects` :**
```typescript
export const getSchoolProjects = (
  schoolId: number,
  includeBranches = false
) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/projects`, {
    params: { include_branches: includeBranches, per_page: 3, sort_by: 'created_at', sort_direction: 'desc' },
  });
};
```

**Problème potentiel** : `per_page: 3` est hardcodé pour le dashboard. Pour la page Projects, on veut probablement plus de résultats.

**Solution** : Ajouter un paramètre optionnel `perPage` ou créer une fonction séparée.

**Option A : Modifier `getSchoolProjects` pour accepter `perPage` :**
```typescript
export const getSchoolProjects = (
  schoolId: number,
  includeBranches = false,
  perPage = 3
) => {
  return axiosClient.get(`/api/v1/schools/${schoolId}/projects`, {
    params: { 
      include_branches: includeBranches, 
      per_page: perPage, 
      sort_by: 'created_at', 
      sort_direction: 'desc' 
    },
  });
};
```

**Option B : Créer une fonction séparée dans `src/api/Project.ts` :**
```typescript
export function getSchoolProjectsList(schoolId: number, perPage = 12) {
  return axiosClient.get(`/api/v1/schools/${schoolId}/projects`, {
    params: { 
      include_branches: false, 
      per_page: perPage, 
      sort_by: 'created_at', 
      sort_direction: 'desc' 
    },
  });
}
```

**Recommandation** : Option A (modifier `getSchoolProjects` avec paramètre optionnel) pour éviter la duplication.

### 3. Vérifier le même problème pour les entreprises

**Vérifier si `/api/v1/users/me/projects?by_company=${CompanyID}` a le même problème.**

Si oui, utiliser `/api/v1/companies/${companyId}/projects` de manière similaire.

**Fichier backend** : `app/controllers/api/v1/companies/projects_controller.rb`

## Tests à Effectuer

### Tests Manuels

1. **Dashboard Scolaire** :
   - Créer un projet en tant qu'admin/superadmin
   - Vérifier que le projet apparaît dans la page Projects
   - Vérifier que le projet apparaît dans le Dashboard
   - Vérifier que les filtres fonctionnent correctement

2. **Dashboard Entreprise** :
   - Vérifier qu'il n'y a pas de régression
   - Si le même problème existe, appliquer la même correction

3. **Dashboard Personnel** :
   - Vérifier qu'il n'y a pas de régression

### Tests de Cas Limites

1. **Projets créés par différents rôles** :
   - Admin crée un projet → doit apparaître
   - Superadmin crée un projet → doit apparaître
   - Referent crée un projet → doit apparaître
   - Membre régulier crée un projet → doit apparaître (s'il est propriétaire)

2. **Pagination** :
   - Vérifier que la pagination fonctionne si plus de 12 projets

3. **Filtres** :
   - Vérifier que les filtres (recherche, pathway, status, dates) fonctionnent

## Risques et Mitigation

### Risques

1. **Régressions** : Changer l'endpoint pourrait affecter d'autres parties
   - **Mitigation** : Tester tous les dashboards

2. **Pagination** : Le paramètre `per_page` pourrait être différent
   - **Mitigation** : Utiliser un paramètre configurable

3. **Performance** : Charger tous les projets pourrait être plus lent
   - **Mitigation** : La pagination backend devrait gérer cela

4. **Permissions** : L'endpoint `/api/v1/schools/:id/projects` pourrait avoir des restrictions
   - **Mitigation** : Vérifier les permissions dans le backend

## Ordre d'Implémentation

1. ✅ Modifier `getSchoolProjects` pour accepter `perPage` comme paramètre optionnel
2. ✅ Modifier `Projects.tsx` pour utiliser `getSchoolProjects` au lieu de `getUserProjectsBySchool`
3. ✅ Vérifier si le même problème existe pour les entreprises
4. ✅ Tester sur tous les dashboards
5. ✅ Vérifier la pagination et les filtres

## Validation

Après implémentation, vérifier :
- ✅ Les projets créés depuis le dashboard scolaire apparaissent dans la page Projects
- ✅ Aucune régression dans les autres dashboards
- ✅ Les filtres fonctionnent correctement
- ✅ La pagination fonctionne si nécessaire
- ✅ Les projets sont triés correctement (par date de création décroissante)

## Notes Additionnelles

- Le problème se manifeste uniquement pour le dashboard scolaire car `getUserProjectsBySchool` filtre par participation de l'utilisateur
- Le Dashboard utilise déjà le bon endpoint (`getSchoolProjects`), donc la solution est d'aligner Projects.tsx avec Dashboard.tsx
- Pour les entreprises, vérifier si le même problème existe et appliquer la même solution si nécessaire

