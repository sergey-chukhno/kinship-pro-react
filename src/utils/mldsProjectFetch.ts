import { getCompanyProjects, getSchoolProjects } from '../api/Dashboard';
import { getLevelMLDSProjects } from '../api/SchoolDashboard/Levels';
import { getAllUserProjects } from '../api/Project';
import { getTeacherProjects } from '../api/Projects';

const MLDS_FETCH_PER_PAGE = 1000;

type PaginatedResponse = {
  data?: any[];
  meta?: { total_pages?: number; total_count?: number };
};

type PageFetchResult = {
  data?: PaginatedResponse | any[];
};

function isPaginatedResponse(payload: PaginatedResponse | any[]): payload is PaginatedResponse {
  return !Array.isArray(payload);
}

function extractBatch(response: PageFetchResult): any[] {
  const payload = response.data;
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;
  if (isPaginatedResponse(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }
  return [];
}

function extractMeta(response: PageFetchResult): { total_pages: number } {
  const payload = response.data;
  if (payload == null || Array.isArray(payload)) return { total_pages: 1 };
  if (isPaginatedResponse(payload)) {
    return { total_pages: payload.meta?.total_pages ?? 1 };
  }
  return { total_pages: 1 };
}

async function fetchAllPages(
  fetchPage: (page: number, perPage: number) => Promise<PageFetchResult>
): Promise<any[]> {
  const perPage = MLDS_FETCH_PER_PAGE;
  let page = 1;
  let totalPages = 1;
  const all: any[] = [];

  do {
    const response = await fetchPage(page, perPage);
    all.push(...extractBatch(response));
    totalPages = extractMeta(response).total_pages;
    page += 1;
  } while (page <= totalPages);

  return all;
}

export async function fetchAllSchoolProjects(schoolId: number, includeBranches: boolean): Promise<any[]> {
  return fetchAllPages(async (page, perPage) => {
    const response = await getSchoolProjects(schoolId, includeBranches, perPage, page);
    return { data: response.data as PaginatedResponse | any[] };
  });
}

export async function fetchAllCompanyProjects(companyId: number, includeBranches: boolean): Promise<any[]> {
  return fetchAllPages(async (page, perPage) => {
    const response = await getCompanyProjects(companyId, includeBranches, perPage, page);
    return { data: response.data as PaginatedResponse | any[] };
  });
}

export async function fetchAllUserProjectsPages(): Promise<any[]> {
  return fetchAllPages(async (page, perPage) => {
    const response = await getAllUserProjects({ page, per_page: perPage });
    return { data: response.data as PaginatedResponse | any[] };
  });
}

export async function fetchAllTeacherProjectsPages(): Promise<any[]> {
  const main = await fetchAllPages(async (page, perPage) => {
    const result = await getTeacherProjects({ page, per_page: perPage });
    return { data: { data: result.data, meta: result.meta } };
  });

  try {
    const drafts = await fetchAllPages(async (page, perPage) => {
      const result = await getTeacherProjects({ page, per_page: perPage, status: 'draft' } as any);
      return { data: { data: result.data, meta: result.meta } };
    });
    return [...main, ...drafts];
  } catch {
    return main;
  }
}

export async function fetchAllLevelMldsProjects(levelId: number): Promise<any[]> {
  return fetchAllPages(async (page, perPage) => {
    const response = await getLevelMLDSProjects(levelId, { page, per_page: perPage });
    const payload = response.data;
    if (Array.isArray(payload)) {
      return { data: payload };
    }
    const paginated = payload as PaginatedResponse | undefined;
    return {
      data: {
        data: paginated?.data ?? [],
        meta: paginated?.meta ?? { total_pages: 1 },
      },
    };
  });
}

export function dedupeProjectsById(projects: any[]): any[] {
  const byId = new Map<string, any>();
  projects.forEach((p) => {
    if (!p?.id) return;
    byId.set(String(p.id), p);
  });
  return Array.from(byId.values());
}
