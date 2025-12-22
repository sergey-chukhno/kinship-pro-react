# Plan d'Implémentation : Intégration de l'Attribution de Badges avec les Données Backend

## 📋 Vue d'ensemble

Ce document décrit le plan d'implémentation pour connecter le modal "Attribuer un badge" avec les vraies données du backend, incluant :
1. La vérification des permissions pour afficher le bouton "Attribuer un badge"
2. La connexion de tous les champs du modal avec les données backend
3. L'intégration avec l'API d'attribution de badges

## 🎯 Objectifs

### 1. Permissions d'affichage du bouton "Attribuer un badge"
Le bouton doit être visible uniquement aux membres qui ont les droits pour attribuer des badges :
- **Condition 1** : Le membre doit être un participant confirmé du projet
- **Condition 2** : Le membre doit avoir les droits pour attribuer des badges, déterminés par :
  - **Option A** : Droit explicite au niveau projet (`can_assign_badges_in_project: true`)
  - **Option B** : Droit au niveau organisation (rôles : `superadmin`, `admin`, `referent`, `intervenant`) dans une organisation liée au projet
  - **Option C** : Le propriétaire du projet a les droits et peut déléguer (logique backend)

### 2. Connexion du modal avec les données backend
- Remplacer les données mockées par des appels API réels
- Récupérer la liste des badges disponibles depuis le backend
- Récupérer les participants du projet depuis le backend
- Soumettre l'attribution via l'API backend

## 🔍 Analyse de l'Existant

### Backend

#### Endpoints API disponibles :
1. **`GET /api/v1/badges`** : Liste tous les badges disponibles
   - Paramètres optionnels : `series`, `level`, `name`
   - Retourne : Array de badges avec `id`, `name`, `description`, `level`, `series`, `domains`, `expertises`

2. **`GET /api/v1/projects/:id/members`** : Liste les membres du projet
   - Retourne : Array de membres avec `id`, `user`, `role`, `status`, `can_assign_badges_in_project`

