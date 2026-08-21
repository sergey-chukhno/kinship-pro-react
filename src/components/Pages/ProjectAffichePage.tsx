import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProjectById } from '../../api/Project';
import { getProjectBadges } from '../../api/Badges';
import { getCompanyGroup, getCompanyGroups, CompanyGroup } from '../../api/CompanyDashboard/Groups';
import {
  addProjectDocuments,
  addProjectFunder,
  addProjectMember,
  preRegisterProjectParticipant,
  closeProject,
  createProjectTeam,
  deleteProjectDocument,
  fetchAllConfirmedPartnerships,
  getOrganizationMembers,
  getOrCreateProjectShareLink,
  getProjectDocuments,
  getProjectFunders,
  getProjectMembers,
  getProjectStats,
  getProjectTeams,
  getTeacherMembers,
  joinProject,
  Partnership,
  ProjectDocument,
  ProjectFunder,
  ProjectStats,
  removeProjectMember,
  Team,
  updateProject,
  updateProjectDocumentVisibility,
  updateProjectMember,
} from '../../api/Projects';
import { getPersonalUserRoles } from '../../api/RegistrationRessource';
import { useAppContext } from '../../context/AppContext';
import { useToast } from '../../hooks/useToast';
import { Project } from '../../types';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import { getOrganizationType, mapApiProjectToFrontendProject } from '../../utils/projectMapper';
import {
  isUserProjectCoOwner,
  isUserProjectOwner,
  isUserProjectParticipant,
  isUserSuperadminOfProjectOrg,
  resolveProjectMemberUserId,
} from '../../utils/projectPermissions';
import { shouldShowEndDateWarningBanner } from '../../utils/projectStateGuards';
import { translateRole } from '../../utils/roleTranslations';
import { parseLearningOutcomes } from '../../data/euMcCatalog';
import {
  DocVisibility,
  getProjectSpaceExtras,
  openProjectSpace,
  ProjectPersonRole,
  resolveProjectSpaceId,
  setProjectSpaceExtras,
} from '../../utils/projectSpaceStore';
import EuMcGoldSummary from './EuMcGoldSummary';
import AttestCompetenceModal from '../Modals/AttestCompetenceModal';
import './ProjectAffichePage.css';

type AfficheTab = 'overview' | 'requests' | 'participants' | 'teams' | 'proofs' | 'documents';
type AddPanel = 'person' | 'partner' | 'funder' | 'document' | 'link' | 'team' | null;
type ViewMode = 'cards' | 'list';

const INNER_AFFICHE_TABS: [AfficheTab, string][] = [
  ['overview', 'Vue d’ensemble'],
  ['requests', 'Demandes'],
  ['participants', 'Participants'],
  ['teams', 'Équipes'],
  ['proofs', 'Preuves de compétences'],
  ['documents', 'Documents'],
];

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  coming: { label: 'À VENIR', cls: 'coming' },
  in_progress: { label: 'EN COURS', cls: 'run' },
  ended: { label: 'TERMINÉ', cls: 'ended' },
  archived: { label: 'ARCHIVÉ', cls: 'ended' },
};

const SERIES_COLORS = ['#534AB7', '#0891B2', '#115E59', '#D4960A', '#48A78D', '#3b5bb8'];
const ROLE_ORDER = [
  'eleve_primaire',
  'collegien',
  'lyceen',
  'etudiant',
  'parent',
  'benevole',
  'charge_de_mission',
  'employee',
  'other_personal_user',
];
const ROLE_OPTIONS: { value: ProjectPersonRole; hint: string }[] = [
  { value: 'Participant', hint: '' },
  { value: 'Encadrant', hint: 'formateur, intervenant, animateur… — atteste des compétences' },
  { value: 'Admin', hint: 'voit l’affiche comme un co-responsable' },
];
const VIS_CYCLE: DocVisibility[] = ['team', 'participants', 'public'];
const VIS_LABEL: Record<DocVisibility, string> = {
  team: 'Équipe',
  participants: 'Participants',
  public: 'Public',
};
const DOC_VIS_LABEL: Record<'private' | 'public', string> = {
  private: 'Privé',
  public: 'Public',
};
const VIS_CLASS: Record<DocVisibility, string> = {
  team: 'vteam',
  participants: 'vpart',
  public: 'vpub',
};

function formatFrDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function memberName(member: any): string {
  return (
    member?.user?.full_name ||
    member?.full_name ||
    `${member?.user?.first_name || member?.first_name || ''} ${member?.user?.last_name || member?.last_name || ''}`.trim() ||
    member?.email ||
    'Membre'
  );
}

function memberId(member: any): string {
  return String(member?.user?.id ?? member?.user_id ?? member?.id ?? '');
}

function orgRoleLabel(member: any): string {
  const role = member?.role || member?.organization_role || member?.user?.role || 'membre';
  const map: Record<string, string> = {
    superadmin: 'super admin',
    admin: 'admin',
    referent: 'référent',
    intervenant: 'intervenant',
    member: 'membre',
    eleve_primaire: 'élève',
    collegien: 'collégien',
    lyceen: 'lycéen',
    etudiant: 'étudiant',
  };
  return map[role] || String(role).replace(/_/g, ' ');
}

function memberOrg(member: any, fallback: string): string {
  const org = member?.user?.organization || member?.organization;
  if (typeof org === 'string' && org.trim()) return org;
  if (org?.name) return org.name;
  return fallback;
}

function memberJob(member: any): string {
  return member?.user?.job || member?.job || orgRoleLabel(member);
}

function memberSkills(member: any): string[] {
  const raw = member?.user?.skills || member?.skills || [];
  return (Array.isArray(raw) ? raw : []).map((s: any) => s?.name || s).filter(Boolean);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function daysRemaining(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'aujourd’hui';
  if (days === 1) return 'il y a 1 jour';
  return `il y a ${days} jours`;
}

function seriesColor(series: string): string {
  let hash = 0;
  for (let i = 0; i < series.length; i += 1) hash = (hash * 31 + series.charCodeAt(i)) | 0;
  return SERIES_COLORS[Math.abs(hash) % SERIES_COLORS.length];
}

function partnershipLabel(p: Partnership, currentOrg?: string): string {
  const other = p.partners?.find((x) => x.name !== currentOrg)?.name;
  return p.name || other || p.partners?.[0]?.name || 'Partenaire';
}

function isUnder15(birthday?: string): boolean {
  if (!birthday) return false;
  const birth = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 15);
  return birth > cutoff;
}

function nextVisibility(current: DocVisibility): DocVisibility {
  return VIS_CYCLE[(VIS_CYCLE.indexOf(current) + 1) % VIS_CYCLE.length];
}

