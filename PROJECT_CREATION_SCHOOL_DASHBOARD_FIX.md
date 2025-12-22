# Plan d'Implémentation : Correction de l'erreur de création de projet depuis le dashboard scolaire

## Problème Identifié

### Erreur
```
TypeError: tags.find is not a function
at getTagIdByPathway (projectMapper.ts:31:1)
at mapFrontendToBackend (projectMapper.ts:51:1)
at handleSubmit (ProjectModal.tsx:288:1)
```

### Cause Racine

1. **Structure de réponse API** : L'API `/api/v1/tags` retourne `{ data: [...] }` mais `getTags()` retourne `response.data` qui est l'objet complet `{ data: [...] }` au lieu du tableau.

2. **État initial manquant** : Dans `AppContext.tsx`, l'état initial ne définit pas `tags`, donc `state.tags` peut être `undefined`.

3. **Type non garanti** : Dans `mapFrontendToBackend`, `tags` est passé directement à `getTagIdByPathway` sans vérification que c'est un tableau.

4. **Différence de contexte** : Le problème se manifeste uniquement pour le dashboard scolaire, probablement parce que les tags ne sont pas chargés correctement ou que la structure de réponse diffère.

## Analyse du Code

### Fichiers Concernés

1. **`src/api/Projects.ts`** (ligne 96-99)
   - `getTags()` retourne `response.data` qui peut être `{ data: [...] }` ou `[...]` selon la structure

2. **`src/components/Modals/ProjectModal.tsx`** (ligne 183-184)
   - `setTags(tagsData)` où `tagsData` peut être mal structuré

3. **`src/utils/projectMapper.ts`** (ligne 85-92, 125)
   - `getTagIdByPathway` s'attend à un tableau `Tag[]`
   - `mapFrontendToBackend` passe `tags` sans validation

4. **`src/context/AppContext.tsx`** (ligne 63-87, 243-244)
   - État initial ne définit pas `tags`
   - `SET_TAGS` action stocke directement sans validation

## Solution Proposée

### 1. Corriger `getTags()` pour extraire correctement le tableau

**Fichier** : `src/api/Projects.ts`

**Changement** :
```typescript
export const getTags = async (): Promise<Tag[]> => {
    const response = await apiClient.get('/api/v1/tags');
    // Handle both { data: [...] } and [...] formats
    const tagsData = response.data?.data || response.data || [];
    // Ensure it's an array
    return Array.isArray(tagsData) ? tagsData : [];
};
```

**Raison** : L'API retourne `{ data: [...] }`, donc on doit extraire `response.data.data` ou utiliser `response.data` si c'est déjà un tableau.

### 2. Ajouter validation dans `getTagIdByPathway`

**Fichier** : `src/utils/projectMapper.ts`

**Changement** :
```typescript
export const getTagIdByPathway = (pathway: string, tags: Tag[]): number | undefined => {
    // Validate tags is an array
    if (!tags || !Array.isArray(tags)) {
        console.warn('getTagIdByPathway: tags is not an array', tags);
        return undefined;
    }
    
    // Try to find by exact name match (case insensitive)
    const tag = tags.find(t =>
        t.name.toLowerCase() === pathway.toLowerCase() ||
        t.name_fr?.toLowerCase() === pathway.toLowerCase()
    );
    return tag?.id;
};
```

**Raison** : Protection contre les valeurs non-tableau et logging pour le débogage.

### 3. Ajouter validation dans `mapFrontendToBackend`

**Fichier** : `src/utils/projectMapper.ts`

**Changement** :
```typescript
export const mapFrontendToBackend = (
    formData: {...},
    context: 'company' | 'school' | 'teacher' | 'general',
    organizationId: number | undefined,
    tags: Tag[],
    currentUserId: string
): CreateProjectPayload => {
    // Normalize tags to ensure it's an array
    const normalizedTags: Tag[] = Array.isArray(tags) ? tags : (tags?.data || []);
    
    // ... rest of the function
    
    // Get tag ID from pathway
    const tagIds: number[] = [];
    if (formData.pathway) {
        const tagId = getTagIdByPathway(formData.pathway, normalizedTags);
        if (tagId) {
            tagIds.push(tagId);
        }
    }
    
    // ... rest of the function
};
```

**Raison** : Normalisation des tags avant utilisation, support des formats `[...]` et `{ data: [...] }`.

