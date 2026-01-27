import { User, ShowingPageType } from '../types';

/**
 * Get the selected organization ID from localStorage
 * Validates that user still has admin/superadmin access
 * Falls back to first organization if no selection or invalid
 */
export const getSelectedOrganizationId = (
  user: User,
  showingPageType: ShowingPageType
): number | undefined => {
  const savedContextId = localStorage.getItem('selectedContextId');
  const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | 'teacher' | 'user' | null;
  
  // If we have a saved context and it matches the current page type
  if (savedContextId && savedContextType) {
    if (savedContextType === 'company' && showingPageType === 'pro') {
      const company = user.available_contexts?.companies?.find(
        (c: any) => c.id.toString() === savedContextId && (c.role === 'admin' || c.role === 'superadmin')
      );
      if (company) return Number(savedContextId);
    } else if (savedContextType === 'school' && (showingPageType === 'edu' || showingPageType === 'teacher')) {
      // For teachers: check if confirmed member (any role), not just admin/superadmin
      // For edu: still require admin/superadmin
      const school = user.available_contexts?.schools?.find(
        (s: any) => s.id.toString() === savedContextId
      );
      if (school) {
        if (showingPageType === 'teacher' || school.role === 'admin' || school.role === 'superadmin') {
          return Number(savedContextId);
        }
      }
    }
  }
  
  // Fallback to first organization (backward compatibility)
  if (showingPageType === 'pro') {
    return user.available_contexts?.companies?.[0]?.id;
  } else if (showingPageType === 'edu') {
    return user.available_contexts?.schools?.[0]?.id;
  } else if (showingPageType === 'teacher') {
    // For teachers: return first confirmed school membership (any role)
    return user.available_contexts?.schools?.[0]?.id;
  }
  
  return undefined;
};

/**
 * Get selected school ID (for school/teacher contexts)
 */
export const getSelectedSchoolId = (user: User, showingPageType: ShowingPageType): number | null => {
  const orgId = getSelectedOrganizationId(user, showingPageType);
  if (showingPageType === 'edu' || showingPageType === 'teacher') {
    return orgId || null;
  }
  return null;
};

/**
 * Get selected company ID (for company contexts)
 */
export const getSelectedCompanyId = (user: User, showingPageType: ShowingPageType): number | null => {
  const orgId = getSelectedOrganizationId(user, showingPageType);
  if (showingPageType === 'pro') {
    return orgId || null;
  }
  return null;
};

/**
 * Get selected organization role
 */
export const getSelectedOrganizationRole = (user: User, showingPageType: ShowingPageType): string => {
  const savedContextId = localStorage.getItem('selectedContextId');
  const savedContextType = localStorage.getItem('selectedContextType') as 'school' | 'company' | null;
  
  if (savedContextId && savedContextType) {
    if (savedContextType === 'company' && showingPageType === 'pro') {
      const company = user.available_contexts?.companies?.find(
        (c: any) => c.id.toString() === savedContextId
      );
      return company?.role || '';
    } else if (savedContextType === 'school' && (showingPageType === 'edu' || showingPageType === 'teacher')) {
      const school = user.available_contexts?.schools?.find(
        (s: any) => s.id.toString() === savedContextId
      );
      return school?.role || '';
    }
  }
  
  // Fallback
  if (showingPageType === 'pro') {
    return user.available_contexts?.companies?.[0]?.role || '';
  } else if (showingPageType === 'edu' || showingPageType === 'teacher') {
    return user.available_contexts?.schools?.[0]?.role || '';
  }
  
  return '';
};
