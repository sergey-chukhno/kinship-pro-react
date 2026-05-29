export type MldsTypeFilter = 'perseverance' | 'remediation';

export interface MldsFilterParams {
  typeFilter: MldsTypeFilter;
  searchTerm: string;
  requestedBy: string;
  targetAudience: string;
  actionObjectives: string;
  organizationFilter: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
}

export function getMldsTypeFromProject(p: { mlds_information?: { type_mlds?: string; type?: string } | null }): MldsTypeFilter {
  const t = p?.mlds_information?.type_mlds ?? p?.mlds_information?.type;
  return t === 'remediation' ? 'remediation' : 'perseverance';
}

export function isRawMldsProject(p: { mlds_information?: unknown; status?: string }): boolean {
  return p.mlds_information != null && p.status !== 'archived';
}

export function isClassicClassProject(p: { mlds_information?: unknown; status?: string }): boolean {
  return p.mlds_information == null && p.status !== 'archived';
}

export function splitClassLevelProjects(all: any[]): { classic: any[]; mlds: any[] } {
  const classic: any[] = [];
  const mlds: any[] = [];
  (all || []).forEach((p) => {
    if (isRawMldsProject(p)) {
      mlds.push(p);
    } else if (isClassicClassProject(p)) {
      classic.push(p);
    }
  });
  return { classic, mlds };
}

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function projectMatchesSearch(p: any, normalizedSearch: string): boolean {
  if (!normalizedSearch) return true;

  const title = String(p.title || '').toLowerCase();
  const description = String(p.description || '').toLowerCase();
  const owner = p.owner;
  const ownerFirstName = String(owner?.first_name || '').toLowerCase();
  const ownerLastName = String(owner?.last_name || '').toLowerCase();
  const ownerFullName = String(owner?.full_name || `${owner?.first_name || ''} ${owner?.last_name || ''}`).trim().toLowerCase();
  const pathway = Array.isArray(p.tags) && p.tags[0]?.name ? String(p.tags[0].name).toLowerCase() : '';
  const status = String(p.status || '').toLowerCase();

  return (
    title.includes(normalizedSearch) ||
    description.includes(normalizedSearch) ||
    ownerFirstName.includes(normalizedSearch) ||
    ownerLastName.includes(normalizedSearch) ||
    ownerFullName.includes(normalizedSearch) ||
    pathway.includes(normalizedSearch) ||
    status.includes(normalizedSearch)
  );
}

function projectMatchesStatus(p: any, statusFilter: string): boolean {
  if (statusFilter === 'all') return true;

  const status = String(p.status || '');
  if (status === statusFilter) return true;
  if (statusFilter === 'draft' && status === 'draft') return true;
  if (statusFilter === 'À venir' && status === 'coming') return true;
  if (statusFilter === 'En cours' && status === 'in_progress') return true;
  if (statusFilter === 'Terminée' && status === 'ended') return true;
  if (statusFilter === 'À valider' && status === 'pending_validation') return true;

  return false;
}

function projectMatchesDates(p: any, startDate: string, endDate: string): boolean {
  const projectStart = p.start_date ? String(p.start_date).split('T')[0] : '';
  const projectEnd = p.end_date ? String(p.end_date).split('T')[0] : '';

  if (startDate && projectStart) {
    if (new Date(projectStart) < new Date(startDate)) return false;
  }
  if (endDate && projectEnd) {
    if (new Date(projectEnd) > new Date(endDate)) return false;
  }
  return true;
}

function projectMatchesMldsFields(p: any, params: MldsFilterParams): boolean {
  const mlds = p.mlds_information;
  if (!mlds) return false;

  if (params.requestedBy !== 'all' && mlds.requested_by !== params.requestedBy) {
    return false;
  }

  if (params.targetAudience !== 'all' && mlds.target_audience !== params.targetAudience) {
    return false;
  }

  if (params.actionObjectives !== 'all') {
    if (
      !mlds.action_objectives ||
      !Array.isArray(mlds.action_objectives) ||
      !mlds.action_objectives.includes(params.actionObjectives)
    ) {
      return false;
    }
  }

  if (params.organizationFilter !== 'all') {
    const selectedLevelId = Number.parseInt(params.organizationFilter, 10);
    if (!Number.isNaN(selectedLevelId)) {
      const levelIds = mlds.school_level_ids;
      if (
        !Array.isArray(levelIds) ||
        !levelIds.some((id: unknown) => Number(id) === selectedLevelId)
      ) {
        return false;
      }
    } else if (
      !mlds.organization_names ||
      !Array.isArray(mlds.organization_names) ||
      !mlds.organization_names.includes(params.organizationFilter)
    ) {
      return false;
    }
  }

  return true;
}

/** Filter raw API projects: MLDS type, search, and MLDS-specific filters (before pagination). */
export function filterRawMldsProjects(rawProjects: any[], params: MldsFilterParams): any[] {
  const normalizedSearch = normalizeSearch(params.searchTerm);

  return rawProjects.filter((p) => {
    if (!isRawMldsProject(p)) return false;
    if (getMldsTypeFromProject(p) !== params.typeFilter) return false;
    if (!projectMatchesSearch(p, normalizedSearch)) return false;
    if (!projectMatchesStatus(p, params.statusFilter)) return false;
    if (!projectMatchesDates(p, params.startDate, params.endDate)) return false;
    if (!projectMatchesMldsFields(p, params)) return false;
    return true;
  });
}

export function countMldsByType(rawProjects: any[]): { perseverance: number; remediation: number } {
  let perseverance = 0;
  let remediation = 0;
  rawProjects.forEach((p) => {
    if (!isRawMldsProject(p)) return;
    if (getMldsTypeFromProject(p) === 'remediation') remediation += 1;
    else perseverance += 1;
  });
  return { perseverance, remediation };
}

export function parseMldsClassLevelId(organizationFilter: string): number | null {
  if (organizationFilter === 'all') return null;
  const id = Number.parseInt(organizationFilter, 10);
  return Number.isNaN(id) ? null : id;
}
