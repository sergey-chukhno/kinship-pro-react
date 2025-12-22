# Plan d'Implémentation : Correction des Projets pour les Enseignants Indépendants

## Problèmes Identifiés

### Problème 1 : Création de Projet Impossible pour Enseignants Indépendants

**Symptôme** : Les enseignants indépendants ne peuvent pas créer de projets depuis leur dashboard.

**Cause Racine** :
- Dans `ProjectModal.tsx` ligne 311, `getOrganizationId(state.user, state.showingPageType)` est appelé
- Pour `showingPageType === 'teacher'`, cette fonction retourne `user.available_contexts?.schools?.[0]?.id`
- Si l'enseignant n'a pas d'école confirmée dans `available_contexts`, cela retourne `undefined`
- Le backend accepte `context='teacher'` sans `organization_id` (ligne 814-815 dans `projects_controller.rb`), mais le frontend peut avoir des problèmes avec `undefined`

**Code actuel** :
```typescript
// projectMapper.ts ligne 56-66
export const getOrganizationId = (
    user: User,
    showingPageType: ShowingPageType
): number | undefined => {
    if (showingPageType === 'pro') {
        return user.available_contexts?.companies?.[0]?.id;
    } else if (showingPageType === 'edu' || showingPageType === 'teacher') {
        return user.available_contexts?.schools?.[0]?.id;  // ← Retourne undefined si pas d'école
    }
    return undefined;
};
```

### Problème 2 : Affichage de Tous les Projets Publics au Lieu des Projets de l'Enseignant

**Symptôme** : Sur la page Projects du dashboard enseignant, tous les projets publics sont affichés au lieu de seulement les projets de l'enseignant.

**Cause Racine** :
- Dans `Projects.tsx` ligne 34-45, pour `teacher` ou `user`, le code utilise `getAllProjects()` qui retourne tous les projets publics
- Il devrait utiliser l'endpoint `/api/v1/teachers/projects` qui existe déjà dans le backend et retourne uniquement les projets de l'enseignant

**Code actuel** :
```typescript
// Projects.tsx ligne 34-45
if (isPersonalUser) {
  // Pour les utilisateurs personnels : charger tous les projets publics
  const response = await getAllProjects();
  const rawProjects = response.data?.data || response.data || [];
  // Filtrer uniquement les projets publics
  const publicProjects = rawProjects.filter((p: any) => !p.private);
  // ...
}
```

**Backend disponible** :
- `/api/v1/teachers/projects` (défini dans `teachers/projects_controller.rb`)
- Retourne : projets créés par l'enseignant + projets des classes gérées par l'enseignant

### Problème 3 : Choix de Contexte pour la Création de Projet

**Question** : Un enseignant indépendant peut être affilié à une école (même sans superadmin). Doit-il pouvoir créer des projets au nom de cette école ou seulement en tant qu'enseignant indépendant ?

**Scénarios possibles** :
1. Enseignant indépendant sans affiliation d'école → Créer en tant qu'enseignant indépendant
2. Enseignant indépendant avec affiliation d'école (même sans superadmin) → Choix entre :
   - Créer en tant qu'enseignant indépendant (sans organisation)
   - Créer au nom de l'école (si permissions suffisantes)

## Analyse du Backend

### Endpoints Disponibles

