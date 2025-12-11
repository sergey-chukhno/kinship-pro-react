import { Project } from '../types';

/**
 * Vérifie si l'utilisateur actuel peut attribuer des badges dans le projet
 * @param project - Données du projet
 * @param currentUserId - ID de l'utilisateur actuel
 * @param userProjectRole - Rôle de l'utilisateur dans le projet
 * @param userProjectMember - Données du ProjectMember de l'utilisateur
 * @returns boolean
 */
export const canUserAssignBadges = (
  project: Project | null,
  currentUserId: string | number | null | undefined,
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
): boolean => {
  // Must be a confirmed project participant
  if (!userProjectRole || userProjectRole === 'none') {
    return false;
  }

  // Check explicit project-level permission
  if (userProjectMember?.can_assign_badges_in_project) {
    return true;
  }

  // Check organization-level permissions
  // User must have role: superadmin, admin, referent, or intervenant in an organization
  // associated with the project
  if (userProjectMember?.user?.available_contexts) {
    const contexts = userProjectMember.user.available_contexts;
    const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
    
    // Check schools
    if (contexts.schools) {
      const hasBadgeRole = contexts.schools.some((school: any) => 
        badgeRoles.includes(school.role?.toLowerCase() || '')
      );
      if (hasBadgeRole) {
        return true;
      }
    }
    
    // Check companies
    if (contexts.companies) {
      const hasBadgeRole = contexts.companies.some((company: any) => 
        badgeRoles.includes(company.role?.toLowerCase() || '')
      );
      if (hasBadgeRole) {
        return true;
      }
    }
  }

  // Note: The backend also checks if project owner has badge permissions and delegates
  // This is handled server-side, so we return true if user is owner/co-owner
  // The backend will validate the actual permissions
  if (userProjectRole === 'owner' || userProjectRole === 'co-owner') {
    return true;
  }

  return false;
};

