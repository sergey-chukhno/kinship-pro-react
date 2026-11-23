import type { FinancementType, ParticipationMode } from '../types/formationCatalogue';
import type {
  FormationSession,
  FormationSessionFormateur,
  FormationSessionOrgType,
  FormationSessionPerson,
  FormationSessionStatus,
} from '../types/formationSession';
import { formatWorkloadHoursDisplay } from '../api/formationCatalogMapper';

export type FormationSessionOrgStamp = {
  id: number;
  type: FormationSessionOrgType;
  name?: string;
};

const MODE_TO_BE: Record<ParticipationMode, string> = {
  presentiel: 'on_site',
  distanciel: 'online',
  hybride: 'blended',
};

const MODE_FROM_BE: Record<string, ParticipationMode> = {
  on_site: 'presentiel',
  online: 'distanciel',
  blended: 'hybride',
};

const FIN_TO_BE: Record<string, string> = {
  CPF: 'cpf',
  OPCO: 'opco',
  Entreprise: 'entreprise',
  Association: 'association',
  Institution: 'institution',
  Autre: 'autre',
};

/** Flat `proof_number` (Sergey staging) or nested `project_proof.proof_number`. */
export function extractProofNumber(p: {
  proof_number?: unknown;
  project_proof?: { proof_number?: unknown } | null;
}): string | null {
  const flat = typeof p.proof_number === 'string' ? p.proof_number.trim() : '';
  if (flat) return flat;
  const nested = p.project_proof?.proof_number;
  if (typeof nested === 'string' && nested.trim()) return nested.trim();
  return null;
}

const FIN_FROM_BE: Record<string, FinancementType> = {
  cpf: 'CPF',
  opco: 'OPCO',
  entreprise: 'Entreprise',
  association: 'Association',
  institution: 'Institution',
  autre: 'Autre',
};

export function modalityToBe(mode: ParticipationMode | '' | undefined): string | undefined {
  if (!mode) return undefined;
  return MODE_TO_BE[mode];
}

export function modalityFromBe(raw: string | null | undefined): ParticipationMode | '' {
  if (!raw) return '';
  return MODE_FROM_BE[raw] || '';
}

export function financementToBe(f: FinancementType | '' | undefined): string | undefined {
  if (!f) return undefined;
  return FIN_TO_BE[f] || String(f).toLowerCase();
}

export function financementFromBe(raw: string | null | undefined): FinancementType | '' {
  if (!raw) return '';
  return FIN_FROM_BE[raw.toLowerCase()] || '';
}

function isoDateOnly(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw);
  if (s.includes('T')) return s.slice(0, 10);
  return s.slice(0, 10);
}

function mapStatus(raw: string | undefined, startDeclared: boolean): FormationSessionStatus {
  if (raw === 'ended' || raw === 'archived') return 'ended';
  if (startDeclared || raw === 'in_progress') return 'in_progress';
  return 'coming';
}

function personName(u: any): string {
  if (!u) return '';
  return (
    u.full_name ||
    [u.first_name, u.last_name].filter(Boolean).join(' ') ||
    u.name ||
    ''
  );
}

function trainerFromProject(p: any): FormationSessionFormateur {
  const trainerId = p.responsible_trainer_id;
  const coOwners = Array.isArray(p.co_owners) ? p.co_owners : [];
  const members = Array.isArray(p.project_members) ? p.project_members : [];
  const fromCo = coOwners.find((c: any) => Number(c.id || c.user_id) === Number(trainerId));
  const fromMem = members.find(
    (m: any) => Number(m.user_id || m.user?.id || m.id) === Number(trainerId)
  );
  const user = fromCo || fromMem?.user || fromMem;
  const name = personName(user) || (trainerId ? `Formateur #${trainerId}` : 'Formateur');
  return {
    source: 'structure',
    name,
    email: user?.email,
    memberId: trainerId != null ? String(trainerId) : undefined,
    userId: trainerId != null ? Number(trainerId) : undefined,
  };
}

/** BE role `member` = session participant (import / pre-inscription). */
function participantsFromProject(
  p: any,
  trainerId?: number | null
): FormationSessionPerson[] {
  const members = Array.isArray(p.project_members) ? p.project_members : [];
  const out: FormationSessionPerson[] = [];
  const seen = new Set<string>();
  for (const m of members) {
    if (String(m.role || '') !== 'member') continue;
    const user = m.user || m;
    const uid = m.user_id ?? user?.id ?? m.id;
    if (uid != null && trainerId != null && Number(uid) === Number(trainerId)) continue;
    const id = String(uid ?? `participant-${out.length + 1}`);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: personName(user) || `Participant #${id}`,
      email: user?.email || undefined,
      role: 'participant',
      pending: String(m.status || '') === 'pending',
    });
  }
  return out;
}

/** Map BE Project (catalog session) → FE FormationSession. */
export function projectToFormationSession(
  p: any,
  orgNameFallback = '',
  org?: FormationSessionOrgStamp | null
): FormationSession {
  const startDeclared = Boolean(p.start_declared_at);
  const formateur = trainerFromProject(p);
  const people: FormationSessionPerson[] = [
    {
      id: formateur.memberId || 'formateur-1',
      name: formateur.name,
      email: formateur.email,
      role: 'formateur',
    },
    ...participantsFromProject(p, formateur.userId),
  ];
  const startDate = isoDateOnly(p.start_date);
  return {
    id: String(p.id),
    catalogEntryId: p.formation_catalog_entry_id ? String(p.formation_catalog_entry_id) : '',
    title: p.title || '',
    description: p.description || undefined,
    durationHours: (() => {
      const h = formatWorkloadHoursDisplay(p.workload_hours);
      return h || undefined;
    })(),
    modality: modalityFromBe(p.participation_mode),
    financement: financementFromBe(p.financement_type),
    euMc: Boolean(p.is_eu_mc_declared),
    orgName: p.primary_organization_name || org?.name || orgNameFallback || '',
    organizationId: org?.id,
    organizationType: org?.type,
    startDate,
    endDate: isoDateOnly(p.end_date),
    formateur,
    practicalInfo: p.practical_information || undefined,
    imageDataUrl: p.main_picture_url || undefined,
    status: mapStatus(p.status, startDeclared),
    startDeclared,
    canDeclareEnd:
      p.can_declare_end === undefined ? undefined : Boolean(p.can_declare_end),
    canCloseProject:
      p.can_close_project === undefined ? undefined : Boolean(p.can_close_project),
    activeEndDeclaration: p.active_end_declaration
      ? {
          declaredAt: p.active_end_declaration.declared_at
            ? String(p.active_end_declaration.declared_at)
            : undefined,
          note: p.active_end_declaration.note ?? null,
          declaredById:
            p.active_end_declaration.declared_by_id != null
              ? Number(p.active_end_declaration.declared_by_id)
              : null,
        }
      : null,
    proofNumber: extractProofNumber(p),
    attendanceSurveyOptIn: false,
    people,
    seances: [
      {
        id: `seance-${p.id}-1`,
        label: 'Séance 1',
        dateIso: startDate,
        status: 'planned',
      },
    ],
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
  };
}
