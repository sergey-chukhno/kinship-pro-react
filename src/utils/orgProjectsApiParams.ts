export type OrgProjectsQueryParams = {
  include_branches?: boolean;
  per_page?: number;
  page?: number;
  search?: string;
  exclude_mlds?: boolean;
  statuses?: string[];
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
};

const DEFAULT_ACTIVE_STATUSES = ['coming', 'in_progress', 'ended'];

/** Map UI status filter to API statuses[] for my-org dashboard tab. */
export function mapStatusFilterToApiStatuses(statusFilter: string): string[] {
  switch (statusFilter) {
    case 'À venir':
      return ['coming'];
    case 'En cours':
      return ['in_progress'];
    case 'Terminée':
      return ['ended'];
    case 'all':
    default:
      return DEFAULT_ACTIVE_STATUSES;
  }
}

export function buildMyOrgProjectsParams(
  page: number,
  statusFilter: string,
  search?: string
): OrgProjectsQueryParams {
  return {
    include_branches: true,
    page,
    per_page: 12,
    exclude_mlds: true,
    statuses: mapStatusFilterToApiStatuses(statusFilter),
    search: search || undefined,
    sort_by: 'created_at',
    sort_direction: 'desc',
  };
}
