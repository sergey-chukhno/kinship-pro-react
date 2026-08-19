export type ProjectPersonRole = 'Admin' | 'Encadrant' | 'Participant';

export type DocVisibility = 'team' | 'participants' | 'public';

export interface ProjectSpaceFunder {
  id: string;
  name: string;
  email?: string;
  shareMode: 'nominatif' | 'anonyme';
  initials: string;
}

export interface ProjectSpacePreparedPerson {
  id: string;
  firstName: string;
  lastName: string;
  birthday?: string;
  email?: string;
  role: ProjectPersonRole;
  systemRole?: string;
  initials: string;
}

interface ProjectSpaceExtras {
  funders: ProjectSpaceFunder[];
  preparedPeople: ProjectSpacePreparedPerson[];
  documentVisibility?: Record<string, DocVisibility>;
  linkVisibility?: Record<string, DocVisibility>;
}

const KEY = 'kinship_project_space_extras';
const SELECTED_ID_KEY = 'kinship_selected_project_space_id';
const TAB_KEY = 'kinship_project_space_tab';

export type ProjectSpaceTab = 'informations' | 'gestion';

function readAll(): Record<string, ProjectSpaceExtras> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, ProjectSpaceExtras>) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, ProjectSpaceExtras>) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

const EMPTY_EXTRAS: ProjectSpaceExtras = { funders: [], preparedPeople: [] };

export function getProjectSpaceExtras(projectId: string): ProjectSpaceExtras {
  return readAll()[projectId] || EMPTY_EXTRAS;
}

export function setProjectSpaceExtras(projectId: string, extras: ProjectSpaceExtras) {
  const all = readAll();
  all[projectId] = extras;
  writeAll(all);
}

export function getSelectedProjectSpaceId(): string | null {
  return sessionStorage.getItem(SELECTED_ID_KEY);
}

export function setSelectedProjectSpaceId(id: string | null) {
  if (id) sessionStorage.setItem(SELECTED_ID_KEY, id);
  else sessionStorage.removeItem(SELECTED_ID_KEY);
}

export function getProjectSpaceTab(): ProjectSpaceTab {
  return sessionStorage.getItem(TAB_KEY) === 'informations' ? 'informations' : 'gestion';
}

export function setProjectSpaceTab(tab: ProjectSpaceTab) {
  sessionStorage.setItem(TAB_KEY, tab);
}

export function openProjectSpace(projectId: string, tab: ProjectSpaceTab = 'gestion') {
  setSelectedProjectSpaceId(projectId);
  setProjectSpaceTab(tab);
}

export function openProjectAffiche(projectId: string) {
  setSelectedProjectSpaceId(projectId);
}

/** Id courant (session) — récupère aussi un éventuel id encore présent dans l’URL, puis le retire. */
export function resolveProjectSpaceId(fallbackId?: string | null): string {
  const stored = getSelectedProjectSpaceId();
  if (stored) return stored;
  if (typeof window === 'undefined') return fallbackId || '';
  const match = /\/project-(?:space|affiche)\/([^/?]+)/.exec(window.location.pathname);
  if (match?.[1]) {
    setSelectedProjectSpaceId(match[1]);
    return match[1];
  }
  return fallbackId || '';
}