1. **`POST /api/v1/projects`** avec `context='teacher'`
   - Accepte `organization_id` optionnel
   - Si `organization_id` fourni : valide que l'enseignant peut gérer des projets pour cette école
   - Si `organization_id` absent : crée un projet indépendant (sans association d'école)
   - Valide les `school_level_ids` si fournis (doivent être des classes gérées par l'enseignant)

2. **`GET /api/v1/teachers/projects`**
   - Retourne les projets créés par l'enseignant + projets des classes gérées
   - Supporte pagination et filtres (status, search)

### Permissions pour Créer des Projets au Nom d'une École

D'après `user_school.rb` :
- `can_manage_projects?` : `referent? || admin? || superadmin?`
- Un enseignant peut être `referent`, `admin`, ou `superadmin` d'une école même si l'école n'a pas de superadmin initial

### Available Contexts pour Enseignants

D'après `user_serializer.rb` :
- `available_contexts.schools` : Liste des écoles où l'enseignant est membre confirmé
- `available_contexts.teacher_dashboard` : `true` si rôle enseignant
- `available_contexts.independent_teacher` : Informations sur le statut d'enseignant indépendant

## Solutions Proposées

### Solution A : Création Uniquement en Tant qu'Enseignant Indépendant (Recommandé pour MVP)

**Principe** : Les enseignants créent toujours des projets en tant qu'enseignants indépendants, sans association d'école.

**Avantages** :
- Simple à implémenter
- Pas de confusion sur le contexte
- Cohérent avec le concept d'enseignant indépendant

**Inconvénients** :
- Ne permet pas de créer des projets au nom d'une école même si l'enseignant a les permissions

**Changements nécessaires** :
1. Modifier `getOrganizationId` pour retourner `undefined` pour les enseignants
2. Modifier `ProjectModal` pour gérer `organizationId === undefined` pour les enseignants
3. Utiliser `context='teacher'` sans `organization_id`

### Solution B : Choix Entre Enseignant Indépendant et École (Recommandé pour UX Complète)

**Principe** : Permettre à l'enseignant de choisir entre créer un projet en tant qu'enseignant indépendant ou au nom d'une école (si permissions suffisantes).

**Avantages** :
- Flexibilité maximale
- Permet d'utiliser les permissions d'école si disponibles
- Meilleure UX

**Inconvénients** :
- Plus complexe à implémenter
- Nécessite une UI pour le choix

**Changements nécessaires** :
1. Ajouter un sélecteur dans `ProjectModal` pour choisir le contexte (enseignant indépendant vs école)
2. Modifier `getOrganizationId` pour gérer le choix
3. Valider les permissions si création au nom d'une école

### Solution C : Création Automatique au Nom de l'École si Permissions Suffisantes

**Principe** : Si l'enseignant a les permissions pour gérer des projets dans une école, créer automatiquement au nom de cette école. Sinon, créer en tant qu'enseignant indépendant.

**Avantages** :
- Automatique, pas de choix à faire
- Utilise les permissions disponibles

**Inconvénients** :
- Peut créer de la confusion si l'enseignant veut créer un projet indépendant
- Moins de contrôle pour l'utilisateur

## Plan d'Implémentation Détaillé

### Phase 1 : Correction de l'Affichage des Projets (Priorité Haute)

**Objectif** : Afficher uniquement les projets de l'enseignant au lieu de tous les projets publics.

**Changements** :

1. **Créer fonction API pour récupérer les projets enseignants**
   - **Fichier** : `src/api/Projects.ts` ou créer `src/api/Teacher.ts`
   - **Fonction** :
     ```typescript
     export const getTeacherProjects = async (params?: {
       page?: number;
       per_page?: number;
       status?: string;
       search?: string;
     }): Promise<{ data: any[]; meta: any }> => {
       const response = await apiClient.get('/api/v1/teachers/projects', { params });
       return {
         data: response.data?.data || response.data || [],
         meta: response.data?.meta || {}
       };
     };
     ```

2. **Modifier `Projects.tsx` pour utiliser `getTeacherProjects`**
   - **Fichier** : `src/components/Pages/Projects.tsx`
   - **Changement** :
     ```typescript
     // Avant (ligne 34-45)
     if (isPersonalUser) {
       const response = await getAllProjects();
       // ...
     }
     
     // Après
     if (state.showingPageType === 'teacher') {
       // Use teacher-specific endpoint
       const response = await getTeacherProjects({ per_page: 12 });
       const rawProjects = response.data || [];
       const formattedProjects: Project[] = rawProjects.map((p: any) => {
         return mapApiProjectToFrontendProject(p, state.showingPageType, currentUser.data);
       });
       setProjects(formattedProjects);
     } else if (state.showingPageType === 'user') {
       // Pour les utilisateurs personnels : charger tous les projets publics
       const response = await getAllProjects();
       // ...
     }
     ```

**Tests** :
- Vérifier que seuls les projets de l'enseignant sont affichés
- Vérifier que les projets des classes gérées sont inclus
- Vérifier que les filtres fonctionnent

### Phase 2 : Correction de la Création de Projet (Priorité Haute)

**Objectif** : Permettre aux enseignants indépendants de créer des projets.

**Option A : Création Uniquement en Tant qu'Enseignant Indépendant**

**Changements** :

1. **Modifier `getOrganizationId` pour les enseignants**
   - **Fichier** : `src/utils/projectMapper.ts`
   - **Changement** :
     ```typescript
     export const getOrganizationId = (
         user: User,
         showingPageType: ShowingPageType
     ): number | undefined => {
         if (showingPageType === 'pro') {
             return user.available_contexts?.companies?.[0]?.id;
         } else if (showingPageType === 'edu') {
             return user.available_contexts?.schools?.[0]?.id;
         } else if (showingPageType === 'teacher') {
             // Teachers create projects independently, not tied to a school
             return undefined;
         }
         return undefined;
     };
     ```

2. **Modifier `mapFrontendToBackend` pour gérer `organizationId === undefined`**
   - **Fichier** : `src/utils/projectMapper.ts`
   - **Vérifier** : Le payload accepte déjà `organization_id?: number`, donc `undefined` devrait être accepté

3. **Modifier `ProjectModal` pour gérer le cas où `organizationId` est `undefined`**
   - **Fichier** : `src/components/Modals/ProjectModal.tsx`
   - **Changement** : S'assurer que le champ "organization" n'est pas requis pour les enseignants
   - **Vérifier** : La validation ligne 301 ne devrait pas bloquer si `organization` est vide pour les enseignants

**Option B : Choix Entre Enseignant Indépendant et École**

**Changements supplémentaires** :

1. **Ajouter un sélecteur de contexte dans `ProjectModal`**
   - **Fichier** : `src/components/Modals/ProjectModal.tsx`
   - **Nouveau state** :
     ```typescript
     const [projectContext, setProjectContext] = useState<'independent' | 'school'>('independent');
     const [selectedSchoolId, setSelectedSchoolId] = useState<number | undefined>(undefined);
     ```
   - **UI** : Ajouter un radio button ou dropdown pour choisir le contexte
   - **Logique** : Si `projectContext === 'school'`, utiliser `selectedSchoolId` comme `organizationId`

2. **Modifier `getOrganizationId` pour utiliser le choix**
   - **Fichier** : `src/utils/projectMapper.ts`
   - **Changement** : Accepter un paramètre optionnel pour forcer `undefined` ou utiliser l'école sélectionnée

3. **Valider les permissions si création au nom d'une école**
   - **Fichier** : `src/components/Modals/ProjectModal.tsx`
   - **Vérifier** : Vérifier que `available_contexts.schools` contient une école avec `can_manage_projects: true`

### Phase 3 : Gestion du Champ "Organization" dans le Modal

**Problème** : Le champ "organization" est prérempli avec le nom de l'école, mais pour les enseignants indépendants, il devrait être vide ou afficher le nom de l'enseignant indépendant.

**Changements** :

1. **Modifier la préremplissage dans `ProjectModal`**
   - **Fichier** : `src/components/Modals/ProjectModal.tsx`
   - **Changement ligne 160-166** :
     ```typescript
     // Avant
     if (state.showingPageType === 'teacher' && state.user.available_contexts?.schools?.[0]) {
       defaultOrg = state.user.available_contexts.schools[0].name;
     }
     
     // Après (Option A - Enseignant Indépendant uniquement)
     if (state.showingPageType === 'teacher') {
       // Use independent teacher name or leave empty
       defaultOrg = state.user.available_contexts?.independent_teacher?.organization_name || 
                   `${state.user.name} - Enseignant Indépendant` || 
                   '';
     }
     
     // Après (Option B - Choix)
     if (state.showingPageType === 'teacher') {
       if (projectContext === 'school' && state.user.available_contexts?.schools?.[0]) {
         defaultOrg = state.user.available_contexts.schools[0].name;
       } else {
         defaultOrg = state.user.available_contexts?.independent_teacher?.organization_name || 
                     `${state.user.name} - Enseignant Indépendant` || 
                     '';
       }
     }
     ```

2. **Rendre le champ "organization" optionnel pour les enseignants**
   - **Fichier** : `src/components/Modals/ProjectModal.tsx`
   - **Changement ligne 294** :
     ```typescript
     // Avant
     if (!formData.title || !formData.startDate || !formData.endDate || !formData.organization || !formData.status || !isPathwayValid) {
     
     // Après
     const isOrganizationRequired = state.showingPageType !== 'teacher';
     if (!formData.title || !formData.startDate || !formData.endDate || 
         (isOrganizationRequired && !formData.organization) || 
         !formData.status || !isPathwayValid) {
     ```

## Questions de Clarification

### Question 1 : Contexte de Création de Projet

**Question** : Un enseignant indépendant affilié à une école (même sans superadmin) doit-il pouvoir créer des projets au nom de cette école, ou uniquement en tant qu'enseignant indépendant ?

**Options** :
- **A** : Uniquement en tant qu'enseignant indépendant (plus simple)
- **B** : Choix entre enseignant indépendant et école (plus flexible)
- **C** : Automatiquement au nom de l'école si permissions suffisantes (automatique)

**Recommandation** : Option A pour MVP, Option B pour UX complète

### Question 2 : Affichage du Nom de l'Organisation

**Question** : Dans le champ "organization" du formulaire de création, que doit-on afficher pour un enseignant indépendant ?

**Options** :
- **A** : Nom de l'enseignant indépendant (ex: "Jean Dupont - Enseignant Indépendant")
- **B** : Nom de l'école si affilié, sinon nom de l'enseignant indépendant
- **C** : Laisser vide (l'utilisateur peut remplir)

**Recommandation** : Option A (cohérent avec le concept d'enseignant indépendant)

### Question 3 : Validation du Champ Organization

**Question** : Le champ "organization" doit-il être obligatoire pour les enseignants ?

**Options** :
- **A** : Non obligatoire (peut être vide)
- **B** : Obligatoire mais prérempli avec le nom de l'enseignant indépendant

**Recommandation** : Option B (cohérent avec les autres dashboards)

### Question 4 : Projets Créés par les Enseignants

**Question** : Les projets créés par un enseignant indépendant doivent-ils être associés à des classes (`school_level_ids`) ?

**Options** :
- **A** : Oui, l'enseignant peut associer ses classes indépendantes (`school_id = nil`)
- **B** : Non, les projets sont complètement indépendants
- **C** : Optionnel, l'enseignant peut choisir

**Recommandation** : Option C (flexibilité maximale)

## Ordre d'Implémentation Recommandé

1. ✅ **Phase 1** : Correction de l'affichage des projets (utiliser `/api/v1/teachers/projects`)
2. ✅ **Phase 2** : Correction de la création de projet (Option A - Enseignant Indépendant uniquement)
3. ⏸️ **Phase 3** : Gestion du champ "organization" (selon réponses aux questions)
4. ⏸️ **Phase 4** : Option B - Choix entre enseignant indépendant et école (si demandé)

## Tests à Effectuer

### Tests Manuels

1. **Affichage des Projets** :
   - Se connecter en tant qu'enseignant indépendant
   - Vérifier que seuls les projets de l'enseignant sont affichés
   - Créer un projet et vérifier qu'il apparaît dans la liste
   - Vérifier que les projets des classes gérées sont inclus

2. **Création de Projet** :
   - Se connecter en tant qu'enseignant indépendant sans affiliation d'école
   - Créer un projet et vérifier qu'il est créé avec succès
   - Vérifier que le projet n'est pas associé à une école
   - Vérifier que le projet apparaît dans la liste des projets de l'enseignant

3. **Création avec Affiliation d'École** (si Option B choisie) :
   - Se connecter en tant qu'enseignant indépendant avec affiliation d'école
   - Vérifier le choix de contexte (indépendant vs école)
   - Créer un projet au nom de l'école et vérifier qu'il est associé correctement
   - Créer un projet en tant qu'enseignant indépendant et vérifier qu'il n'est pas associé à l'école

### Tests de Cas Limites

1. Enseignant sans classes assignées → Peut créer des projets indépendants
2. Enseignant avec classes assignées → Peut créer des projets avec ces classes
3. Enseignant avec affiliation d'école mais sans permissions → Ne peut pas créer au nom de l'école (si Option B)

## Risques et Mitigation

### Risques

1. **Régressions** : Modifier la logique de création peut affecter d'autres parties
   - **Mitigation** : Tests complets sur tous les dashboards

2. **Confusion UX** : Si Option B, l'utilisateur peut être confus sur le choix
   - **Mitigation** : UI claire avec explications

3. **Permissions** : Si Option B, validation des permissions peut être complexe
   - **Mitigation** : Validation côté backend déjà en place

## Notes Additionnelles

- Le backend supporte déjà la création de projets avec `context='teacher'` sans `organization_id`
- L'endpoint `/api/v1/teachers/projects` existe déjà et fonctionne correctement
- Les enseignants indépendants ont automatiquement un `IndependentTeacher` créé lors de l'inscription
- Un enseignant peut être à la fois indépendant ET affilié à des écoles

