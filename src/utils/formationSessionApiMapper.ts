import type { FinancementType, ParticipationMode } from '../types/formationCatalogue';
import type {
  FormationSession,
  FormationSessionFormateur,
  FormationSessionStatus,
} from '../types/formationSession';

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

/** Map BE Project (catalog session) → FE FormationSession. */
export function projectToFormationSession(p: any, orgNameFallback = ''): FormationSession {
  const startDeclared = Boolean(p.start_declared_at);
  const formateur = trainerFromProject(p);
  const people = [
    {
      id: formateur.memberId || 'formateur-1',
      name: formateur.name,
      email: formateur.email,
      role: 'formateur' as const,
    },
  ];
  const startDate = isoDateOnly(p.start_date);
  return {
    id: String(p.id),
    catalogEntryId: p.formation_catalog_entry_id ? String(p.formation_catalog_entry_id) : '',
    title: p.title || '',
    description: p.description || undefined,
    durationHours: p.workload_hours != null ? String(p.workload_hours) : undefined,
    modality: modalityFromBe(p.participation_mode),
    financement: financementFromBe(p.financement_type),
    euMc: Boolean(p.is_eu_mc_declared),
    orgName: p.primary_organization_name || orgNameFallback || '',
    startDate,
    endDate: isoDateOnly(p.end_date),
    formateur,
    practicalInfo: p.practical_information || undefined,
    imageDataUrl: p.main_picture_url || undefined,
    status: mapStatus(p.status, startDeclared),
    startDeclared,
    attendanceSurveyOptIn: false,
    people,
    seances: [
      {
        id: `seance-${p.id}-1`,
        label: 'Séance 1',
        dateIso: startDate,
        timeRange: '09h00 — 12h30',
        status: 'planned',
      },
    ],
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
  };
}
