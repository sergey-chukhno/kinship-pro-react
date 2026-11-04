import { User, ShowingPageType } from '../types';

export type CatalogueOrgType = 'School' | 'Company';

export interface CatalogueOrgRef {
  type: CatalogueOrgType;
  id: number;
  name: string;
  initials: string;
  key: string;
  /** Company Qualiopi agreement active (API). Schools are always false. */
  qualiopi?: boolean;
  /** Live org trust_level — STRATEGIC_PARTNER dérive de Qualiopi dans la grille. */
  trustLevel?: string | null;
}

/** Cartouche OF certifié : Qualiopi vérifié ou STRATEGIC_PARTNER (Patrick GO 04/11). */
export function isCatalogueOrgCertified(
  org?: Pick<CatalogueOrgRef, 'qualiopi' | 'trustLevel'> | null
): boolean {
  if (!org) return false;
  return Boolean(org.qualiopi || org.trustLevel === 'STRATEGIC_PARTNER');
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'OF';
}

/**
 * Org porteuse catalogue 62 = School | Company (pas of-demo).
 * Question produit Patrick : liste formation_organizations dédiée ?
 */
export function resolveCatalogueOrg(
  user: User | null | undefined,
  showingPageType?: ShowingPageType | null
): CatalogueOrgRef | null {
  if (!user) return null;

  const savedId = localStorage.getItem('selectedContextId');
  const savedType = localStorage.getItem('selectedContextType') as
    | 'school'
    | 'company'
    | 'teacher'
    | 'user'
    | 'formation'
    | null;

  const page = showingPageType || (localStorage.getItem('selectedPageType') as ShowingPageType | null);

  if (savedType === 'company' || page === 'pro') {
    const companies = user.available_contexts?.companies || [];
    const company =
      (savedId && companies.find((c) => c.id.toString() === savedId)) ||
      companies.find((c) => c.role === 'admin' || c.role === 'superadmin' || c.role === 'referent') ||
      companies[0];
    if (company) {
      return {
        type: 'Company',
        id: Number(company.id),
        name: company.name,
        initials: initialsFromName(company.name),
        key: `company-${company.id}`,
        qualiopi: Boolean(company.qualiopi),
        trustLevel: company.trust_level,
      };
    }
  }

  if (savedType === 'school' || savedType === 'teacher' || page === 'edu' || page === 'teacher') {
    const schools = user.available_contexts?.schools || [];
    const school =
      (savedId && schools.find((s) => s.id.toString() === savedId)) ||
      schools.find((s) => s.role === 'admin' || s.role === 'superadmin' || s.role === 'referent') ||
      schools[0];
    if (school) {
      return {
        type: 'School',
        id: Number(school.id),
        name: school.name,
        initials: initialsFromName(school.name),
        key: `school-${school.id}`,
        qualiopi: Boolean(school.qualiopi),
        trustLevel: school.trust_level,
      };
    }
  }

  const company = user.available_contexts?.companies?.[0];
  if (company) {
    return {
      type: 'Company',
      id: Number(company.id),
      name: company.name,
      initials: initialsFromName(company.name),
      key: `company-${company.id}`,
      qualiopi: Boolean(company.qualiopi),
      trustLevel: company.trust_level,
    };
  }
  const school = user.available_contexts?.schools?.[0];
  if (school) {
    return {
      type: 'School',
      id: Number(school.id),
      name: school.name,
      initials: initialsFromName(school.name),
      key: `school-${school.id}`,
      qualiopi: Boolean(school.qualiopi),
      trustLevel: school.trust_level,
    };
  }

  return null;
}

/** Création fiche autorisée hors mock OF : contexte School/Company sélectionné. */
export function canCreateCatalogueInCurrentContext(): boolean {
  const t = localStorage.getItem('selectedContextType');
  return t === 'school' || t === 'company';
}
