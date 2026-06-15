import { User } from '../types';

/**
 * Resolve a user id from API payloads (project member, co-responsible, owner, etc.).
 * Prefers user_id / nested user.id over top-level id (which may be a join record id).
 */
export const resolveProjectMemberUserId = (entity: any): string | undefined => {
  if (!entity) return undefined;
  const raw = entity.user_id ?? entity.user?.id ?? entity.id;
  return raw != null ? raw.toString() : undefined;
};

/**
 * True when the user is a project co-responsible (co_owners, MLDS co_responsibles, or co_owner member).
 */
export const isUserListedAsCoResponsible = (
  apiProject: any,
  userId: string | number | undefined
): boolean => {
  if (!apiProject || userId == null) return false;
  const userIdStr = userId.toString();

  for (const list of [apiProject.co_owners, apiProject.co_responsibles]) {
    if (!Array.isArray(list)) continue;
    if (list.some((co: any) => resolveProjectMemberUserId(co) === userIdStr)) {
      return true;
    }
  }

  if (Array.isArray(apiProject.project_members)) {
    return apiProject.project_members.some(
      (member: any) =>
        resolveProjectMemberUserId(member) === userIdStr &&
        (member.role === 'co_owner' ||
          member.is_co_owner ||
          member.project_role === 'co_owner')
    );
  }

  return false;
};

/**
 * Check if the current user is superadmin in any of their organizations (school or company)
 */
export const isUserSuperadmin = (user: User | undefined): boolean => {
  if (!user?.available_contexts) return false;
  const hasSuperadminSchool = (user.available_contexts.schools || []).some(
    (s: any) => (s.role || '').toLowerCase() === 'superadmin'
  );
  const hasSuperadminCompany = (user.available_contexts.companies || []).some(
    (c: any) => (c.role || '').toLowerCase() === 'superadmin'
  );
  return hasSuperadminSchool || hasSuperadminCompany;
};

/**
 * Check if user is admin/referent/superadmin of a given organization
 */
export const isUserOrgAdmin = (
  user: User | undefined,
  organizationId: number | undefined,
  organizationType: 'company' | 'school'
): boolean => {
  if (!user || !organizationId) return false;

  if (organizationType === 'company') {
    const company = user.available_contexts?.companies?.find(
      (c: any) => c.id === organizationId && (c.role === 'admin' || c.role === 'referent' || c.role === 'superadmin')
    );
    return !!company;
  } else {
    const school = user.available_contexts?.schools?.find(
      (s: any) => s.id === organizationId && (s.role === 'admin' || s.role === 'referent' || s.role === 'superadmin')
    );
    return !!school;
  }
};

/**
 * Check if user is superadmin of at least one of the project's organizations (school or company).
 * Used to allow read-only project details only for superadmins of the project's org.
 */
export const isUserSuperadminOfProjectOrg = (
  apiProject: any,
  user: User | undefined
): boolean => {
  if (!apiProject || !user?.available_contexts) return false;

  const isSuperadminInOrg = (orgId: number, type: 'company' | 'school') => {
    if (type === 'company') {
      const c = user.available_contexts?.companies?.find(
        (x: any) => x.id === orgId && (x.role || '').toLowerCase() === 'superadmin'
      );
      return !!c;
    }
    const s = user.available_contexts?.schools?.find(
      (x: any) => x.id === orgId && (x.role || '').toLowerCase() === 'superadmin'
    );
    return !!s;
  };

  if (apiProject.company_ids && Array.isArray(apiProject.company_ids)) {
    for (const companyId of apiProject.company_ids) {
      if (isSuperadminInOrg(companyId, 'company')) return true;
    }
  }

  if (apiProject.school_levels && Array.isArray(apiProject.school_levels)) {
    for (const schoolLevel of apiProject.school_levels) {
      const schoolId = schoolLevel.school_id ?? schoolLevel.school?.id;
      if (schoolId != null && isSuperadminInOrg(schoolId, 'school')) return true;
    }
  }

  return false;
};

/**
 * Check if user is admin/referent/superadmin of any of the project's organizations
 */
