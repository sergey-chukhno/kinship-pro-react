import apiClient from './config';

/** D-PROJECT-STEPS-01 — étape = Event rattaché au projet (la 63). */
export type ProjectStepEventType =
  | 'workshop'
  | 'session'
  | 'meeting'
  | 'training'
  | 'other';

export interface ProjectStep {
  id: number;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  duration_minutes?: number | null;
  location?: string | null;
  event_type: ProjectStepEventType | string;
  status?: string;
  project_id?: number;
  proofs_count: number;
}

export interface ProjectStepPayload {
  title: string;
  date: string;
  time: string;
  description?: string;
  location?: string;
  event_type?: ProjectStepEventType | string;
  duration_minutes?: number | null;
}

function unwrapList(raw: unknown): ProjectStep[] {
  if (Array.isArray(raw)) return raw as ProjectStep[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: ProjectStep[] }).data;
  }
  return [];
}

function unwrapOne(raw: unknown): ProjectStep {
  if (raw && typeof raw === 'object' && 'data' in (raw as object)) {
    return (raw as { data: ProjectStep }).data;
  }
  return raw as ProjectStep;
}

/** GET /api/v1/projects/:projectId/events */
export async function listProjectSteps(projectId: number): Promise<ProjectStep[]> {
  const res = await apiClient.get(`/api/v1/projects/${projectId}/events`);
  return unwrapList(res.data);
}

/** POST /api/v1/projects/:projectId/events */
export async function createProjectStep(
  projectId: number,
  payload: ProjectStepPayload
): Promise<ProjectStep> {
  const res = await apiClient.post(`/api/v1/projects/${projectId}/events`, { event: payload });
  return unwrapOne(res.data);
}

/** PATCH /api/v1/events/:id */
export async function updateProjectStep(
  eventId: number,
  payload: Partial<ProjectStepPayload>
): Promise<ProjectStep> {
  const res = await apiClient.patch(`/api/v1/events/${eventId}`, { event: payload });
  return unwrapOne(res.data);
}

/** DELETE /api/v1/events/:id */
export async function deleteProjectStep(eventId: number): Promise<void> {
  await apiClient.delete(`/api/v1/events/${eventId}`);
}
