import { User } from '../types';

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
 * Check if user is project owner
 */
export const isUserProjectOwner = (
  apiProject: any,
  userId: string | undefined
): boolean => {
  if (!apiProject || !userId) return false;
  const userIdStr = userId.toString();
  return apiProject.owner?.id?.toString() === userIdStr;
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

  // Check if user is a co-owner
  if (apiProject.co_owners && Array.isArray(apiProject.co_owners)) {
    const isCoOwner = apiProject.co_owners.some((co: any) => 
      co.id?.toString() === userIdStr
    );
    if (isCoOwner) return true;
  }

  // Check if user is an admin (project member with admin role)
  if (apiProject.project_members && Array.isArray(apiProject.project_members)) {
    const isAdmin = apiProject.project_members.some((member: any) => 
      member.user?.id?.toString() === userIdStr &&
      member.role === 'admin' &&
      member.status === 'confirmed'
    );
    if (isAdmin) return true;
  }

  return false;
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

  // Check if user is owner
  if (isUserProjectOwner(apiProject, userIdStr)) {
    return true;
  }

  // Check if user is in project_members
  if (apiProject.project_members && Array.isArray(apiProject.project_members)) {
    const isMember = apiProject.project_members.some((member: any) => 
      member.user?.id?.toString() === userIdStr &&
      member.status === 'confirmed'
    );
    if (isMember) return true;
  }

  return false;
};