const ProjectAffichePage: React.FC = () => {
  const { state, setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const userRef = useRef(state.user);
  userRef.current = state.user;
  const qrRef = useRef<HTMLDivElement>(null);

  const projectId = resolveProjectSpaceId(state.selectedProject?.id);

  useEffect(() => {
    if (window.location.pathname !== '/project-affiche' && window.location.pathname.startsWith('/project-affiche')) {
      navigate('/project-affiche', { replace: true });
    }
  }, [navigate]);

  const [isAttestOpen, setIsAttestOpen] = useState(false);
  const [attestPersonId, setAttestPersonId] = useState<string | null>(null);
  const [tab, setTab] = useState<AfficheTab>('overview');
  const [project, setProject] = useState<Project | null>(null);
  const [apiProject, setApiProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [funders, setFunders] = useState<ProjectFunder[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [orgPeople, setOrgPeople] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [extras, setExtras] = useState(() => getProjectSpaceExtras(projectId));
  const [addPanel, setAddPanel] = useState<AddPanel>(null);
  const [personQuery, setPersonQuery] = useState('');
  const [personRoles, setPersonRoles] = useState<Record<string, ProjectPersonRole>>({});
  const [prepFirst, setPrepFirst] = useState('');
  const [prepLast, setPrepLast] = useState('');
  const [prepBirth, setPrepBirth] = useState('');
  const [prepEmail, setPrepEmail] = useState('');
  const [prepSystemRole, setPrepSystemRole] = useState('');
  const [systemRoles, setSystemRoles] = useState<{ value: string }[]>([]);
  const [showPrepForm, setShowPrepForm] = useState(false);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [funderName, setFunderName] = useState('');
  const [funderEmail, setFunderEmail] = useState('');
  const [funderShare, setFunderShare] = useState<'nominatif' | 'anonyme'>('nominatif');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docVis, setDocVis] = useState<'private' | 'public'>('private');
  const [linkVis, setLinkVis] = useState<DocVisibility>('team');
  const [participantView, setParticipantView] = useState<ViewMode>('cards');
  const [proofView, setProofView] = useState<ViewMode>('cards');
  const [proofSeries, setProofSeries] = useState('');
  const [proofHolder, setProofHolder] = useState('');
  const [teamTitle, setTeamTitle] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamMemberQuery, setTeamMemberQuery] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string; prepared?: boolean } | null>(null);
  const [closeOpen, setCloseOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

  const orgType = getOrganizationType(state.showingPageType);
  const orgId = getSelectedOrganizationId(state.user, state.showingPageType);
  const userId = state.user?.id?.toString();
  const isEnded = project?.status === 'ended' || project?.status === 'archived';

  const persistExtras = (next: typeof extras) => {
    setExtras(next);
    if (projectId) setProjectSpaceExtras(projectId, next);
  };

  const loadProject = useCallback(async (opts?: { silent?: boolean }) => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    setError(null);
    try {
      const response = await getProjectById(Number(projectId));
      const raw = (response as any)?.data?.data || (response as any)?.data || response;
      const mapped = mapApiProjectToFrontendProject(raw, state.showingPageType, userRef.current);
      setApiProject(raw);
      setProject(mapped);
      setExtras(getProjectSpaceExtras(mapped.id));
      const [mem, docs, funderList, teamList, statsRes, badgeRes] = await Promise.all([
        getProjectMembers(Number(projectId)).catch(() => []),
        getProjectDocuments(Number(projectId)).catch(() => ({ data: [] as ProjectDocument[] })),
        getProjectFunders(Number(projectId)).catch(() => [] as ProjectFunder[]),
        getProjectTeams(Number(projectId)).catch(() => [] as Team[]),
        getProjectStats(Number(projectId)).catch(() => null),
        getProjectBadges(Number(projectId), 1, 50).catch(() => ({ data: [] as any[] })),
      ]);
      setMembers(Array.isArray(mem) ? mem : []);
      setDocuments(docs?.data || []);
      setFunders(Array.isArray(funderList) ? funderList : []);
      setTeams(Array.isArray(teamList) ? teamList : []);
      setStats(statsRes);
      setBadges(Array.isArray(badgeRes?.data) ? badgeRes.data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger l’affiche.');
    } finally {
      setLoading(false);
    }
  }, [projectId, state.showingPageType]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    const loadPeople = async () => {
      try {
        if (state.showingPageType === 'teacher') {
          const list = await getTeacherMembers({ per_page: 500 });
          setOrgPeople(Array.isArray(list) ? list : []);
          return;
        }
        if (orgId && orgType) {
          const list = await getOrganizationMembers(orgId, orgType);
          setOrgPeople(Array.isArray(list) ? list : []);
        }
      } catch {
        setOrgPeople([]);
      }
    };
    void loadPeople();
  }, [orgId, orgType, state.showingPageType]);

  useEffect(() => {
    const loadPartners = async () => {
      if (!orgId || !orgType) return;
      try {
        const { data } = await fetchAllConfirmedPartnerships(orgId, orgType);
        setPartnerships(data || []);
      } catch {
        setPartnerships([]);
      }
    };
    void loadPartners();
  }, [orgId, orgType]);

  useEffect(() => {
    const loadGroups = async () => {
      if (orgType !== 'company' || !orgId) {
        setGroups([]);
        return;
      }
      try {
        const res = await getCompanyGroups(orgId);
        const list = res.data?.data || res.data || [];
        setGroups(Array.isArray(list) ? list : []);
      } catch {
        setGroups([]);
      }
    };
    void loadGroups();
  }, [orgId, orgType]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const rolesRes = await getPersonalUserRoles();
        const rolesData = rolesRes?.data?.data ?? rolesRes?.data ?? rolesRes ?? [];
        if (!Array.isArray(rolesData)) return;
        const filtered = rolesData.filter((r: { value: string }) => r.value !== 'other');
        const sorted = filtered.sort((a: { value: string }, b: { value: string }) => {
          const indexA = ROLE_ORDER.indexOf(a.value);
          const indexB = ROLE_ORDER.indexOf(b.value);
          return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        setSystemRoles(sorted);
      } catch {
        setSystemRoles([]);
      }
    };
    void loadRoles();
  }, []);

  const isOwner = isUserProjectOwner(apiProject, userId);
  const isCoOwner = isUserProjectCoOwner(apiProject, userId);
  const currentMember = members.find((m) => resolveProjectMemberUserId(m) === userId);
  const isEncadrant = Boolean(currentMember?.can_assign_badges_in_project) && !isOwner && !isCoOwner;
  const isParticipant = isUserProjectParticipant(apiProject, userId);
  const isSuperadminReadOnly = isUserSuperadminOfProjectOrg(apiProject, state.user) && !isOwner && !isCoOwner && !isParticipant;
  const isVisitor = !isOwner && !isCoOwner && !isParticipant && !isSuperadminReadOnly && !isEncadrant;
  const canGovern = isOwner && !isEnded && !isSuperadminReadOnly;
  const canAttest = (isOwner || isCoOwner || isEncadrant) && !isEnded && !isSuperadminReadOnly;
  const canAddParticipants = (isOwner || isCoOwner) && !isEnded && !isSuperadminReadOnly;
  const canManageTeams = (isOwner || isCoOwner) && !isEnded && !isSuperadminReadOnly;
  const canSeeInner = !isVisitor;
  const canSeeFunders = !isVisitor;
  const showCloseBanner = canGovern && shouldShowEndDateWarningBanner(project?.status, project?.showEndDateWarning);

  useEffect(() => {
    if (!apiProject) return;
    setTeamOpen(!isVisitor);
  }, [apiProject, isVisitor]);

  useEffect(() => {
    if (!isVisitor) return;
    if (documents.some((d) => d.visibility === 'public')) {
      setTab('documents');
    }
  }, [isVisitor, documents]);

  const rolePill = isOwner
    ? 'Responsable du projet'
    : isCoOwner
      ? 'Co-responsable'
      : isEncadrant
        ? 'Encadrant'
        : currentMember?.role === 'admin'
          ? 'Admin'
          : isParticipant
            ? 'Participant'
            : '';

  const confirmedMembers = members.filter((m) => m.status !== 'pending');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const partners = project?.partners || (project?.partner ? [project.partner] : []);
  const links = Array.isArray(apiProject?.links) ? apiProject.links : [];
  const photos = [project?.image, ...(project?.additionalPhotos || [])].filter(Boolean) as string[];
  const preparedPeople = extras.preparedPeople || [];
  const orgSubtitle =
    state.showingPageType === 'pro' ? 'Entreprise' : state.showingPageType === 'teacher' ? 'Enseignant' : 'Établissement';
  const remaining = daysRemaining(project?.endDate);
  const proofCount = stats?.overview.total_badges_assigned ?? project?.badges ?? badges.length;
  const participantCount = stats?.overview.confirmed_members ?? confirmedMembers.length;
  const desc = project?.description || '';
  const descShort = desc.length > 160 && !descOpen ? `${desc.slice(0, 160).trim()}…` : desc;
  const isPrivate = project?.visibility !== 'public';
  const visibleSystemRoles = useMemo(() => {
    const allowPrimary = orgType === 'school' || isUnder15(prepBirth);
    return systemRoles.filter((r) => r.value !== 'eleve_primaire' || allowPrimary);
  }, [systemRoles, orgType, prepBirth]);
  const ownerId = resolveProjectMemberUserId(apiProject?.owner) || String(apiProject?.owner_id || '');
  const coOwnerIds = new Set(
    [...(apiProject?.co_owners || []), ...(apiProject?.co_responsibles || [])]
      .map((c: any) => resolveProjectMemberUserId(c))
      .filter(Boolean) as string[]
  );

  const memberRole = (member: any): 'owner' | 'co_owner' | 'admin' | 'encadrant' | 'member' => {
    const id = resolveProjectMemberUserId(member);
    if (id && id === ownerId) return 'owner';
    if (id && coOwnerIds.has(id)) return 'co_owner';
    if (member.role === 'co_owner' || member.is_co_owner) return 'co_owner';
    if (member.role === 'admin') return 'admin';
    if (member.can_assign_badges_in_project) return 'encadrant';
    return 'member';
  };

  const roleLabel = (role: ReturnType<typeof memberRole>) => {
    if (role === 'owner') return 'Responsable du projet';
    if (role === 'co_owner') return 'Co-responsable';
    if (role === 'admin') return 'Admin';
    if (role === 'encadrant') return 'Encadrant';
    return 'Participant';
  };

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    const already = new Set(members.map(memberId));
    return orgPeople
      .filter((p) => {
        const id = memberId(p);
        if (!id || already.has(id)) return false;
        if (!q) return false;
        return memberName(p).toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [orgPeople, personQuery, members]);

  const filteredPartnerships = useMemo(() => {
    const q = partnerQuery.trim().toLowerCase();
    const ranked = partnerships.slice().sort((a, b) => String(b.confirmed_at || b.updated_at).localeCompare(String(a.confirmed_at || a.updated_at)));
    if (!q) return ranked.slice(0, 5);
    return ranked.filter((p) => partnershipLabel(p, project?.organization).toLowerCase().includes(q)).slice(0, 8);
  }, [partnerships, partnerQuery, project?.organization]);

  const seriesOptions = useMemo(() => {
    const set = new Set<string>();
    badges.forEach((b) => {
      const series = b.badge?.series || b.series;
      if (series) set.add(String(series));
    });
    return Array.from(set);
  }, [badges]);

  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      const series = String(b.badge?.series || b.series || '');
      const holder = String(b.receiver?.full_name || b.receiver_name || '');
      if (proofSeries && series !== proofSeries) return false;
      if (proofHolder.trim() && !holder.toLowerCase().includes(proofHolder.trim().toLowerCase())) return false;
      return true;
    });
  }, [badges, proofSeries, proofHolder]);

  const goBack = () => {
    setCurrentPage('projects');
    navigate('/projects');
  };

  const openSpace = () => {
    if (!projectId) return;
    openProjectSpace(projectId, 'informations');
    setCurrentPage('project-space');
    navigate('/project-space');
  };

  const attest = (personId?: string | null) => {
    if (!project) return;
    setAttestPersonId(personId || null);
    setIsAttestOpen(true);
  };

  useEffect(() => {
    if (searchParams.get('open') !== 'attest' || !project) return;
    setAttestPersonId(null);
    setIsAttestOpen(true);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    }, { replace: true });
  }, [searchParams, project, setSearchParams]);

  const patchProject = async (fields: Parameters<typeof updateProject>[1]['project'], success?: string) => {
    if (!projectId) return;
    try {
      await updateProject(Number(projectId), { project: fields });
      if (success) showSuccess(success);
      await loadProject({ silent: true });
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Enregistrement impossible.');
    }
  };

  const setProjectVisibility = async (makePrivate: boolean) => {
    if (!projectId || !project || isEnded) return;
    const alreadyPrivate = project.visibility !== 'public';
    if (alreadyPrivate === makePrivate) return;

    setProject((current) =>
      current ? { ...current, visibility: makePrivate ? 'private' : 'public' } : current
    );
    setApiProject((current: any) => (current ? { ...current, private: makePrivate } : current));
    try {
      const updated = await updateProject(Number(projectId), { project: { private: makePrivate } });
      const raw = (updated as any)?.data || updated;
      const persisted = typeof raw?.private === 'boolean' ? raw.private : makePrivate;
      setApiProject((current: any) => {
        const base = raw?.id ? raw : current;
        return base ? { ...base, private: persisted } : base;
      });
      setProject((current) =>
        current ? { ...current, visibility: persisted ? 'private' : 'public' } : current
      );
      showSuccess(
        persisted
          ? 'Projet privé — visible par votre structure seulement.'
          : 'Projet public — visible par tout Kinship.'
      );
    } catch (e: any) {
      setProject((current) =>
        current ? { ...current, visibility: alreadyPrivate ? 'private' : 'public' } : current
      );
      setApiProject((current: any) => (current ? { ...current, private: alreadyPrivate } : current));
      showError(e?.response?.data?.message || 'Impossible de changer la visibilité.');
    }
  };

  const addPerson = async (person: any, role: ProjectPersonRole) => {
    const uid = Number(memberId(person));
    if (!uid || !projectId) return;
    try {
      await addProjectMember(Number(projectId), uid);
      if (role === 'Admin') {
        await updateProjectMember(Number(projectId), uid, { role: 'admin' });
      } else if (role === 'Encadrant') {
        await updateProjectMember(Number(projectId), uid, { can_assign_badges_in_project: true });
      }
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
      setPersonQuery('');
      setAddedFlash(`${memberName(person)} ajouté — ${role}, automatiquement.`);
      showSuccess(`${memberName(person)} ajouté.`);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible d’ajouter cette personne.');
    }
  };

  const addGroup = async (group: CompanyGroup) => {
    if (!orgId || !projectId) return;
    try {
      const detail = await getCompanyGroup(orgId, group.id);
      const full: CompanyGroup = detail.data?.data || detail.data || group;
      const people = full.members || [];
      for (const person of people) {
        const uid = Number(person.id);
        if (!uid || members.some((m) => memberId(m) === String(uid))) continue;
        await addProjectMember(Number(projectId), uid);
      }
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
      showSuccess(`${group.name} ajouté — participant par défaut.`);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible d’ajouter ce groupe.');
    }
  };

  const submitPrepared = async () => {
    if (!prepFirst.trim() || !prepLast.trim() || !prepBirth || !prepSystemRole) {
      showError('Prénom, nom, date de naissance et rôle sont requis.');
      return;
    }
    if (!projectId) return;
    try {
      await preRegisterProjectParticipant(Number(projectId), {
        first_name: prepFirst.trim(),
        last_name: prepLast.trim(),
        birthday: prepBirth,
        email: prepEmail.trim() || undefined,
        user_role: prepSystemRole,
        organization_id: orgId || undefined,
        organization_type: orgType,
      });
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
      const name = `${prepFirst.trim()} ${prepLast.trim()}`;
      setAddedFlash(`${name} ajouté — Participant, automatiquement.`);
      setPrepFirst('');
      setPrepLast('');
      setPrepBirth('');
      setPrepEmail('');
      setPrepSystemRole('');
      setShowPrepForm(false);
      showSuccess('Pré-inscrit · en attente d’activation.');
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.details?.[0] || 'Impossible d’enregistrer la pré-inscription.');
    }
  };

  const addPartner = async (partnership: Partnership) => {
    if (!projectId) return;
    const existing = (apiProject?.partnership_ids || []).map((id: number) => Number(id));
    const next = Array.from(new Set([...existing, Number(partnership.id)]));
    await patchProject({ partnership_ids: next }, 'Partenaire ajouté.');
    setAddPanel(null);
    setPartnerQuery('');
  };

  const addFunder = async () => {
    const email = funderEmail.trim();
    const name = funderName.trim() || email;
    if (!email) {
      showError('Indiquez l’email du financeur — c’est lui qui recevra le lien de suivi.');
      return;
    }
    if (!projectId) return;
    try {
      const added = await addProjectFunder(Number(projectId), { name, email, share_mode: funderShare });
      setFunders((current) => [added, ...current.filter((f) => f.id !== added.id)]);
      setFunderName('');
      setFunderEmail('');
      setAddPanel(null);
      showSuccess('Financeur ajouté.');
    } catch (e: any) {
      showError(e?.response?.data?.details?.[0] || e?.response?.data?.message || 'Impossible d’ajouter ce financeur.');
    }
  };

  const changeMemberRole = async (member: any, role: ProjectPersonRole) => {
    const uid = Number(memberId(member));
    if (!uid || !projectId) return;
    try {
      if (role === 'Admin') {
        await updateProjectMember(Number(projectId), uid, { role: 'admin', can_assign_badges_in_project: false });
      } else if (role === 'Encadrant') {
        await updateProjectMember(Number(projectId), uid, { role: 'member', can_assign_badges_in_project: true });
      } else {
        await updateProjectMember(Number(projectId), uid, { role: 'member', can_assign_badges_in_project: false });
      }
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de changer le rôle.');
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    if (removeTarget.prepared) {
      persistExtras({
        ...extras,
        preparedPeople: preparedPeople.filter((p) => p.id !== removeTarget.id),
      });
      setRemoveTarget(null);
      return;
    }
    if (!projectId) return;
    try {
      await removeProjectMember(Number(projectId), Number(removeTarget.id));
      setMembers((current) => current.filter((m) => memberId(m) !== removeTarget.id));
      setRemoveTarget(null);
      showSuccess('Participant retiré.');
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de retirer cette personne.');
    }
  };

  const acceptRequest = async (member: any) => {
    const uid = Number(memberId(member));
    if (!uid || !projectId) return;
    try {
      await updateProjectMember(Number(projectId), uid, { status: 'confirmed', role: 'member' });
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
      showSuccess(`${memberName(member)} accepté — Participant.`);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible d’accepter cette demande.');
    }
  };

  const refuseRequest = async (member: any) => {
    const uid = Number(memberId(member));
    if (!uid || !projectId) return;
    try {
      await removeProjectMember(Number(projectId), uid);
      setMembers((current) => current.filter((m) => memberId(m) !== String(uid)));
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de refuser cette demande.');
    }
  };

  const confirmClose = async () => {
    if (!projectId) return;
    try {
      await closeProject(Number(projectId));
      setCloseOpen(false);
      showSuccess('Projet clôturé.');
      await loadProject();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de clôturer le projet.');
    }
  };

  const openShare = async () => {
    if (!projectId) return;
    try {
      const res = await getOrCreateProjectShareLink(Number(projectId));
      const token = (res as any)?.token || (res as any)?.data?.token;
      const origin = process.env.REACT_APP_FRONTEND_URL || window.location.origin;
      setShareUrl(token ? `${origin}/shared/${token}` : '');
      setShareOpen(true);
    } catch {
      showError('Impossible de générer le lien de partage.');
    }
  };

  useEffect(() => {
    if (!shareOpen || !shareUrl || !qrRef.current) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.async = true;
    script.onload = () => {
      if (qrRef.current && (window as any).QRCode) {
        qrRef.current.innerHTML = '';
        new (window as any).QRCode(qrRef.current, {
          text: shareUrl,
          width: 74,
          height: 74,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: (window as any).QRCode.CorrectLevel.H,
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, [shareOpen, shareUrl]);

  const addDocument = async () => {
    if (!docFile || !projectId) return;
    if (documents.length >= 5) {
      showError('5 fichiers maximum.');
      return;
    }
    if (docFile.size > 1024 * 1024) {
      showError('1 Mo maximum par fichier.');
      return;
    }
    try {
      const res = await addProjectDocuments(Number(projectId), [docFile], docVis);
      setDocuments(res.data || []);
      setDocFile(null);
      setDocVis('private');
      setAddPanel(null);
    } catch {
      showError('Impossible d’ajouter le document.');
    }
  };

  const setDocumentVisibility = async (id: number, visibility: 'public' | 'private') => {
    if (!projectId) return;
    const previous = documents;
    setDocuments((current) => current.map((d) => (d.id === id ? { ...d, visibility } : d)));
    try {
      const res = await updateProjectDocumentVisibility(Number(projectId), id, visibility);
      setDocuments(res.data || []);
    } catch {
      setDocuments(previous);
      showError('Impossible de changer la visibilité du document.');
    }
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    const existing = Array.isArray(apiProject?.links) ? apiProject.links : [];
    await patchProject({
      links_attributes: [
        ...existing.map((l: any) => ({ id: l.id, name: l.name, url: l.url })),
        { name: linkLabel.trim() || 'Lien du projet', url: linkUrl.trim() },
      ],
    });
    persistExtras({
      ...extras,
      linkVisibility: { ...(extras.linkVisibility || {}), [linkUrl.trim()]: linkVis },
    });
    setLinkLabel('');
    setLinkUrl('');
    setLinkVis('team');
    setAddPanel(null);
  };

  const removeDoc = async (id: number) => {
    if (!projectId) return;
    try {
      const res = await deleteProjectDocument(Number(projectId), id);
      setDocuments(res.data || []);
    } catch {
      showError('Impossible de supprimer ce document.');
    }
  };

  const removeLink = async (link: any) => {
    const existing = Array.isArray(apiProject?.links) ? apiProject.links : [];
    await patchProject({
      links_attributes: existing
        .filter((l: any) => l.id !== link.id)
        .map((l: any) => ({ id: l.id, name: l.name, url: l.url })),
    });
  };

  const addPhoto = async (file: File) => {
    if (photos.length >= 2) return;
    if (!projectId) return;
    try {
      if (!project?.image) {
        await updateProject(Number(projectId), { project: {} }, file);
      } else {
        await updateProject(Number(projectId), { project: {} }, null, [file]);
      }
      await loadProject();
    } catch {
      showError('Impossible d’ajouter la photo.');
    }
  };

  const createTeam = async () => {
    if (!teamTitle.trim() || !teamLeaderId || teamMemberIds.length === 0 || !projectId) {
      showError('Nom, chef d’équipe et au moins un membre sont requis.');
      return;
    }
    try {
      await createProjectTeam(Number(projectId), {
        title: teamTitle.trim(),
        description: teamDesc.trim(),
        team_leader_id: Number(teamLeaderId),
        team_member_ids: teamMemberIds.map(Number),
      });
      const list = await getProjectTeams(Number(projectId));
      setTeams(Array.isArray(list) ? list : []);
      setTeamTitle('');
      setTeamDesc('');
      setTeamLeaderId('');
      setTeamMemberIds([]);
      setAddPanel(null);
      showSuccess('Équipe créée.');
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de créer l’équipe.');
    }
  };

  const join = async () => {
    if (!projectId) return;
    try {
      await joinProject(Number(projectId));
      showSuccess('Demande envoyée — le responsable du projet l’acceptera.');
      await loadProject();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible de rejoindre ce projet.');
    }
  };

  const docIsPublic = (doc: ProjectDocument) => doc.visibility === 'public';
  const linkVisOf = (link: any): DocVisibility => extras.linkVisibility?.[String(link.url || link.id)] || 'team';
  const visibleDocs = isVisitor ? documents.filter(docIsPublic) : documents;
  const visibleLinks = isVisitor ? links.filter((l: any) => linkVisOf(l) === 'public') : links;
  const hasPublicDocuments = documents.some(docIsPublic);
  const showTabs = canSeeInner || (isVisitor && hasPublicDocuments);
  const afficheTabs = canSeeInner ? INNER_AFFICHE_TABS : ([['documents', 'Documents']] as [AfficheTab, string][]);

  const openProof = (badge: any) => {
    const token = String(badge.share_token || '').trim();
    if (token) navigate(`/pb/${token}`);
  };

  if (loading) {
    return <div className="project-affiche-page"><div className="pa-loading">Chargement de l’affiche…</div></div>;
  }

  if (!project) {
    return (
      <div className="project-affiche-page">
        <div className="pa-empty">
          <p>Aucun projet à afficher.</p>
          <button type="button" className="pa-bt-ghost" onClick={goBack}>Retour aux projets</button>
        </div>
      </div>
    );
  }

  const status = STATUS_CHIP[project.status] || { label: project.status, cls: 'ended' };
  const canChangeRole = (role: ReturnType<typeof memberRole>) =>
    canAddParticipants && role !== 'owner' && role !== 'co_owner';
  const canRemoveMember = (role: ReturnType<typeof memberRole>) =>
    (isOwner || isCoOwner) && !isEnded && !isSuperadminReadOnly && role !== 'owner';

  const renderParticipantCard = (member: any, prepared?: { id: string; name: string; role: string; org: string; initials: string }) => {
    if (prepared) {
      return (
        <div key={prepared.id} className="pa-vcard is-prep">
          <div className="avz">{prepared.initials}</div>
          <div className="nm">{prepared.name}</div>
          <div className="rs">{prepared.role}</div>
          <div className="org">{prepared.org}</div>
          <div className="rlab">Rôle dans le projet</div>
          <span className="pa-seldd">Participant ▾</span>
          {canRemoveMember('member') && (
            <div className="actions">
              <button type="button" className="pa-bt-red" onClick={() => setRemoveTarget({ id: prepared.id, name: prepared.name, prepared: true })}>
                Retirer
              </button>
            </div>
          )}
        </div>
      );
    }
    const id = memberId(member);
    const name = memberName(member);
    const role = memberRole(member);
    const skills = memberSkills(member);
    const pendingActivation = Boolean(member?.user?.has_temporary_email);
    return (
      <div key={id} className={`pa-vcard ${pendingActivation ? 'is-prep' : ''}`}>
        <div className="avz">{initialsOf(name)}</div>
        <div className="nm">{name}</div>
        <div className="rs">{translateRole(member?.user?.role || member?.role) || memberJob(member)}</div>
        <div className="org">
          {pendingActivation ? 'pré-inscrit · en attente d’activation' : memberOrg(member, project.organization)}
        </div>
        {skills.length > 0 && (
          <div className="pa-ckz">
            <span className="pa-ck">{skills[0]}</span>
            {skills.length > 1 && <span className="pa-ckmore">+{skills.length - 1}</span>}
          </div>
        )}
        <div className="rlab">Rôle dans le projet</div>
        {canChangeRole(role) ? (
          <select
            className="pa-seldd"
            value={role === 'encadrant' ? 'Encadrant' : role === 'admin' ? 'Admin' : 'Participant'}
            onChange={(e) => void changeMemberRole(member, e.target.value as ProjectPersonRole)}
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.value}</option>
            ))}
          </select>
        ) : (
          <span className="pa-seldd locked">{roleLabel(role)}</span>
        )}
        <div className="actions">
          {canRemoveMember(role) && (
            <button type="button" className="pa-bt-red" onClick={() => setRemoveTarget({ id, name })}>Retirer</button>
          )}
          {canAttest && (
            <button type="button" className="pa-bt-green" onClick={() => attest(id)}>🏅 Attester</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="project-affiche-page">
      <div className="pa-screen">
        <div className="pa-inner">
          <div className="pa-pagehead">
            <button type="button" className="pa-back" onClick={goBack} aria-label="Retour">←</button>
            <div className="pa-pt">Le projet</div>
            <div className="pa-sp">
              {canGovern && project.status === 'in_progress' && (
                <button type="button" className="pa-bt-ghost" onClick={() => setCloseOpen(true)}>✓ Clôturer le projet</button>
              )}
              {canAttest && (
                <button type="button" className="pa-bt-main" onClick={() => attest()}>🏅 Attester une compétence</button>
              )}
              {isVisitor && !isEnded && (
                <button type="button" className="pa-join" onClick={() => void join()}>+ Rejoindre</button>
              )}
              {isVisitor && (
                <button type="button" className="pa-ic" onClick={() => void openShare()} aria-label="Partager">🔗</button>
              )}
            </div>
          </div>

          {isSuperadminReadOnly && (
            <div className="pa-readonly">Lecture seule — vous voyez l’affiche, sans action.</div>
          )}
          {error && <div className="pa-error">{error}</div>}

          <div className="pa-hero">
            <div className="pa-cover" style={project.image ? { backgroundImage: `url(${project.image})` } : undefined}>
              {!project.image && <span className="ph">couverture — 2 photos max</span>}
            </div>
            <div className="pa-hbody">
              <div className="pa-staterow">
                <span className={`pa-chip ${status.cls}`}>{status.label}</span>
                <span className={`pa-chip vis ${isPrivate ? 'priv' : 'pub'}`}>{isPrivate ? 'Privé' : 'Public'}</span>
                <span className="pa-chip date">{formatFrDate(project.startDate)} → {formatFrDate(project.endDate)}</span>
                {rolePill && <span className="pa-role">{rolePill}</span>}
                {canGovern && (
                  <button type="button" className="pa-ic" onClick={openSpace} aria-label="Espace de gestion">✎</button>
                )}
                {!isVisitor && (
                  <button type="button" className="pa-ic" onClick={() => void openShare()} aria-label="Partager">🔗</button>
                )}
              </div>
              <h1 className="pa-htitle">{project.title}</h1>
              <div className="pa-orgline">
                {project.organization} · {orgSubtitle}
                <span className="pa-pill-conf">✓ Vérifié</span>
              </div>
              {desc && <div className="pa-desc">{descShort}</div>}
              {desc.length > 160 && (
                <button type="button" className="pa-voirplus" onClick={() => setDescOpen((v) => !v)}>
                  {descOpen ? 'Voir moins ∧' : 'Voir plus ∨'}
                </button>
              )}
              <div className="pa-metarow">
                <span>👥 {participantCount} participants</span>
                <span>🏅 {proofCount} preuves de compétences</span>
              </div>
              {(project.pathways || []).length > 0 && (
                <>
                  <div className="pa-klabel">Parcours</div>
                  {(project.pathways || []).map((p) => (
                    <span key={p} className="pa-tagchip">{p.toUpperCase()}</span>
                  ))}
                </>
              )}
              {canGovern && (
                <div className="pa-cmdrow">
                  <div className="pa-tog" aria-label="Visibilité du projet">
                    <button
                      type="button"
                      className={isPrivate ? 'on' : ''}
                      aria-pressed={isPrivate}
                      onClick={() => void setProjectVisibility(true)}
                    >
                      Privé — ma structure
                    </button>
                    <button
                      type="button"
                      className={!isPrivate ? 'on' : ''}
                      aria-pressed={!isPrivate}
                      onClick={() => void setProjectVisibility(false)}
                    >
                      Public — tout Kinship
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pa-equipe">
            <h4>
              👥 Équipe &amp; partenaires
              <button type="button" className="m" onClick={() => setTeamOpen((v) => !v)}>
                {teamOpen ? 'Masquer ∧' : 'Afficher ∨'}
              </button>
            </h4>
            {teamOpen && (
              <>
                <div className="pa-elabel">Responsable du projet</div>
                {project.responsible ? (
                  <div className="pa-erow">
                    <div className="pa-av">{initialsOf(project.responsible.name)}</div>
                    <div>
                      {project.responsible.name}
                      <small>{[project.responsible.profession, project.responsible.role].filter(Boolean).join(' · ')}</small>
                    </div>
                    <div className="mail">
                      {project.responsible.organization}
                      {project.responsible.email ? <><br />{project.responsible.email}</> : null}
                    </div>
                  </div>
                ) : (
                  <div className="pa-graygl">Non renseigné</div>
                )}

                <div className="pa-elabel">Co-responsables ⓘ</div>
                {(project.coResponsibles || []).length === 0 && (
                  <div className="pa-graygl">Aucun co-responsable pour l’instant.</div>
                )}
                {(project.coResponsibles || []).map((co) => (
                  <div key={co.id} className="pa-erow">
                    <div className="pa-av">{initialsOf(co.name)}</div>
                    <div>
                      {co.name}
                      <small>{[co.profession, co.role].filter(Boolean).join(' · ')}</small>
                    </div>
                    <div className="mail">
                      {co.organization}
                      {co.email ? <><br />{co.email}</> : null}
                    </div>
                  </div>
                ))}
                {(project.coResponsibles || []).length > 0 && (
                  <div className="pa-graygl">Il ajoute des membres de son organisation uniquement et atteste des compétences.</div>
                )}

                <div className="pa-elabel">
                  Partenaire ⓘ
                  {canGovern && (
                    <button type="button" onClick={() => setAddPanel(addPanel === 'partner' ? null : 'partner')}>
                      + Ajouter un partenaire
                    </button>
                  )}
                </div>
                {partners.length === 0 && <div className="pa-graygl">Aucun partenaire.</div>}
                {partners.map((p) => (
                  <div key={p.id} className="pa-erow">
                    <div className="pa-logo">{initialsOf(p.name || p.organization)}</div>
                    <div>
                      {p.name || p.organization}
                      <small>partenariat administratif</small>
                    </div>
                  </div>
                ))}
                {addPanel === 'partner' && canGovern && (
                  <div className="pa-panel">
                    <h5>Ajouter un partenaire</h5>
                    <button type="button" className="pa-radio on">
                      <span className="dot"><i /></span>
                      <div><b>Partenariat administratif</b> — il co-porte : son co-responsable rejoint l’équipe</div>
                    </button>
                    <button type="button" className="pa-radio off" disabled>
                      <span className="dot" />
                      <div>Partenariat élargi — bientôt</div>
                    </button>
                    <div className="pa-klabel">l’organisation — vos 5 dernières, puis la recherche dès la première lettre</div>
                    <input
                      className="pa-search"
                      value={partnerQuery}
                      onChange={(e) => setPartnerQuery(e.target.value)}
                      placeholder="🔍 Ou rechercher une organisation…"
                    />
                    {filteredPartnerships.map((p) => (
                      <div key={p.id} className="pa-rline">
                        <div className="pa-logo">{initialsOf(partnershipLabel(p, project.organization))}</div>
                        <div>{partnershipLabel(p, project.organization)}</div>
                        <button type="button" className="pa-addb" onClick={() => void addPartner(p)}>Ajouter</button>
                      </div>
                    ))}
                    {filteredPartnerships.length === 0 && (
                      <div className="pa-empty-state">Aucune organisation correspondante.</div>
                    )}
                    <div className="pa-pfoot">Après l’ajout, le panneau se replie — l’acte est unitaire. Un financeur n’est pas un partenaire.</div>
                  </div>
                )}

                {canSeeFunders && (
                  <>
                    <div className="pa-elabel">
                      Financeurs ({funders.length}) ⓘ
                      {canGovern && (
                        <button type="button" onClick={() => setAddPanel(addPanel === 'funder' ? null : 'funder')}>
                          + Ajouter un financeur
                        </button>
                      )}
                    </div>
                    {funders.length === 0 && !canGovern && <div className="pa-finrow">Aucun financeur rattaché.</div>}
                    {funders.length === 0 && canGovern && addPanel !== 'funder' && (
                      <div className="pa-finrow">Aucun financeur — visible par l’équipe et les partenaires, jamais par les visiteurs.</div>
                    )}
                    {funders.map((f) => (
                      <div key={f.id} className="pa-erow">
                        <div className="pa-logo">{f.initials || initialsOf(f.name)}</div>
                        <div>
                          {f.name}
                          <small>financeur · {f.share_mode === 'anonyme' ? 'vue anonymisée' : 'vue nominative'}</small>
                        </div>
                      </div>
                    ))}
                    <div className="pa-graygl">Visible par l’équipe et les partenaires — jamais par les visiteurs. Un financeur n’est pas un partenaire.</div>
                    {addPanel === 'funder' && canGovern && (
                      <div className="pa-panel">
                        <h5>Ajouter un financeur</h5>
                        <div className="pa-field">
                          <label>Organisation</label>
                          <input className="pa-fin" value={funderName} onChange={(e) => setFunderName(e.target.value)} placeholder="Nom du financeur" />
                        </div>
                        <div className="pa-field">
                          <label>Email <em>✱</em></label>
                          <input className="pa-fin" value={funderEmail} onChange={(e) => setFunderEmail(e.target.value)} placeholder="il recevra le lien de suivi" />
                        </div>
                        <div className="pa-klabel">mode de suivi</div>
                        <button type="button" className={`pa-radio ${funderShare === 'nominatif' ? 'on' : ''}`} onClick={() => setFunderShare('nominatif')}>
                          <span className="dot">{funderShare === 'nominatif' ? <i /> : null}</span>
                          <div>Nominatif</div>
                        </button>
                        <button type="button" className={`pa-radio ${funderShare === 'anonyme' ? 'on' : ''}`} onClick={() => setFunderShare('anonyme')}>
                          <span className="dot">{funderShare === 'anonyme' ? <i /> : null}</span>
                          <div>Anonyme</div>
                        </button>
                        <div className="pa-actions-end">
                          <button type="button" className="pa-bt-ghost" onClick={() => setAddPanel(null)}>Annuler</button>
                          <button type="button" className="pa-addb" onClick={() => void addFunder()}>Ajouter</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {showCloseBanner && (
            <div className="pa-variant">
              <div>
                <span className="pa-vlabel">date de fin dépassée</span>
                <br />
                <b>La date de fin est passée.</b> Votre projet est-il terminé ? La clôture permet de générer sa Preuve Projet — authentique et vérifiable.
              </div>
              <button type="button" className="vb" onClick={() => setCloseOpen(true)}>Clôturer le projet</button>
            </div>
          )}

          {isVisitor && (
            <div className="pa-vismicro">
              <b>Qui voit, qui rejoint.</b> {isPrivate ? 'Privé → votre structure seulement.' : 'Public → tout Kinship voit l’affiche et peut demander à rejoindre (un compte est nécessaire).'} Le lien de partage et son QR code mènent à cette affiche. Ce que le visiteur voit : le responsable, les co-responsables, les partenaires — et les documents publics.
            </div>
          )}

          {showTabs && (
            <>
              <div className="pt-2 pa-tabs">
                {afficheTabs.map(([id, label]) => (
                  <button key={id} type="button" className={`pa-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>

              {canSeeInner && tab === 'overview' && (
                <>
                  <div className="pa-kpis">
                    <div className="pa-kpi">
                      <div className="n">{remaining == null ? '—' : Math.max(0, remaining)}</div>
                      <div className="l">Jours restants</div>
                      <span className={`t ${remaining != null && remaining < 0 ? 'warn' : ''}`}>
                        {remaining != null && remaining < 0 ? 'Fin dépassée' : 'Dans les délais'}
                      </span>
                    </div>
                    <div className="pa-kpi">
                      <div className="n">{participantCount}</div>
                      <div className="l">Participants</div>
                      <span className="t">{stats?.badges.this_month ? `+${stats.overview.pending_members || 0} en attente` : 'Cohorte'}</span>
                    </div>
                    <div className="pa-kpi">
                      <div className="n">{proofCount}</div>
                      <div className="l">Preuves de compétences</div>
                      <span className="t">{stats?.badges.this_month ? `+${stats.badges.this_month} ce mois` : 'Attestées'}</span>
                    </div>
                  </div>
                  <div className="pa-sec">
                    <h4>Description</h4>
                    <div className="pa-desc">{desc || 'Aucune description.'}</div>
                  </div>
                  {project?.isEuMcDeclared && (
                    <div className="pa-sec">
                      <h4>Cadre européen</h4>
                      <EuMcGoldSummary
                        outcomes={parseLearningOutcomes(project.learningOutcomes)}
                        participationMode={project.participationMode}
                        workloadHours={project.workloadHours}
                        workloadEcts={project.workloadEcts}
                        eqfLevel={project.eqfLevel}
                        eqfFramework={project.eqfFramework}
                        assessmentType={project.assessmentType}
                        teachingLanguages={project.teachingLanguages}
                      />
                    </div>
                  )}
                </>
              )}

              {canSeeInner && tab === 'requests' && (
                <div className="pa-sec">
                  <h4>Demandes de participation ({pendingMembers.length})</h4>
                  {!canGovern && (
                    <p className="pa-hint">Seul le responsable du projet accepte — consultation seulement.</p>
                  )}
                  {pendingMembers.length === 0 && (
                    <div className="pa-empty-state">📥 Aucune demande en attente — toutes les demandes ont été traitées.</div>
                  )}
                  {pendingMembers.map((m) => (
                    <div key={memberId(m)} className="pa-dreq">
                      <div className="pa-av">{initialsOf(memberName(m))}</div>
                      <div>
                        {memberName(m)}
                        <small>via le lien de partage · {timeAgo(m.created_at)}</small>
                      </div>
                      {canGovern && (
                        <div className="sp">
                          <button type="button" className="pa-bt-ghost" onClick={() => void refuseRequest(m)}>Refuser</button>
                          <button type="button" className="pa-addb" onClick={() => void acceptRequest(m)}>Accepter</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {canSeeInner && tab === 'participants' && (
                <div className="pa-sec">
                  <h4>
                    Participants du projet ({confirmedMembers.length + preparedPeople.length})
                    {canAddParticipants && (
                      <button type="button" className="add" onClick={() => setAddPanel(addPanel === 'person' ? null : 'person')}>
                        + Ajouter un participant
                      </button>
                    )}
                  </h4>
                  {isCoOwner && !isOwner && (
                    <p className="pa-hint">Elle voit tous les participants — seul l’ajout est cloisonné à son organisation.</p>
                  )}
                  <div className="pa-vswitch">
                    <button type="button" className={`pa-vsw ${participantView === 'cards' ? 'on' : ''}`} onClick={() => setParticipantView('cards')}>▦ Cartes</button>
                    <button type="button" className={`pa-vsw ${participantView === 'list' ? 'on' : ''}`} onClick={() => setParticipantView('list')}>☰ Liste</button>
                  </div>
                  {addPanel === 'person' && canAddParticipants && (
                    <div className="pa-panel">
                      <h5>Ajouter un participant</h5>
                      <div className="pa-klabel">🔍 Rechercher dans votre structure{isCoOwner && !isOwner ? ` — ${state.user?.organization || ''}` : ''}</div>
                      <input
                        className="pa-search"
                        value={personQuery}
                        onChange={(e) => setPersonQuery(e.target.value)}
                        placeholder="Rechercher un nom — la liste apparaît dès la première lettre…"
                      />
                      {personQuery.trim() && filteredPeople.length === 0 && (
                        <div className="pa-empty-state">🔍 Aucun résultat dans votre structure.</div>
                      )}
                      {filteredPeople.map((p) => {
                        const id = memberId(p);
                        const role = personRoles[id] || 'Participant';
                        return (
                          <div key={id} className="pa-rline">
                            <div className="pa-av">{initialsOf(memberName(p))}</div>
                            <div>{memberName(p)} <small>· {orgRoleLabel(p)}</small></div>
                            <select
                              className="pa-seldd"
                              value={role}
                              onChange={(e) => setPersonRoles((prev) => ({ ...prev, [id]: e.target.value as ProjectPersonRole }))}
                            >
                              {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.value}</option>)}
                            </select>
                            <button type="button" className="pa-addb" onClick={() => void addPerson(p, role)}>Ajouter</button>
                          </div>
                        );
                      })}
                      <div className="pa-klabel">➕ Ajouter une pré-inscription</div>
                      {!showPrepForm ? (
                        <button type="button" className="pa-rline dash" onClick={() => setShowPrepForm(true)}>
                          <div className="pa-av">➕</div>
                          <div style={{ fontSize: 9.5, color: '#6d6a62' }}>Si la personne est déjà sur Kinship, son compte sera retrouvé automatiquement.</div>
                        </button>
                      ) : (
                        <div style={{ border: '1px dashed #bcd6d3', borderRadius: 9, padding: '8px 10px 6px', background: '#fff', marginBottom: 6 }}>
                          <div className="pa-frow">
                            <div className="pa-field">
                              <label>Prénom <em>✱</em></label>
                              <input className="pa-fin" value={prepFirst} onChange={(e) => setPrepFirst(e.target.value)} />
                            </div>
                            <div className="pa-field">
                              <label>Nom <em>✱</em></label>
                              <input className="pa-fin" value={prepLast} onChange={(e) => setPrepLast(e.target.value)} />
                            </div>
                          </div>
                          <div className="pa-frow">
                            <div className="pa-field">
                              <label>Date de naissance <em>✱</em></label>
                              <input className="pa-fin" type="date" value={prepBirth} onChange={(e) => setPrepBirth(e.target.value)} />
                            </div>
                            <div className="pa-field">
                              <label htmlFor="pa-prep-role">Rôle <em>✱</em></label>
                              <select
                                id="pa-prep-role"
                                className="pa-fin"
                                value={prepSystemRole}
                                onChange={(e) => setPrepSystemRole(e.target.value)}
                                required
                              >
                                <option value="">Choisir un rôle…</option>
                                {visibleSystemRoles.length === 0 ? (
                                  <option value="" disabled>Chargement…</option>
                                ) : (
                                  visibleSystemRoles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {translateRole(role.value)}
                                    </option>
                                  ))
                                )}
                              </select>
                            </div>
                          </div>
                          <div className="pa-field">
                            <label>Email — optionnel</label>
                            <input className="pa-fin" value={prepEmail} onChange={(e) => setPrepEmail(e.target.value)} placeholder="si vous le donnez, l’invitation part" />
                          </div>
                          <div className="pa-hint">Si la personne est déjà sur Kinship, son compte sera retrouvé automatiquement. Pour faire co-attester le projet par une personne sans compte : ne la pré-inscrivez pas — cela se fera à la clôture.</div>
                          <div className="pa-actions-end">
                            <button type="button" className="pa-bt-ghost" onClick={() => setShowPrepForm(false)}>Annuler</button>
                            <button type="button" className="pa-addb" onClick={() => void submitPrepared()}>Pré-inscrire</button>
                          </div>
                        </div>
                      )}
                      {groups.length > 0 && (
                        <>
                          <div className="pa-klabel">👥 Ajouter un groupe</div>
                          {groups.slice(0, 6).map((g) => (
                            <div key={g.id} className="pa-rline">
                              <div className="pa-av">👥</div>
                              <div>
                                {g.name}
                                <small>· {g.members_count ?? g.members?.length ?? 0} personnes — le groupe déverse, « participant » par défaut</small>
                              </div>
                              <button type="button" className="pa-addb" onClick={() => void addGroup(g)}>Ajouter tous</button>
                            </div>
                          ))}
                        </>
                      )}
                      {addedFlash && <div className="pa-pfoot"><b>✓ {addedFlash}</b> Le panneau reste ouvert.</div>}
                    </div>
                  )}
                  {participantView === 'cards' ? (
                    <div className="pa-vgrid">
                      {preparedPeople.map((p) =>
                        renderParticipantCard(null, {
                          id: p.id,
                          name: `${p.firstName} ${p.lastName}`,
                          role: p.systemRole ? translateRole(p.systemRole) : 'pré-inscrit',
                          org: 'pré-inscrit · en attente d’activation',
                          initials: p.initials,
                        })
                      )}
                      {confirmedMembers.map((m) => renderParticipantCard(m))}
                    </div>
                  ) : (
                    <table className="pa-ltable">
                      <thead>
                        <tr>
                          <th />
                          <th>Nom</th>
                          <th>Rôle système</th>
                          <th>Organisation</th>
                          <th>Rôle projet</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {confirmedMembers.map((m) => (
                          <tr key={memberId(m)}>
                            <td><div className="pa-av">{initialsOf(memberName(m))}</div></td>
                            <td><b>{memberName(m)}</b></td>
                            <td>{memberJob(m)}</td>
                            <td>{memberOrg(m, project.organization)}</td>
                            <td>{roleLabel(memberRole(m))}</td>
                            <td>{canAttest && <button type="button" className="pa-bt-green" onClick={() => attest(memberId(m))}>🏅</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {canSeeInner && tab === 'teams' && (
                <div className="pa-sec">
                  <h4>
                    Gestion des équipes ({teams.length})
                    {canManageTeams && (
                      <button type="button" className="add" onClick={() => setAddPanel(addPanel === 'team' ? null : 'team')}>
                        + Créer une équipe
                      </button>
                    )}
                  </h4>
                  {addPanel === 'team' && canManageTeams && (
                    <div className="pa-panel">
                      <h5>Créer une équipe</h5>
                      <div className="pm">Les mêmes champs qu’aujourd’hui — le modal devient panneau.</div>
                      <div className="pa-field">
                        <label>Nom de l’équipe <em>✱</em></label>
                        <input className="pa-fin" value={teamTitle} onChange={(e) => setTeamTitle(e.target.value)} />
                      </div>
                      <div className="pa-field">
                        <label>Description</label>
                        <input className="pa-fin" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Décrivez le rôle et les responsabilités…" />
                      </div>
                      <div className="pa-field">
                        <label>Chef d’équipe <em>✱</em></label>
                        <select className="pa-fin" value={teamLeaderId} onChange={(e) => setTeamLeaderId(e.target.value)}>
                          <option value="">Choisir…</option>
                          {confirmedMembers.map((m) => (
                            <option key={memberId(m)} value={memberId(m)}>{memberName(m)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="pa-field">
                        <label>Membres de l’équipe <em>✱</em></label>
                        <input
                          className="pa-fin"
                          value={teamMemberQuery}
                          onChange={(e) => setTeamMemberQuery(e.target.value)}
                          placeholder="🔍 Rechercher parmi les participants…"
                        />
                        <div className="pa-chipsel">
                          {teamMemberIds.map((id) => {
                            const m = confirmedMembers.find((x) => memberId(x) === id);
                            return (
                              <span key={id} onClick={() => setTeamMemberIds((prev) => prev.filter((x) => x !== id))}>
                                {m ? memberName(m) : id} ✕
                              </span>
                            );
                          })}
                        </div>
                        {confirmedMembers
                          .filter((m) => {
                            const id = memberId(m);
                            if (teamMemberIds.includes(id) || id === teamLeaderId) return false;
                            const q = teamMemberQuery.trim().toLowerCase();
                            return !q || memberName(m).toLowerCase().includes(q);
                          })
                          .slice(0, 6)
                          .map((m) => (
                            <div key={memberId(m)} className="pa-rline">
                              <div className="pa-av">{initialsOf(memberName(m))}</div>
                              <div>{memberName(m)}</div>
                              <button type="button" className="pa-addb" onClick={() => setTeamMemberIds((prev) => [...prev, memberId(m)])}>Ajouter</button>
                            </div>
                          ))}
                      </div>
                      <div className="pa-actions-end">
                        <button type="button" className="pa-bt-ghost" onClick={() => setAddPanel(null)}>Annuler</button>
                        <button type="button" className="pa-addb" onClick={() => void createTeam()}>Créer l’équipe</button>
                      </div>
                    </div>
                  )}
                  {teams.length === 0 && addPanel !== 'team' && (
                    <div className="pa-empty-state">Aucune équipe pour l’instant.</div>
                  )}
                  {teams.map((t) => (
                    <div key={t.id} className="pa-teamcard">
                      <div className="tt">{t.title}</div>
                      <small>Chef d’équipe : {t.team_leader?.full_name || '—'} · {t.members_count || t.team_members?.length || 0} membres</small>
                      <div className="pa-avs">
                        {(t.team_members || []).slice(0, 6).map((m) => (
                          <div key={m.id} className="pa-av">{initialsOf(m.user?.full_name || '')}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {canSeeInner && tab === 'proofs' && (
                <div className="pa-sec">
                  <h4>Preuves de compétences attestées ({filteredBadges.length})</h4>
                  <div className="pa-filters">
                    <div className="pa-fbox">
                      <b>Par série</b>
                      <select className="pa-fin" value={proofSeries} onChange={(e) => setProofSeries(e.target.value)}>
                        <option value="">Toutes les séries</option>
                        {seriesOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="pa-fbox">
                      <b>Porteur</b>
                      <input className="pa-fin" value={proofHolder} onChange={(e) => setProofHolder(e.target.value)} placeholder="Rechercher par nom…" />
                    </div>
                  </div>
                  <div className="pa-vswitch">
                    <button type="button" className={`pa-vsw ${proofView === 'cards' ? 'on' : ''}`} onClick={() => setProofView('cards')}>▦ Cartes</button>
                    <button type="button" className={`pa-vsw ${proofView === 'list' ? 'on' : ''}`} onClick={() => setProofView('list')}>☰ Liste</button>
                  </div>
                  {filteredBadges.length === 0 && (
                    <div className="pa-empty-state">🏅 Aucune preuve de compétences attestée pour l’instant.</div>
                  )}
                  {proofView === 'cards' ? (
                    <div className="pa-pbgrid">
                      {filteredBadges.map((b) => {
                        const title = b.badge?.name || b.badge_name || 'Preuve';
                        const series = b.badge?.series || b.series || 'Série';
                        const level = b.badge?.level || b.level || 'Niveau 1';
                        const holder = b.receiver?.full_name || b.receiver_name || '—';
                        const sender = b.sender?.full_name || b.sender_name || '—';
                        const date = b.assigned_at ? formatFrDate(String(b.assigned_at).slice(0, 10)) : '—';
                        return (
                          <button key={b.id} type="button" className="pa-pbcard" onClick={() => openProof(b)}>
                            <div className="pa-pbhead" style={{ background: seriesColor(String(series)) }}>{String(series).toUpperCase()}</div>
                            <div className="pa-pbbody">
                              <div className="pa-pbt">{title}</div>
                              <div className="pa-pbrow">
                                <span className="pa-pbn">{String(level).replace(/^level[_-]?/i, 'Niveau ')}</span>
                                <span className="pa-pbs">{series}</span>
                              </div>
                              <div className="pa-pbwho">{holder}<br />par {sender}</div>
                              <div className="pa-pbfoot">✓ Attestée · {date}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <table className="pa-ltable">
                      <thead>
                        <tr>
                          <th>Preuve</th>
                          <th>Série</th>
                          <th>Niveau</th>
                          <th>Porteur</th>
                          <th>Attestée par</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBadges.map((b) => (
                          <tr key={b.id} onClick={() => openProof(b)} style={{ cursor: 'pointer' }}>
                            <td><b>{b.badge?.name || b.badge_name}</b></td>
                            <td>{b.badge?.series || b.series}</td>
                            <td>{b.badge?.level || b.level}</td>
                            <td>{b.receiver?.full_name || b.receiver_name}</td>
                            <td>{b.sender?.full_name || b.sender_name}</td>
                            <td>{b.assigned_at ? formatFrDate(String(b.assigned_at).slice(0, 10)) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {tab === 'documents' && (
                <div className="pa-sec">
                  <h4>
                    Documents
                    {!isVisitor && !isEnded && (isOwner || isCoOwner) && (
                      <button type="button" className="add" onClick={() => setAddPanel(addPanel === 'document' ? null : 'document')}>
                        📎 Ajouter — 1 Mo max · 5 fichiers max
                      </button>
                    )}
                  </h4>
                  {addPanel === 'document' && (
                    <div className="pa-panel">
                      <h5>Ajouter un document</h5>
                      <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                      {docFile && <div className="pa-rline">📄 <div>{docFile.name} <small>· {formatBytes(docFile.size)}</small></div></div>}
                      <div className="pa-klabel">qui peut le voir ?</div>
                      {(['private', 'public'] as const).map((v) => (
                        <button key={v} type="button" className={`pa-radio ${docVis === v ? 'on' : ''}`} onClick={() => setDocVis(v)}>
                          <span className="dot">{docVis === v ? <i /> : null}</span>
                          <div>
                            <b>{DOC_VIS_LABEL[v]}</b>
                            {v === 'private' ? ' — l’équipe du projet' : ' — visible sur l’affiche (suit la visibilité du projet)'}
                          </div>
                        </button>
                      ))}
                      <div className="pa-actions-end">
                        <button type="button" className="pa-bt-ghost" onClick={() => { setAddPanel(null); setDocFile(null); }}>Annuler</button>
                        <button type="button" className="pa-addb" onClick={() => void addDocument()} disabled={!docFile}>Ajouter</button>
                      </div>
                      <div className="pa-klabel">ou un lien</div>
                      <div className="pa-frow">
                        <div className="pa-field">
                          <label>URL <em>✱</em></label>
                          <input className="pa-fin" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                        </div>
                        <div className="pa-field">
                          <label>Titre</label>
                          <input className="pa-fin" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                        </div>
                      </div>
                      {(['team', 'participants', 'public'] as DocVisibility[]).map((v) => (
                        <button key={`l-${v}`} type="button" className={`pa-radio ${linkVis === v ? 'on' : ''}`} onClick={() => setLinkVis(v)}>
                          <span className="dot">{linkVis === v ? <i /> : null}</span>
                          <div>{VIS_LABEL[v]}</div>
                        </button>
                      ))}
                      <div className="pa-actions-end">
                        <button type="button" className="pa-addb" onClick={() => void addLink()} disabled={!linkUrl.trim()}>Ajouter le lien</button>
                      </div>
                    </div>
                  )}
                  {visibleDocs.map((d) => {
                    const isPublic = d.visibility === 'public';
                    return (
                    <div key={d.id} className="pa-docline">
                      📄
                      <div>{d.filename}<small> · {formatBytes(d.byte_size)}</small></div>
                      {!isVisitor && (
                        <button
                          type="button"
                          className={`pa-vispill ${isPublic ? 'vpub' : 'vpriv'}`}
                          disabled={isEnded || !(isOwner || isCoOwner)}
                          onClick={() => void setDocumentVisibility(d.id, isPublic ? 'private' : 'public')}
                        >
                          {isPublic ? 'Public' : 'Privé'}
                        </button>
                      )}
                      <div className="sp">
                        <a className="pa-bt-ghost" href={d.url} target="_blank" rel="noreferrer">Télécharger</a>
                        {(isOwner || isCoOwner) && !isEnded && (
                          <button type="button" className="pa-bt-red" onClick={() => void removeDoc(d.id)}>Supprimer</button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {visibleLinks.map((l: any) => (
                    <div key={l.id || l.url} className="pa-docline">
                      🔗
                      <div>{l.name}<small> · lien</small></div>
                      {!isVisitor && (
                        <button
                          type="button"
                          className={`pa-vispill ${VIS_CLASS[linkVisOf(l)]}`}
                          onClick={() => persistExtras({
                            ...extras,
                            linkVisibility: { ...(extras.linkVisibility || {}), [String(l.url || l.id)]: nextVisibility(linkVisOf(l)) },
                          })}
                        >
                          {VIS_LABEL[linkVisOf(l)]}
                        </button>
                      )}
                      <div className="sp">
                        <a className="pa-bt-ghost" href={l.url} target="_blank" rel="noreferrer">Ouvrir</a>
                        {(isOwner || isCoOwner) && !isEnded && (
                          <button type="button" className="pa-bt-red" onClick={() => void removeLink(l)}>Supprimer</button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(isOwner || isCoOwner) && (
                    <>
                      <div className="pa-klabel">Photos — 2 max, couverture comprise</div>
                      <div className="pa-phs">
                        {photos.map((src, i) => (
                          <div key={src} className="pa-phv" style={{ backgroundImage: `url(${src})` }}>{i === 0 ? 'couverture' : `photo ${i + 1}`}</div>
                        ))}
                        {photos.length < 2 ? (
                          <label className="pa-phv add">
                            + ajouter
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void addPhoto(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        ) : (
                          <div className="pa-phv add full">2 photos — limite atteinte</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {removeTarget && (
        <div className="pa-movl" onClick={() => setRemoveTarget(null)}>
          <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
            <h6>Retirer {removeTarget.name} du projet ?</h6>
            <p>Elle quitte la liste des participants. Ses preuves de compétences restent les siennes — rien ne lui est repris.</p>
            <div className="mb">
              <button type="button" className="pa-bt-ghost" onClick={() => setRemoveTarget(null)}>Annuler</button>
              <button type="button" className="pa-bt-red" onClick={() => void confirmRemove()}>Retirer</button>
            </div>
          </div>
        </div>
      )}

      {closeOpen && (
        <div className="pa-movl" onClick={() => setCloseOpen(false)}>
          <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
            <h6>Clôturer le projet ?</h6>
            <p>La clôture fige le projet et permet de générer sa Preuve Projet — authentique et vérifiable. On ne rouvre pas un projet clos.</p>
            <div className="mb">
              <button type="button" className="pa-bt-ghost" onClick={() => setCloseOpen(false)}>Annuler</button>
              <button type="button" className="pa-addb" onClick={() => void confirmClose()}>Clôturer le projet</button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="pa-movl" onClick={() => setShareOpen(false)}>
          <div className="pa-modal" onClick={(e) => e.stopPropagation()}>
            <h6>Partager un lien vers le projet</h6>
            <p>Toute personne disposant de ce lien pourra consulter l’affiche et demander à la rejoindre.</p>
            <div className="pa-share-row">
              <div className="pa-qr" ref={qrRef} />
              <div className="pa-share-url">{shareUrl}</div>
            </div>
            <div className="mb">
              <button type="button" className="pa-bt-ghost" onClick={() => setShareOpen(false)}>Fermer</button>
              <button
                type="button"
                className="pa-addb"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  showSuccess('Lien copié.');
                }}
                disabled={!shareUrl}
              >
                Copier le lien
              </button>
            </div>
          </div>
        </div>
      )}

      {isAttestOpen && project && (
        <AttestCompetenceModal
          onClose={() => {
            setIsAttestOpen(false);
            setAttestPersonId(null);
          }}
          onAssign={async () => {
            if (!projectId) return;
            try {
              const badgeRes = await getProjectBadges(Number(projectId), 1, 50);
              setBadges(Array.isArray(badgeRes?.data) ? badgeRes.data : []);
            } catch {
              /* keep current list */
            }
          }}
          participants={confirmedMembers.map((m) => ({
            id: memberId(m),
            memberId: memberId(m),
            name: memberName(m),
            avatar: m?.user?.avatar_url || m?.avatar_url || '',
            organization: memberOrg(m, project.organization),
          }))}
          preselectedParticipant={attestPersonId}
          projectId={projectId}
          projectTitle={project.title}
        />
      )}
    </div>
  );
};

export default ProjectAffichePage;