3. **`POST /api/v1/projects/:id/badges`** : Attribue un badge à un ou plusieurs membres
   - Paramètres requis :
     - `badge_id` (integer)
     - `recipient_ids` (array d'integers)
   - Paramètres optionnels :
     - `badge_skill_ids` (array d'integers) - pour les domaines d'engagement et expertises
     - `comment` (string)
     - `organization_id` (integer) - si non fourni, backend détermine automatiquement

#### Structure des données backend :

**Badge** :
```ruby
{
  id: integer,
  name: string,              # Ex: "Adaptabilité"
  description: string,       # Description du badge
  level: string,             # "level_1", "level_2", "level_3", "level_4"
  series: string,            # Ex: "Série TouKouLeur", "Série CPS", etc.
  domains: [                 # Domaines d'engagement (tous les niveaux)
    {
      id: integer,
      name: string,
      category: "domain"
    }
  ],
  expertises: [              # Expertises (uniquement level_1 et level_2)
    {
      id: integer,
      name: string,
      category: "expertise"
    }
  ]
}
```

**ProjectMember** :
```ruby
{
  id: integer,
  user: {
    id: integer,
    full_name: string,
    email: string,
    avatar_url: string,
    # ... autres champs utilisateur
  },
  project_role: string,      # "owner", "co_owner", "admin", "member"
  status: string,            # "pending", "confirmed"
  can_assign_badges_in_project: boolean
}
```

#### Logique de permissions backend :

Dans `ProjectMember#can_assign_badges?` :
1. Vérifie `can_assign_badges_in_project?` (droit explicite projet)
2. Vérifie `user.can_give_badges_in_project?(project)` (droit organisation)
3. Vérifie si le propriétaire du projet a les droits (délégation)

### Frontend

#### Fichiers concernés :

1. **`src/components/Pages/ProjectManagement.tsx`**
   - Ligne 1655 : Bouton "Attribuer un badge" dans le header
   - Ligne 2117 : Bouton "Attribuer un badge" sur les cartes de participants
   - Ligne 992 : `handleAssignBadge()` - ouvre le modal
   - Ligne 998 : `handleBadgeAssignment()` - callback après attribution
   - Ligne 550-567 : `fetchAllProjectMembers()` - récupère les participants

2. **`src/components/Modals/BadgeAssignmentModal.tsx`**
   - Ligne 74-180 : Données mockées `badgeData` (hardcodé)
   - Ligne 529-642 : `handleSubmit()` - crée une attribution locale (mock)
   - Ligne 40-47 : Props du modal incluant `participants`, `projectId`, `projectTitle`

3. **`src/api/Projects.ts`**
   - Ligne 794 : `getProjectMembers()` - récupère les membres du projet
   - **Manquant** : Fonction pour récupérer les badges
   - **Manquant** : Fonction pour attribuer un badge

## 📝 Plan d'Implémentation Détaillé

### Phase 1 : Création des fonctions API

#### 1.0. Vérification backend pour les fichiers
**Note importante** : Le modèle `UserBadge` supporte déjà les fichiers avec `has_many_attached :documents`, mais l'endpoint API `assign_badge` ne les accepte pas encore dans les paramètres. 

**Pour l'implémentation actuelle (niveau 1)** : Aucune action nécessaire, car les fichiers ne sont requis que pour les niveaux 2+.

**Pour les niveaux futurs** : Il faudra modifier le backend pour accepter les fichiers dans l'endpoint `assign_badge`. Cela nécessitera :
- Modifier `app/controllers/api/v1/projects_controller.rb#assign_badge` pour accepter `documents` dans les paramètres
- Utiliser `multipart/form-data` pour l'upload de fichiers
- Créer une branche backend dédiée pour ces changements

#### 1.1. Créer `src/api/Badges.ts`
**Objectif** : Centraliser tous les appels API liés aux badges

**Fonctions à créer** :
```typescript
/**
 * Récupère la liste de tous les badges disponibles
 * @param filters - Filtres optionnels (series, level, name)
 * @returns Promise<Badge[]>
 */
export const getBadges = async (filters?: BadgeFilters): Promise<Badge[]>

/**
 * Récupère la liste des badges attribués dans un projet
 * @param projectId - ID du projet
 * @returns Promise<UserBadge[]>
 */
export const getProjectBadges = async (projectId: number): Promise<UserBadge[]>

/**
 * Attribue un badge à un ou plusieurs membres du projet
 * @param projectId - ID du projet
 * @param badgeData - Données d'attribution
 * @param files - Fichiers optionnels à attacher (array de File)
 * @returns Promise<AssignmentResponse>
 */
export const assignBadge = async (
  projectId: number,
  badgeData: {
    badge_id: number;
    recipient_ids: number[];
    badge_skill_ids?: number[];
    comment?: string;
    organization_id?: number;
  },
  files?: File[]
): Promise<AssignmentResponse>
```

**Types TypeScript à définir** :
```typescript
interface Badge {
  id: number;
  name: string;
  description: string;
  level: 'level_1' | 'level_2' | 'level_3' | 'level_4';
  series: string;
  domains: BadgeSkill[];
  expertises: BadgeSkill[];
}

interface BadgeSkill {
  id: number;
  name: string;
  category: 'domain' | 'expertise';
}

interface AssignmentResponse {
  message: string;
  assigned_count: number;
  project: {
    id: number;
    title: string;
  };
  organization: {
    id: number;
    name: string;
    type: string;
  };
  assignments: Array<{
    user_id: number;
    user_name: string;
    badge_id: number;
    badge_name: string;
    status: string;
    user_badge_id: number;
  }>;
  errors?: string[];
}

interface BadgeFilters {
  series?: string;
  level?: string;  // Pour l'instant, toujours 'level_1'
  name?: string;
}
```

### Phase 2 : Vérification des permissions côté frontend

#### 2.1. Créer une fonction utilitaire `canUserAssignBadges()`
**Fichier** : `src/utils/badgePermissions.ts` (nouveau fichier)

**Logique** :
```typescript
/**
 * Vérifie si l'utilisateur actuel peut attribuer des badges dans le projet
 * @param project - Données du projet
 * @param currentUserId - ID de l'utilisateur actuel
 * @param userProjectRole - Rôle de l'utilisateur dans le projet
 * @param userProjectMember - Données du ProjectMember de l'utilisateur
 * @returns boolean
 */
export const canUserAssignBadges = (
  project: Project,
  currentUserId: string | number,
  userProjectRole: string | null,
  userProjectMember?: {
    can_assign_badges_in_project?: boolean;
    user?: {
      available_contexts?: {
        schools?: Array<{ id: number; role: string }>;
        companies?: Array<{ id: number; role: string }>;
      };
    };
  }
): boolean
```

**Logique de vérification** :
1. Vérifier si l'utilisateur est un participant confirmé (`userProjectRole !== null` et `status === 'confirmed'`)
2. Vérifier `can_assign_badges_in_project` (droit explicite projet)
3. Vérifier les droits organisationnels :
   - Parcourir `project.companies` et `project.schools`
   - Pour chaque organisation, vérifier si l'utilisateur a un rôle `superadmin`, `admin`, `referent`, ou `intervenant`
   - Vérifier si l'organisation a un contrat actif (nécessite un appel API ou données dans le projet)
4. Si le propriétaire du projet a les droits, permettre l'attribution (logique backend, mais on peut vérifier côté frontend aussi)

**Note** : La vérification complète des permissions se fait côté backend lors de l'appel API. Cette fonction frontend sert uniquement à afficher/masquer le bouton.

#### 2.2. Modifier `ProjectManagement.tsx` pour utiliser `canUserAssignBadges()`
- Ajouter un état `canAssignBadges` calculé à partir de `canUserAssignBadges()`
- Conditionner l'affichage du bouton "Attribuer un badge" (lignes 1655 et 2117) avec `canAssignBadges`
- Mettre à jour `canAssignBadges` lorsque les données du projet ou du membre changent

### Phase 3 : Connexion du modal avec les données backend

#### 3.1. Modifier `BadgeAssignmentModal.tsx` pour récupérer les badges depuis l'API

**Changements** :
1. **Remplacer les données mockées** :
   - Supprimer `badgeData` hardcodé (lignes 74-180)
   - Ajouter un état `badges` pour stocker les badges récupérés depuis l'API
   - Ajouter un état `loadingBadges` pour gérer le chargement
   - Filtrer les badges pour n'afficher que ceux de niveau 1 (`level === 'level_1'`)

2. **Ajouter `useEffect` pour charger les badges** :
   ```typescript
   useEffect(() => {
     const fetchBadges = async () => {
       setLoadingBadges(true);
       try {
         // Filtrer uniquement les badges de niveau 1
         const badgesData = await getBadges({ level: 'level_1' });
         // Organiser les badges par série
         const organizedBadges = organizeBadgesBySeries(badgesData);
         setBadges(organizedBadges);
       } catch (error) {
         console.error('Error fetching badges:', error);
         showErrorToast('Erreur lors du chargement des badges');
       } finally {
         setLoadingBadges(false);
       }
     };
     
     fetchBadges();
   }, []);
   ```

3. **Créer une fonction `organizeBadgesBySeries()`** :
   - Grouper les badges par `series`
   - Pour chaque série, grouper par `level` (uniquement niveau 1 pour l'instant)
   - Retourner une structure similaire à `badgeData` actuel pour minimiser les changements dans le JSX

4. **Mettre à jour les sélecteurs** :
   - Le sélecteur de série doit utiliser les séries récupérées depuis l'API
   - **Le sélecteur de niveau doit être désactivé/grisé** (niveau 1 uniquement)
   - Le sélecteur de badge (title) doit utiliser les badges disponibles pour la série sélectionnée (niveau 1 uniquement)

5. **Gérer les domaines d'engagement et expertises** :
   - Pour chaque badge sélectionné, récupérer ses `domains` et `expertises` depuis les données API
   - Afficher les domaines d'engagement dans le sélecteur approprié (sélection unique)
   - Afficher les expertises avec des **checkboxes pour sélection multiple** (uniquement pour niveau 1)

#### 3.2. Modifier `BadgeAssignmentModal.tsx` pour utiliser les participants réels

**Changements** :
1. **Vérifier que `participants` est bien passé depuis `ProjectManagement.tsx`** :
   - Les participants sont déjà récupérés via `fetchAllProjectMembers()`
   - Vérifier que la structure correspond à ce qui est attendu par le modal

2. **Filtrer les participants** :
   - Afficher uniquement les participants avec `status === 'confirmed'`
   - **Modifier le sélecteur pour permettre la sélection multiple** (checkbox au lieu de select simple)

3. **Ajouter la sélection d'organisation** :
   - Récupérer les organisations où l'utilisateur a des droits de badge depuis `state.user.available_contexts`
   - Si plusieurs organisations : afficher un sélecteur d'organisation dans le modal
   - Si une seule organisation : sélection automatique
   - Passer `organization_id` dans la requête API

#### 3.3. Modifier `handleSubmit()` pour appeler l'API backend

**Changements** :
1. **Mapper les données du formulaire vers le format API** :
   ```typescript
   const badgeData = {
     badge_id: selectedBadge.id,  // ID du badge sélectionné
     recipient_ids: selectedParticipants.map(p => parseInt(p)),  // Array d'IDs (sélection multiple)
     badge_skill_ids: selectedExpertises.map(e => parseInt(e)),  // Array d'IDs (sélection multiple)
     comment: commentaire || undefined,
     organization_id: selectedOrganizationId || undefined  // Organisation sélectionnée
   };
   ```

2. **Appeler `assignBadge()`** :
   ```typescript
   try {
     const response = await assignBadge(projectId, badgeData);
     // Gérer la réponse
     showSuccessToast(`Badge attribué avec succès à ${response.assigned_count} membre(s)`);
     // Rafraîchir la liste des badges attribués
     await refreshProjectBadges();
     // Fermer le modal après un délai
     setTimeout(() => {
       setIsBadgeModalOpen(false);
     }, 2000);
   } catch (error) {
     // Gérer les erreurs
     showErrorToast(error.response?.data?.message || 'Erreur lors de l\'attribution du badge');
   }
   ```

3. **Gérer les fichiers (preuves)** :
   - **Note** : Les fichiers sont optionnels pour les badges de niveau 1, mais peuvent être utilisés
   - Si un fichier est fourni, utiliser `multipart/form-data` et inclure `documents[]` dans la requête
   - Si aucun fichier n'est fourni, utiliser `application/json` (rétrocompatibilité)
   - Le backend accepte maintenant les fichiers via le paramètre `documents[]` (array de fichiers)

4. **Rafraîchir les données après attribution** :
   - Après une attribution réussie, appeler `GET /api/v1/projects/:id/badges` pour rafraîchir la liste
   - Mettre à jour le contexte/local state avec les nouvelles données
   - Optionnel : Rafraîchir également la liste des participants pour refléter les nouveaux badges

### Phase 4 : Gestion des erreurs et validation

#### 4.1. Validation côté frontend
- Valider que tous les champs requis sont remplis avant de soumettre
- Valider que le participant sélectionné est un membre confirmé du projet
- Valider que le badge sélectionné existe et est disponible

#### 4.2. Gestion des erreurs backend
- Afficher des messages d'erreur spécifiques selon le code de statut HTTP :
  - `403 Forbidden` : "Vous n'avez pas les permissions pour attribuer des badges"
  - `400 Bad Request` : Afficher le message d'erreur du backend
  - `404 Not Found` : "Badge ou participant non trouvé"
  - `422 Unprocessable Entity` : Afficher les détails de validation

### Phase 5 : Tests et validation

#### 5.1. Tests fonctionnels
- [ ] Vérifier que le bouton "Attribuer un badge" s'affiche uniquement pour les utilisateurs autorisés
- [ ] Vérifier que le modal charge correctement les badges depuis l'API (niveau 1 uniquement)
- [ ] Vérifier que les niveaux 2, 3, 4 sont désactivés/grisés
- [ ] Vérifier que les participants sont correctement affichés (tous les confirmés)
- [ ] Vérifier que la sélection multiple de participants fonctionne
- [ ] Vérifier que la sélection multiple d'expertises fonctionne
- [ ] Vérifier que le sélecteur d'organisation s'affiche si plusieurs organisations disponibles
- [ ] Vérifier que l'attribution fonctionne avec différents types de badges (niveau 1)
- [ ] Vérifier que les domaines d'engagement et expertises sont correctement affichés
- [ ] Vérifier que la liste des badges est rafraîchie après attribution
- [ ] Vérifier que les messages d'erreur sont correctement affichés

#### 5.2. Tests de permissions
- [ ] Tester avec un utilisateur ayant `can_assign_badges_in_project: true`
- [ ] Tester avec un utilisateur ayant des droits organisationnels
- [ ] Tester avec un utilisateur sans droits (le bouton ne doit pas apparaître)
- [ ] Tester avec un utilisateur non participant du projet

## ✅ Réponses aux Questions de Clarification

### Question 1 : Gestion des fichiers (preuves)
**Réponse** : ✅ **Backend modifié** - L'endpoint API `assign_badge` accepte maintenant les fichiers via `multipart/form-data`.

**Décision** : 
- Pour les badges de niveau 1 (implémentation actuelle) : Les fichiers sont **optionnels** mais peuvent être utilisés
- Le backend supporte maintenant l'upload de fichiers via le paramètre `documents[]` en `multipart/form-data`
- L'endpoint reste rétrocompatible avec `application/json` (sans fichiers)

**Implémentation backend** :
- ✅ Modifié `app/controllers/api/v1/projects_controller.rb#assign_badge` pour accepter les fichiers
- ✅ Ajouté des specs RSpec pour tester l'upload de fichiers
- ✅ Créé un script cURL de test (`test_badge_file_upload.sh`)
- ✅ Mis à jour la documentation Swagger

**Impact frontend** : 
- Le frontend doit supporter l'upload de fichiers optionnel pour les badges de niveau 1
- Utiliser `multipart/form-data` lorsque des fichiers sont fournis
- Utiliser `application/json` lorsque aucun fichier n'est fourni (rétrocompatibilité)

### Question 2 : Organisation pour l'attribution
**Réponse** : Permettre à l'utilisateur de choisir une organisation s'il en a plusieurs avec des droits de badge.

**Implémentation** :
- Ajouter un sélecteur d'organisation dans le modal si l'utilisateur a plusieurs organisations avec droits
- Si une seule organisation : sélection automatique
- Si plusieurs organisations : afficher un dropdown pour choisir
- Passer `organization_id` dans la requête API

### Question 3 : Rafraîchissement des données
**Réponse** : Oui, rafraîchir automatiquement la liste des badges attribués après attribution.

**Implémentation** :
- Après attribution réussie, appeler `GET /api/v1/projects/:id/badges` pour rafraîchir la liste
- Mettre à jour le contexte/local state avec les nouvelles données

### Question 4 : Affichage des badges dans le modal
**Réponse** : Garder les images locales pour l'instant (`/wetransfer_badges-kinship_2025-09-15_1406/...`).

**Justification** :
- Le backend ne retourne pas d'URLs d'images dans le `BadgeSerializer`
- Les images locales sont déjà en place et fonctionnent
- Migration future possible vers URLs backend si nécessaire

### Question 5 : Filtrage des participants
**Réponse** : Afficher tous les participants confirmés, sans filtrer par organisation.

**Implémentation** :
- Filtrer uniquement par `status === 'confirmed'`
- Afficher tous les participants confirmés du projet

### Question 6 : Gestion des badges multiples
**Réponse** : 
- Permettre l'attribution à plusieurs participants en une fois
- Permettre la sélection de plusieurs expertises (compétences) à la fois

**Implémentation** :
- Modifier le sélecteur de participants pour permettre la sélection multiple
- Modifier le sélecteur d'expertises pour permettre la sélection multiple (checkbox au lieu de select)
- Envoyer `recipient_ids` comme array et `badge_skill_ids` comme array dans la requête API

### Contrainte importante : Niveau 1 uniquement
**Réponse** : Implémenter uniquement les badges de niveau 1 pour l'instant. Rendre les autres niveaux non sélectionnables (grisés).

**Implémentation** :
- Filtrer les badges pour n'afficher que ceux de niveau 1
- Désactiver/griser les sélecteurs de niveau 2, 3, 4
- Masquer les champs spécifiques aux niveaux supérieurs (commentaire requis niveau 3-4, fichiers niveau 2+)

## 📦 Fichiers à Modifier/Créer

### Fichiers à créer :
1. `src/api/Badges.ts` - Nouvelles fonctions API
2. `src/utils/badgePermissions.ts` - Fonction de vérification des permissions

### Fichiers à modifier :
1. `src/components/Pages/ProjectManagement.tsx`
   - Ajouter la vérification des permissions pour le bouton
   - Passer les participants réels au modal
   - Passer les organisations disponibles pour la sélection
   - Gérer le callback après attribution
   - Ajouter une fonction pour rafraîchir la liste des badges attribués

2. `src/components/Modals/BadgeAssignmentModal.tsx`
   - Remplacer les données mockées par des appels API
   - Ajouter la sélection multiple de participants (checkboxes)
   - Ajouter la sélection multiple d'expertises (checkboxes)
   - Ajouter le sélecteur d'organisation (si plusieurs organisations disponibles)
   - Désactiver/griser les niveaux 2, 3, 4
   - Filtrer les badges pour n'afficher que le niveau 1
   - Modifier `handleSubmit()` pour appeler l'API backend avec sélection multiple
   - Ajouter la gestion des erreurs
   - Rafraîchir la liste des badges après attribution réussie

3. `src/types/index.ts`
   - Ajouter les types TypeScript pour `Badge`, `BadgeSkill`, `AssignmentResponse`, `BadgeFilters`

## 🚀 Ordre d'Implémentation Recommandé

1. **Étape 1** : Créer `src/api/Badges.ts` et tester les appels API
2. **Étape 2** : Créer `src/utils/badgePermissions.ts` et tester la logique de permissions
3. **Étape 3** : Modifier `ProjectManagement.tsx` pour utiliser `canUserAssignBadges()`
4. **Étape 4** : Modifier `BadgeAssignmentModal.tsx` pour charger les badges depuis l'API
5. **Étape 5** : Modifier `handleSubmit()` pour appeler l'API backend
6. **Étape 6** : Tests et validation

## ⚠️ Points d'Attention

1. **Compatibilité** : S'assurer que les changements ne cassent pas les fonctionnalités existantes
2. **Performance** : Les badges peuvent être nombreux, prévoir un chargement optimisé (lazy loading si nécessaire)
3. **Gestion d'erreurs** : Toujours afficher des messages d'erreur clairs et utiles
4. **Validation** : Valider les données côté frontend avant l'envoi à l'API
5. **UX** : Maintenir une expérience utilisateur fluide avec des indicateurs de chargement

## 📚 Références

- Backend API Documentation : `kinship_backend/app/controllers/api/v1/projects_controller.rb`
- Backend Models : `kinship_backend/app/models/project_member.rb`, `kinship_backend/app/models/badge.rb`
- Frontend API : `kinship-pro-react/src/api/Projects.ts`
- Frontend Modal : `kinship-pro-react/src/components/Modals/BadgeAssignmentModal.tsx`