### 4. Initialiser `tags` dans l'état initial

**Fichier** : `src/context/AppContext.tsx`

**Changement** :
```typescript
const initialState: AppState = {
  // ... autres propriétés
  tags: [], // Ajouter cette ligne
  partnerships: []
};
```

**Raison** : Garantir que `state.tags` est toujours défini comme un tableau.

### 5. Ajouter validation dans `setTags` action

**Fichier** : `src/context/AppContext.tsx`

**Changement** :
```typescript
case 'SET_TAGS':
  // Normalize tags to ensure it's an array
  const normalizedTags = Array.isArray(action.payload) 
    ? action.payload 
    : (action.payload?.data || []);
  return { ...state, tags: normalizedTags };
```

**Raison** : Normalisation lors du stockage pour garantir la cohérence.

### 6. Améliorer la gestion d'erreur dans `ProjectModal`

**Fichier** : `src/components/Modals/ProjectModal.tsx`

**Changement** :
```typescript
const fetchTags = async () => {
  if (state.tags.length === 0) {
    setIsLoadingTags(true);
    try {
      const tagsData = await getTags();
      // Ensure tagsData is an array before setting
      if (Array.isArray(tagsData)) {
        setTags(tagsData);
      } else {
        console.error('getTags returned non-array:', tagsData);
        setTags([]);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
      setTags([]); // Set empty array on error
    } finally {
      setIsLoadingTags(false);
    }
  }
};
```

**Raison** : Gestion d'erreur robuste et validation du type avant stockage.

## Tests à Effectuer

### Tests Manuels

1. **Dashboard Scolaire** :
   - Ouvrir le modal de création de projet
   - Vérifier que les tags sont chargés correctement
   - Créer un projet avec un pathway sélectionné
   - Vérifier qu'aucune erreur ne se produit

2. **Dashboard Entreprise** :
   - Répéter les mêmes étapes pour vérifier qu'il n'y a pas de régression

3. **Dashboard Personnel** :
   - Répéter les mêmes étapes pour vérifier qu'il n'y a pas de régression

4. **Cas limites** :
   - Créer un projet sans pathway (si autorisé)
   - Vérifier le comportement si l'API retourne une erreur
   - Vérifier le comportement si l'API retourne un tableau vide

### Tests Automatisés (Optionnel)

1. **Unit Test pour `getTagIdByPathway`** :
   - Tester avec un tableau valide
   - Tester avec `undefined`
   - Tester avec un objet `{ data: [...] }`
   - Tester avec un tableau vide

2. **Unit Test pour `getTags`** :
   - Tester avec réponse `{ data: [...] }`
   - Tester avec réponse `[...]`
   - Tester avec réponse vide

## Risques et Mitigation

### Risques

1. **Régressions** : Les changements pourraient affecter d'autres parties du code qui utilisent `tags`
   - **Mitigation** : Validation défensive qui supporte les deux formats

2. **Performance** : Normalisation supplémentaire pourrait impacter les performances
   - **Mitigation** : Normalisation effectuée une seule fois lors du chargement

3. **Incohérence** : Si l'API change de format, le code pourrait ne plus fonctionner
   - **Mitigation** : Support des deux formats existants

## Ordre d'Implémentation

1. ✅ Corriger `getTags()` pour extraire correctement le tableau
2. ✅ Ajouter validation dans `getTagIdByPathway`
3. ✅ Ajouter validation dans `mapFrontendToBackend`
4. ✅ Initialiser `tags` dans l'état initial
5. ✅ Ajouter validation dans `setTags` action
6. ✅ Améliorer la gestion d'erreur dans `ProjectModal`

## Validation

Après implémentation, vérifier :
- ✅ Aucune erreur dans la console du navigateur
- ✅ Les tags sont chargés correctement dans tous les dashboards
- ✅ La création de projet fonctionne depuis le dashboard scolaire
- ✅ Aucune régression dans les autres dashboards
- ✅ Les logs de débogage sont propres (pas de warnings)

## Notes Additionnelles

- Le problème se manifeste uniquement pour le dashboard scolaire, mais la solution est appliquée globalement pour éviter des problèmes similaires ailleurs
- La normalisation défensive garantit la robustesse du code même si la structure de l'API change
- Les validations ajoutées aideront à identifier rapidement les problèmes futurs

