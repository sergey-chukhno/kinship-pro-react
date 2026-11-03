import type { OrganizationContext, ShowingPageType, User } from '../types';
import { getSelectedOrganizationId } from './contextUtils';

/** Current School/Company from available_contexts (pro/edu/teacher). */
export function getSelectedOrganizationContext(
  user: User | null | undefined,
  showingPageType: ShowingPageType | null | undefined
): OrganizationContext | null {
  if (!user || !showingPageType) return null;
  const orgId = getSelectedOrganizationId(user, showingPageType);
  if (orgId == null) return null;
  if (showingPageType === 'pro') {
    return user.available_contexts?.companies?.find((c) => Number(c.id) === Number(orgId)) || null;
  }
  if (showingPageType === 'edu' || showingPageType === 'teacher') {
    return user.available_contexts?.schools?.find((s) => Number(s.id) === Number(orgId)) || null;
  }
  return null;
}

/** Qualiopi-recognized training org (Patrick point 1 / 18). Hcéres later. */
export function isQualiopiOrg(
  user: User | null | undefined,
  showingPageType: ShowingPageType | null | undefined
): boolean {
  return Boolean(getSelectedOrganizationContext(user, showingPageType)?.qualiopi);
}

/** Admin of a Qualiopi org — sees P4.0 formation dashboard. */
export function isQualiopiFormationAdmin(
  user: User | null | undefined,
  showingPageType: ShowingPageType | null | undefined
): boolean {
  if (showingPageType !== 'pro' && showingPageType !== 'edu') return false;
  const org = getSelectedOrganizationContext(user, showingPageType);
  if (!org?.qualiopi) return false;
  return org.role === 'admin' || org.role === 'superadmin';
}

export function initialsFromOrgName(name: string | undefined | null): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'OF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/** French count labels: 0/1 singular. */
export function frenchCountLabel(n: number, singular: string, plural: string): string {
  return `${n} ${n <= 1 ? singular : plural}`;
}