export const isUserAdminOfProjectOrg = (
  apiProject: any,
  user: User | undefined
): boolean => {
  if (!apiProject || !user) return false;

  // Check company organizations
  if (apiProject.company_ids && Array.isArray(apiProject.company_ids)) {
    for (const companyId of apiProject.company_ids) {
      if (isUserOrgAdmin(user, companyId, 'company')) {
        return true;
      }
    }
  }

  // Check school organizations
  if (apiProject.school_levels && Array.isArray(apiProject.school_levels)) {
    for (const schoolLevel of apiProject.school_levels) {
      const schoolId = schoolLevel.school_id || schoolLevel.school?.id;
      if (schoolId && isUserOrgAdmin(user, schoolId, 'school')) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Check if user is admin/referent (but not superadmin) of any of the project's organizations
 * Used to allow read-only project details for admins/referents of the project's org
 */
export const isUserAdminOrReferentOfProjectOrg = (
  apiProject: any,
  user: User | undefined
): boolean => {
  if (!apiProject || !user?.available_contexts) return false;

  const isAdminOrReferentInOrg = (orgId: number, type: 'company' | 'school') => {
    if (type === 'company') {
      const c = user.available_contexts?.companies?.find(
        (x: any) => x.id === orgId && ((x.role || '').toLowerCase() === 'admin' || (x.role || '').toLowerCase() === 'referent')
      );
      return !!c;
    }
    const s = user.available_contexts?.schools?.find(
      (x: any) => x.id === orgId && ((x.role || '').toLowerCase() === 'admin' || (x.role || '').toLowerCase() === 'referent')
    );
    return !!s;
  };

  if (apiProject.company_ids && Array.isArray(apiProject.company_ids)) {
    for (const companyId of apiProject.company_ids) {
      if (isAdminOrReferentInOrg(companyId, 'company')) return true;
    }
  }

  if (apiProject.school_levels && Array.isArray(apiProject.school_levels)) {
    for (const schoolLevel of apiProject.school_levels) {
      const schoolId = schoolLevel.school_id ?? schoolLevel.school?.id;
      if (schoolId != null && isAdminOrReferentInOrg(schoolId, 'school')) return true;
    }
  }

  return false;
};

/**
 * Check if user is project owner
 */
export const isUserProjectOwner = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  const userIdStr = userId.toString();
  if (resolveProjectMemberUserId(apiProject.owner) === userIdStr) return true;
  if (apiProject.owner_id != null && apiProject.owner_id.toString() === userIdStr) {
    return true;
  }
  return false;
};

/**
 * Check if user is project co-owner or admin
 */
export const isUserProjectCoOwnerOrAdmin = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  const userIdStr = userId.toString();

  if (isUserListedAsCoResponsible(apiProject, userIdStr)) {
    return true;
  }

  if (apiProject.project_members && Array.isArray(apiProject.project_members)) {
    const isAdmin = apiProject.project_members.some(
      (member: any) =>
        resolveProjectMemberUserId(member) === userIdStr &&
        member.role === 'admin' &&
        member.status === 'confirmed'
    );
    if (isAdmin) return true;
  }

  return false;
};

/**
 * Check if user is specifically a project co-owner (co-responsible)
 * Does not include admins, only co-owners from co_owners array or project_members with co_owner role
 */
export const isUserProjectCoOwner = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  return isUserListedAsCoResponsible(apiProject, userId);
};

/**
 * Check if user can manage a project
 * Returns true if:
 * - User is project owner/co-owner/admin, OR
 * - User is org admin/referent/superadmin of project's organization
 */
export const canUserManageProject = (
  apiProject: any,
  user: User | undefined
): boolean => {
  if (!apiProject || !user) return false;

  const userId = user.id?.toString();

  // Check if user is project owner/co-owner/admin
  if (isUserProjectOwner(apiProject, userId) || isUserProjectCoOwnerOrAdmin(apiProject, userId)) {
    return true;
  }

  // Check if user is org admin of project's organization
  if (isUserAdminOfProjectOrg(apiProject, user)) {
    return true;
  }

  return false;
};

/**
 * Check if user can delete a project
 * Returns true only if user is project owner
 */
export const canUserDeleteProject = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  return isUserProjectOwner(apiProject, userId);
};

/**
 * Check if user is a project participant
 */
export const isUserProjectParticipant = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  const userIdStr = userId.toString();

  if (isUserProjectOwner(apiProject, userIdStr)) {
    return true;
  }

  if (isUserListedAsCoResponsible(apiProject, userIdStr)) {
    return true;
  }

  if (apiProject.project_members && Array.isArray(apiProject.project_members)) {
    const member = apiProject.project_members.find(
      (m: any) => resolveProjectMemberUserId(m) === userIdStr
    );
    if (!member) return false;

    if (member.role === 'co_owner' || member.role === 'admin' || member.is_co_owner) {
      return true;
    }

    return member.status === 'confirmed';
  }

  return false;
};


