import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjectById } from '../../api/Project';
import {
  addProjectDocuments,
  addProjectFunder,
  addProjectMember,
  preRegisterProjectParticipant,
  closeProject,
  fetchAllConfirmedPartnerships,
  getOrganizationMembers,
  getProjectDocuments,
  getProjectFunders,
  getProjectMembers,
  getTags,
  getTeacherMembers,
  lookupFunderOrganization,
  getFunderAttachments,
  FunderAttachment,
  Partnership,
  ProjectDocument,
  ProjectFunder,
  Tag,
  removeProjectFunder,
  updateProject,
  updateProjectDocumentVisibility,
  updateProjectMember,
} from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { Project } from '../../types';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import {
  getOrganizationType,
  getTagIdByPathway,
  mapApiProjectToFrontendProject,
} from '../../utils/projectMapper';
import { shouldShowEndDateWarningBanner } from '../../utils/projectStateGuards';
import {
  getProjectSpaceExtras,
  getProjectSpaceTab,
  openProjectAffiche,
  ProjectPersonRole,
  ProjectSpaceTab,
  resolveProjectSpaceId,
  setProjectSpaceExtras,
  setProjectSpaceTab,
} from '../../utils/projectSpaceStore';
import { useToast } from '../../hooks/useToast';
import { LearningOutcome } from '../../data/mockFormations';
import {
  newLearningOutcome,
  parseLearningOutcomes,
  serializeLearningOutcomes,
  EU_MC_ASSESSMENT_SUGGESTIONS,
  EU_MC_LANGUAGES,
} from '../../data/euMcCatalog';
import EuMcGoldSummary from './EuMcGoldSummary';
import './ProjectSpacePage.css';

type AddPanel = 'person' | 'partner' | 'funder' | 'media' | null;
type ParticipationMode = 'presentiel' | 'distanciel' | 'hybride';
type EqfFramework = 'EQF' | 'QF_EHEA';

function toInputNum(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isNaN(n) ? String(value) : String(n);
}

const STATUS_CHIP: Record<string, string> = {
  draft: 'Brouillon',
  coming: 'À venir',
  in_progress: 'En cours',
  ended: 'Terminé',
  archived: 'Archivé',
  to_process: 'À traiter',
  pending_validation: 'En validation',
};

const PARTICIPATION_LABEL: Record<ParticipationMode, string> = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride',
};

const PARTICIPATION_TO_API: Record<ParticipationMode, 'on_site' | 'online' | 'blended'> = {
  presentiel: 'on_site',
  distanciel: 'online',
  hybride: 'blended',
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

const ProjectSpacePage: React.FC = () => {
  const { state, setCurrentPage, setSelectedProject } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const userRef = useRef(state.user);
  userRef.current = state.user;

  const projectId = resolveProjectSpaceId(state.selectedProject?.id);

  useEffect(() => {
    if (window.location.pathname !== '/project-space' && window.location.pathname.startsWith('/project-space')) {
      navigate('/project-space', { replace: true });
    }
  }, [navigate]);

  const [tab, setTabState] = useState<ProjectSpaceTab>(() => getProjectSpaceTab());
  const setTab = (next: ProjectSpaceTab) => {
    setProjectSpaceTab(next);
    setTabState(next);
  };

  const [project, setProject] = useState<Project | null>(null);
  const [apiProject, setApiProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pathways, setPathways] = useState<string[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [participationMode, setParticipationMode] = useState<ParticipationMode>('presentiel');
  const [workloadHours, setWorkloadHours] = useState('');
  const [workloadEcts, setWorkloadEcts] = useState('');
  const [eqfLevel, setEqfLevel] = useState<number | ''>('');
  const [eqfFramework, setEqfFramework] = useState<EqfFramework>('EQF');
  const [assessmentType, setAssessmentType] = useState('');
  const [teachingLanguages, setTeachingLanguages] = useState<string[]>(['fr']);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [availablePathways, setAvailablePathways] = useState<Tag[]>([]);

  const [members, setMembers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [orgPeople, setOrgPeople] = useState<any[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [personQuery, setPersonQuery] = useState('');
  const [personRoles, setPersonRoles] = useState<Record<string, ProjectPersonRole>>({});
  const [addPanel, setAddPanel] = useState<AddPanel>(null);
  const [partnerQuery, setPartnerQuery] = useState('');
  const [selectedPartnershipId, setSelectedPartnershipId] = useState<string>('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [funderQuery, setFunderQuery] = useState('');
  const [funderEmail, setFunderEmail] = useState('');
  const [funderShare, setFunderShare] = useState<'nominatif' | 'anonyme'>('nominatif');
  const [uploadDocVis, setUploadDocVis] = useState<'private' | 'public'>('private');
  const [funders, setFunders] = useState<ProjectFunder[]>([]);
  const [attachedFunders, setAttachedFunders] = useState<FunderAttachment[]>([]);
  const [matchedFunderOrg, setMatchedFunderOrg] = useState<{ name: string; email: string } | null>(null);
  const [prepFirst, setPrepFirst] = useState('');
  const [prepLast, setPrepLast] = useState('');
  const [prepBirth, setPrepBirth] = useState('');
  const [prepEmail, setPrepEmail] = useState('');
  const [extras, setExtras] = useState(() => getProjectSpaceExtras(projectId));

  const isDraft = project?.status === 'draft';
  const isCreated = Boolean(project && project.status !== 'draft');
  const isEnded = project?.status === 'ended' || project?.status === 'archived';
  const isEuMc = Boolean(project?.isEuMcDeclared || apiProject?.is_eu_mc_declared);
  const orgType = getOrganizationType(state.showingPageType);
  const orgId = getSelectedOrganizationId(state.user, state.showingPageType);

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
      setTitle(mapped.title || '');
      setDescription(mapped.description || '');
      setStartDate(mapped.startDate || '');
      setEndDate(mapped.endDate || '');
      setPathways(mapped.pathways || []);
      setLearningOutcomes(parseLearningOutcomes(mapped.learningOutcomes));
      setParticipationMode(mapped.participationMode || 'presentiel');
      setWorkloadHours(toInputNum(mapped.workloadHours));
      setWorkloadEcts(toInputNum(mapped.workloadEcts));
      setEqfLevel(mapped.eqfLevel ?? '');
      setEqfFramework(mapped.eqfFramework === 'QF_EHEA' ? 'QF_EHEA' : 'EQF');
      setAssessmentType(mapped.assessmentType || '');
      setTeachingLanguages(
        mapped.teachingLanguages && mapped.teachingLanguages.length > 0
          ? mapped.teachingLanguages
          : ['fr']
      );
      setExtras(getProjectSpaceExtras(mapped.id));
      try {
        const [mem, docs, funderList] = await Promise.all([
          getProjectMembers(Number(projectId)),
          getProjectDocuments(Number(projectId)),
          getProjectFunders(Number(projectId)),
        ]);
        setMembers(Array.isArray(mem) ? mem : []);
        setDocuments(docs?.data || []);
        setFunders(Array.isArray(funderList) ? funderList : []);
      } catch {
        setMembers([]);
        setDocuments([]);
        setFunders([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Impossible de charger le projet.');
    } finally {
      setLoading(false);
    }
  }, [projectId, state.showingPageType]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  useEffect(() => {
    if (!orgId) return;
    void getFunderAttachments(orgId, orgType === 'school' ? 'school' : 'company')
      .then((res) => setAttachedFunders((res.received || []).filter((a) => a.status === 'confirmed')))
      .catch(() => setAttachedFunders([]));
  }, [orgId, orgType]);

  useEffect(() => {
    const email = funderEmail.trim();
    if (!email.includes('@')) {
      setMatchedFunderOrg(null);
      return;
    }
    const t = window.setTimeout(() => {
      void lookupFunderOrganization(email).then((org) => {
        setMatchedFunderOrg(org ? { name: org.name, email: org.email } : null);
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [funderEmail]);

  useEffect(() => {
    void getTags()
      .then((tags) => setAvailablePathways(Array.isArray(tags) ? tags : []))
      .catch(() => setAvailablePathways([]));
  }, []);

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

  const confirmedMembers = members.filter((m) => m.status !== 'pending');
  const visibleAvatars = confirmedMembers.slice(0, 5);
  const extraCount = Math.max(0, confirmedMembers.length - 5);
  const preparedPeople = extras.preparedPeople;
  const partners = project?.partners || (project?.partner ? [project.partner] : []);
  const links = Array.isArray(apiProject?.links) ? apiProject.links : [];
  const photos = project?.additionalPhotos || [];
  const mediaCount = `${documents.length}/5 · Liens (${links.length}) · Photos (${photos.length}/2)`;

  const filteredPeople = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    const already = new Set(members.map(memberId));
    return orgPeople
      .filter((p) => {
        const id = memberId(p);
        if (!id || already.has(id)) return false;
        if (!q) return true;
        return memberName(p).toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [orgPeople, personQuery, members]);

  const filteredPartnerships = useMemo(() => {
    const q = partnerQuery.trim().toLowerCase();
    return partnerships.filter((p) => {
      const name = (p.name || p.partners?.map((x) => x.name).join(' ') || '').toLowerCase();
      return !q || name.includes(q);
    }).slice(0, 8);
  }, [partnerships, partnerQuery]);

  const showCloseBanner = shouldShowEndDateWarningBanner(project?.status, project?.showEndDateWarning);

  const patchProject = async (fields: Parameters<typeof updateProject>[1]['project'], success?: string) => {
    if (!projectId) return;
    setSaving(true);
    setError(null);
    try {
      await updateProject(Number(projectId), { project: fields });
      if (success) showSuccess(success);
      await loadProject({ silent: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.details?.join?.(', ') || 'Enregistrement impossible.';
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
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
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProject(Number(projectId), { project: { private: makePrivate } });
      const raw = (updated as any)?.data || updated;
      const persisted =
        typeof raw?.private === 'boolean' ? raw.private : makePrivate;
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
      const msg = e?.response?.data?.message || 'Impossible de changer la visibilité.';
      setError(msg);
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveInformations = () => {
    if (!title.trim() || !description.trim() || !startDate || !endDate) {
      setError('Quatre champs suffisent : titre, description, date de début, date de fin.');
      return;
    }
    const tagIds = pathways
      .map((name) => getTagIdByPathway(name, availablePathways))
      .filter((id): id is number => typeof id === 'number');
    void patchProject(
      {
        title: title.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        tag_ids: isEuMc ? [] : tagIds,
        learning_outcomes: serializeLearningOutcomes(learningOutcomes),
        participation_mode: PARTICIPATION_TO_API[participationMode],
        ...(isEuMc
          ? {
              workload_hours: workloadHours.trim() || undefined,
              workload_ects: workloadEcts.trim() || undefined,
              project_eqf_level: eqfLevel === '' ? undefined : eqfLevel,
              project_eqf_framework_type: eqfFramework,
              assessment_type: assessmentType.trim() || undefined,
              teaching_languages: teachingLanguages,
            }
          : {}),
      },
      'Brouillon enregistré'
    );
  };

  const createFromDraft = async () => {
    if (!title.trim() || !description.trim() || !startDate || !endDate) {
      setError('Complétez titre, description et dates avant de créer.');
      setTab('informations');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const nextStatus = startDate > today ? 'coming' : 'in_progress';
    await patchProject(
      {
        title: title.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        status: nextStatus,
        private: true,
        learning_outcomes: serializeLearningOutcomes(learningOutcomes),
        participation_mode: PARTICIPATION_TO_API[participationMode],
        ...(isEuMc
          ? {
              workload_hours: workloadHours.trim() || undefined,
              workload_ects: workloadEcts.trim() || undefined,
              project_eqf_level: eqfLevel === '' ? undefined : eqfLevel,
              project_eqf_framework_type: eqfFramework,
              assessment_type: assessmentType.trim() || undefined,
              teaching_languages: teachingLanguages,
            }
          : {}),
      },
      'Projet créé — privé par défaut, visible par votre structure seulement.'
    );
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
      setAddPanel(null);
      setPersonQuery('');
      showSuccess(`${memberName(person)} ajouté${isDraft ? ' — préparé, invisible avant la création' : ''}.`);
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Impossible d’ajouter cette personne.');
    }
  };

  const submitPrepared = async () => {
    if (!prepFirst.trim() || !prepLast.trim() || !prepBirth) {
      showError('Prénom, nom et date de naissance sont requis.');
      return;
    }
    if (!projectId) return;
    try {
      await preRegisterProjectParticipant(Number(projectId), {
        first_name: prepFirst.trim(),
        last_name: prepLast.trim(),
        birthday: prepBirth,
        email: prepEmail.trim() || undefined,
        organization_id: orgId || undefined,
        organization_type: orgType,
      });
      const mem = await getProjectMembers(Number(projectId));
      setMembers(Array.isArray(mem) ? mem : []);
      setPrepFirst('');
      setPrepLast('');
      setPrepBirth('');
      setPrepEmail('');
      setAddPanel(null);
      showSuccess('Pré-inscription enregistrée — son compte sera retrouvé automatiquement si la personne est déjà sur Kinship.');
    } catch (e: any) {
      showError(e?.response?.data?.message || e?.response?.data?.details?.[0] || 'Impossible d’enregistrer la pré-inscription.');
    }
  };

  const addPartner = async () => {
    if (!selectedPartnershipId || !projectId) return;
    const existing = (apiProject?.partnership_ids || []).map((id: number) => Number(id));
    const next = Array.from(new Set([...existing, Number(selectedPartnershipId)]));
    await patchProject({ partnership_ids: next }, isDraft ? 'Partenaire préparé — la demande partira à la création.' : 'Partenaire ajouté.');
    setAddPanel(null);
    setSelectedPartnershipId('');
    setPartnerQuery('');
  };

  const addFunder = async () => {
    const email = funderEmail.trim();
    const name = funderQuery.trim() || email;
    if (!email) {
      showError('Indiquez l’email du financeur — c’est lui qui recevra le lien de suivi.');
      return;
    }
    if (!projectId) return;
    try {
      const added = await addProjectFunder(Number(projectId), {
        name,
        email,
        share_mode: funderShare,
      });
      setFunders((current) => [added, ...current.filter((f) => f.id !== added.id)]);
      setFunderQuery('');
      setFunderEmail('');
      setAddPanel(null);
      if (isDraft) {
        showSuccess('Financeur préparé — informé au démarrage.');
      } else if (project?.status === 'in_progress') {
        showSuccess('Financeur informé — le lien de suivi a été envoyé.');
      } else {
        showSuccess('Financeur ajouté — il sera informé au démarrage.');
      }
    } catch (e: any) {
      showError(e?.response?.data?.details?.[0] || e?.response?.data?.message || 'Impossible d’ajouter ce financeur.');
    }
  };

  const removeFunder = async (id: number) => {
    if (!projectId) return;
    try {
      await removeProjectFunder(Number(projectId), id);
      setFunders((current) => current.filter((f) => f.id !== id));
    } catch (e: any) {
      showError(e?.response?.data?.details?.[0] || 'Impossible de retirer ce financeur.');
    }
  };

  const funderStatusLabel = (f: ProjectFunder) => {
    if (isDraft) return 'préparé — informé au démarrage';
    if (f.closed_notified_at) return 'rapport transmis';
    if (f.designation_kind === 'punctual') return 'désignation ponctuelle · sera informé au démarrage';
    if (f.started_notified_at) return 'informé · lien de suivi envoyé';
    return 'rattaché · sera informé au démarrage · rapport à la clôture';
  };

  const addDocument = async (file: File) => {
    if (documents.length >= 5) {
      showError('5 fichiers maximum.');
      return;
    }
    if (file.size > 1024 * 1024) {
      showError('1 Mo maximum par fichier — il sera compressé automatiquement.');
      return;
    }
    try {
      const res = await addProjectDocuments(Number(projectId), [file], uploadDocVis);
      setDocuments(res.data || []);
      setUploadDocVis('private');
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
    setLinkLabel('');
    setLinkUrl('');
    setAddPanel(null);
  };

  const goBack = () => {
    setCurrentPage('projects');
    navigate('/projects');
  };

  const orgSubtitle = state.showingPageType === 'pro' ? 'Entreprise' : state.showingPageType === 'teacher' ? 'Enseignant' : 'Établissement';

  if (loading) {
    return <div className="project-space-page"><div className="ps-loading">Chargement de l’espace…</div></div>;
  }

  if (!project) {
    return (
      <div className="project-space-page">
        <div className="ps-empty">
          <p>Aucun projet à afficher.</p>
          <button type="button" className="ps-btn outline" onClick={goBack}>Retour aux projets</button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-space-page">
      <button type="button" className="ps-back" onClick={goBack}>← Projets</button>
      <div className="ps-screen">
        <header className={`ps-hero ${isDraft ? 'is-draft' : ''}`}>
          <div className="ps-chips">
            <span className="ps-chip state">{STATUS_CHIP[project.status] || project.status}</span>
            {isCreated && (
              <span className="ps-chip vis">{project.visibility === 'public' ? 'Public' : 'Privé'}</span>
            )}
            <span className="ps-chip">{formatFrDate(project.startDate)} → {formatFrDate(project.endDate)}</span>
            {(project.pathways || []).slice(0, 2).map((p) => (
              <span key={p} className="ps-chip">{p}</span>
            ))}
          </div>
          <h1 className="ps-title">{project.title}</h1>
          <div className="ps-drow">
            <span>{project.organization} · {orgSubtitle}</span>
            <span className="ps-cart">✓ Vérifié</span>
            <button
              type="button"
              className="ps-affiche"
              disabled={isDraft}
              onClick={() => {
                if (isDraft || !project.id) return;
                openProjectAffiche(project.id);
                setCurrentPage('project-affiche');
                navigate('/project-affiche');
              }}
            >
              {isDraft ? 'L’affiche naîtra à la création' : 'Voir l’affiche →'}
            </button>
          </div>
        </header>

        <nav className="ps-tabs">
          <button type="button" className={`ps-tab ${tab === 'informations' ? 'on' : ''}`} onClick={() => setTab('informations')}>
            Informations
          </button>
          <button type="button" className={`ps-tab ${tab === 'gestion' ? 'on' : ''}`} onClick={() => setTab('gestion')}>
            Gestion
          </button>
        </nav>

        <div className="ps-inner">
          {error && <div className="ps-error">{error}</div>}

          {tab === 'informations' && (
            <>
              <div className="ps-banner">
                {isDraft
                  ? 'En brouillon, tout se modifie. Après la création : les dates seulement (justifiées, chaque inscrit notifié) — le reste se fige.'
                  : 'Après la création, cet onglet se consulte tel quel — l’unique porte : modifier les dates.'}
              </div>

              <label className="ps-field">
                <span>Titre du projet {isDraft && <span className="ob">✱</span>}</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!isDraft || isEnded} />
              </label>
              <label className="ps-field">
                <span>Description {isDraft && <span className="ob">✱</span>}</span>
                <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!isDraft || isEnded} />
              </label>
              <div className="ps-two">
                <label className="ps-field">
                  <span>Début {<span className="ob">✱</span>}</span>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isEnded} />
                </label>
                <label className="ps-field">
                  <span>Fin {<span className="ob">✱</span>}</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isEnded} />
                </label>
              </div>
              <p className="ps-sub">
                Image — optionnelle
                {!isEuMc ? ` · Parcours : ${pathways.length ? pathways.join(' · ') : 'aucun'}` : ''}
              </p>
              {isDraft && !isEuMc && (
                <div className="ps-field">
                  <span>Parcours (max 2)</span>
                  <div className="ps-docs" style={{ marginBottom: 8 }}>
                    {availablePathways.slice(0, 12).map((p) => {
                      const name = p.name_fr || p.name;
                      const sel = pathways.includes(name);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className="ps-doc"
                          style={sel ? undefined : { background: '#fff', color: '#6d6b64' }}
                          onClick={() => {
                            setPathways((prev) => {
                              if (prev.includes(name)) return prev.filter((x) => x !== name);
                              if (prev.length >= 2) return prev;
                              return [...prev, name];
                            });
                          }}
                        >
                          {name}{sel ? ' ✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isDraft ? (
                <>
                  <div className="ps-gold">
                    <b>Acquis d’apprentissage</b>
                    <p className="ps-outcome-hint">Ce que l’apprenant saura faire — une ligne par acquis.</p>
                    {learningOutcomes.length === 0 ? (
                      <p className="ps-outcome-empty">Aucun acquis pour l’instant.</p>
                    ) : (
                      <div className="ps-outcomes">
                        {learningOutcomes.map((outcome) => (
                          <div key={outcome.id} className="ps-outcome">
                            {outcome.kind === 'series' ? (
                              <span className="ps-outcome-series">{outcome.text}</span>
                            ) : (
                              <input
                                value={outcome.text}
                                placeholder="Ligne libre"
                                onChange={(e) =>
                                  setLearningOutcomes((prev) =>
                                    prev.map((o) =>
                                      o.id === outcome.id ? { ...o, text: e.target.value } : o
                                    )
                                  )
                                }
                              />
                            )}
                            {outcome.kind === 'free' && (
                              <span className="ps-outcome-kind">(ligne libre)</span>
                            )}
                            <button
                              type="button"
                              className="ps-outcome-remove"
                              aria-label="Retirer cet acquis"
                              onClick={() =>
                                setLearningOutcomes((prev) => prev.filter((o) => o.id !== outcome.id))
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="ps-outcome-add"
                      onClick={() => setLearningOutcomes((prev) => [...prev, newLearningOutcome('free')])}
                    >
                      + Ajouter un acquis
                    </button>
                  </div>
                  <div className="ps-gold">
                    <b>Mode de participation {isEuMc && <span className="ps-eug-tag">cadre européen</span>}</b>
                    <div className="ps-seg" style={{ margin: '8px 0 0', display: 'inline-flex' }}>
                      {(['presentiel', 'distanciel', 'hybride'] as const).map((id) => (
                        <button key={id} type="button" className={participationMode === id ? 'on' : ''} onClick={() => setParticipationMode(id)}>
                          {PARTICIPATION_LABEL[id]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {isEuMc && (
                    <>
                      <div className="ps-two">
                        <label className="ps-gold ps-field">
                          <span>Durée <span className="ps-eug-tag">cadre européen</span></span>
                          <div className="ps-hours">
                            <input
                              type="number"
                              min={1}
                              step="0.5"
                              value={workloadHours}
                              onChange={(e) => setWorkloadHours(e.target.value)}
                              placeholder="60"
                            />
                            <span>heures</span>
                          </div>
                        </label>
                        <label className="ps-gold ps-field">
                          <span>Crédits ECTS <em>— si applicable</em></span>
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={workloadEcts}
                            onChange={(e) => setWorkloadEcts(e.target.value)}
                            placeholder="2"
                          />
                        </label>
                      </div>
                      <div className="ps-two">
                        <label className="ps-gold ps-field">
                          <span>Niveau EQF <span className="ps-eug-tag">cadre européen</span></span>
                          <select
                            value={eqfLevel}
                            onChange={(e) => setEqfLevel(e.target.value ? Number(e.target.value) : '')}
                          >
                            <option value="">Choisir…</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                              <option key={n} value={n}>Niveau {n}</option>
                            ))}
                          </select>
                        </label>
                        <label className="ps-gold ps-field">
                          <span>Type de cadre</span>
                          <select
                            value={eqfFramework}
                            onChange={(e) => setEqfFramework(e.target.value as EqfFramework)}
                          >
                            <option value="EQF">EQF — cadre européen (CEC)</option>
                            <option value="QF_EHEA">QF-EHEA — enseignement supérieur (CC-EEES)</option>
                          </select>
                        </label>
                      </div>
                      <div className="ps-gold">
                        <b>Type d’évaluation <span className="ps-eug-tag">cadre européen</span></b>
                        <input
                          value={assessmentType}
                          onChange={(e) => setAssessmentType(e.target.value)}
                          placeholder="Mise en situation pratique évaluée"
                        />
                        <div className="ps-sugs">
                          {EU_MC_ASSESSMENT_SUGGESTIONS.map((sug) => (
                            <button key={sug} type="button" className="ps-sug" onClick={() => setAssessmentType(sug)}>
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="ps-gold">
                        <b>Langue d’enseignement <span className="ps-eug-tag">cadre européen</span></b>
                        <div className="ps-langs">
                          {teachingLanguages.map((code) => {
                            const lang = EU_MC_LANGUAGES.find((l) => l.code === code);
                            if (!lang) return null;
                            return (
                              <button
                                key={code}
                                type="button"
                                className="ps-lang"
                                onClick={() => setTeachingLanguages((prev) => prev.filter((c) => c !== code))}
                              >
                                {lang.flag} {lang.label} ✕
                              </button>
                            );
                          })}
                          <button type="button" className="ps-outcome-add" onClick={() => setLangPickerOpen((v) => !v)}>
                            + ajouter une langue…
                          </button>
                        </div>
                        {langPickerOpen && (
                          <div className="ps-lang-drop">
                            {EU_MC_LANGUAGES.filter((l) => !teachingLanguages.includes(l.code)).map((lang) => (
                              <button
                                key={lang.code}
                                type="button"
                                onClick={() => {
                                  setTeachingLanguages((prev) => [...prev, lang.code]);
                                  setLangPickerOpen(false);
                                }}
                              >
                                {lang.flag} {lang.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              ) : isEuMc ? (
                <EuMcGoldSummary
                  outcomes={learningOutcomes}
                  participationMode={participationMode}
                  workloadHours={workloadHours}
                  workloadEcts={workloadEcts}
                  eqfLevel={eqfLevel === '' ? null : eqfLevel}
                  eqfFramework={eqfFramework}
                  assessmentType={assessmentType}
                  teachingLanguages={teachingLanguages}
                />
              ) : (
                <>
                  <div className="ps-gold">
                    <b>Acquis d’apprentissage</b>
                    {learningOutcomes.length === 0 ? (
                      <p className="ps-outcome-empty">—</p>
                    ) : (
                      <ul className="ps-outcomes-read">
                        {learningOutcomes.map((outcome) => (
                          <li
                            key={outcome.id}
                            className={outcome.kind === 'series' ? 'series' : undefined}
                          >
                            {outcome.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="ps-gold">
                    <b>Mode de participation</b>
                    {PARTICIPATION_LABEL[participationMode]}
                  </div>
                </>
              )}
              {isDraft && (
                <div className="ps-foot">
                  <button type="button" className="ps-btn outline" disabled={saving} onClick={saveInformations}>
                    {saving ? 'Enregistrement…' : 'Sauvegarder le brouillon'}
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'gestion' && (
            <>
              {isDraft && (
                <div className="ps-banner">
                  <b>Tout se prépare ici — rien ne part avant la création du projet.</b> Les demandes de partenariat partiront à la création ; votre financeur sera informé au démarrage.
                </div>
              )}

              {isCreated && !isEnded && (
                <div className="ps-cmdrow">
                  <div className="ps-tog" aria-label="Visibilité du projet">
                    <button
                      type="button"
                      className={project.visibility !== 'public' ? 'on' : ''}
                      aria-pressed={project.visibility !== 'public'}
                      disabled={saving}
                      onClick={() => void setProjectVisibility(true)}
                    >
                      Privé — ma structure
                    </button>
                    <button
                      type="button"
                      className={project.visibility === 'public' ? 'on' : ''}
                      aria-pressed={project.visibility === 'public'}
                      disabled={saving}
                      onClick={() => void setProjectVisibility(false)}
                    >
                      Public — tout Kinship
                    </button>
                  </div>
                  <span className="ps-vis">
                    visible par : {project.visibility === 'public' ? 'tout Kinship' : 'votre structure'}
                  </span>
                </div>
              )}

              {isCreated && showCloseBanner && !isEnded && (
                <div className="ps-variant">
                  <div>
                    <b>Votre projet est-il terminé ?</b> La clôture permet de générer sa Preuve Projet — authentique et vérifiable.
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await closeProject(Number(projectId));
                        showSuccess('Projet clôturé.');
                        await loadProject();
                      } catch {
                        showError('Clôture impossible.');
                      }
                    }}
                  >
                    Clôturer le projet
                  </button>
                </div>
              )}

              <section className="ps-sec">
                <h2>
                  Participants ({confirmedMembers.length + preparedPeople.length})
                  {!isEnded && (
                    <button type="button" className={`ps-add ${addPanel === 'person' ? 'on' : ''}`} onClick={() => setAddPanel(addPanel === 'person' ? null : 'person')}>
                      + Ajouter une personne
                    </button>
                  )}
                </h2>
                <div className="ps-avs">
                  {visibleAvatars.map((m) => (
                    <div key={memberId(m)} className="ps-av" title={memberName(m)}>{initialsOf(memberName(m))}</div>
                  ))}
                  {preparedPeople.map((p) => (
                    <div key={p.id} className="ps-av" title={`${p.firstName} ${p.lastName} (préparé)`}>{p.initials}</div>
                  ))}
                  {extraCount > 0 && <div className="ps-av more">+{extraCount}</div>}
                </div>
                {addPanel === 'person' && (
                  <div className="ps-panel">
                    <div className="ps-plabel">Le panneau se déplie ici — il se replie après l’ajout</div>
                    <input className="ps-in" value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} placeholder="Rechercher — prénom, nom…" />
                    {filteredPeople.map((p) => {
                      const id = memberId(p);
                      const role = personRoles[id] || 'Participant';
                      return (
                        <div key={id} className="ps-row">
                          <div className="ps-av">{initialsOf(memberName(p))}</div>
                          <div>
                            <span className="ps-nm">{memberName(p)}</span> <small>· {orgRoleLabel(p)}</small>
                          </div>
                          <div className="ps-seg">
                            {(['Admin', 'Encadrant', 'Participant'] as const).map((r) => (
                              <button key={r} type="button" className={role === r ? 'on' : ''} onClick={() => setPersonRoles((prev) => ({ ...prev, [id]: r }))}>
                                {r}
                              </button>
                            ))}
                          </div>
                          <button type="button" className="ps-mini" onClick={() => void addPerson(p, role)}>Ajouter</button>
                        </div>
                      );
                    })}
                    {personQuery.trim() && filteredPeople.length === 0 && (
                      <p className="ps-sub">Personne introuvable dans votre organisation — utilisez la pré-inscription.</p>
                    )}
                    <p className="ps-hint">Encadrant : formateur, intervenant extérieur ou interne, animateur… — atteste des compétences</p>
                    <div className="ps-plabel">Ajouter une pré-inscription</div>
                    <div className="ps-two">
                      <input className="ps-in" placeholder="Prénom ✱" value={prepFirst} onChange={(e) => setPrepFirst(e.target.value)} />
                      <input className="ps-in" placeholder="Nom ✱" value={prepLast} onChange={(e) => setPrepLast(e.target.value)} />
                    </div>
                    <div className="ps-two">
                      <input className="ps-in" type="date" value={prepBirth} onChange={(e) => setPrepBirth(e.target.value)} />
                      <input className="ps-in" placeholder="Email (optionnel)" value={prepEmail} onChange={(e) => setPrepEmail(e.target.value)} />
                    </div>
                    <div className="ps-foot" style={{ border: 0, paddingTop: 0 }}>
                      <button type="button" className="ps-btn ghost" onClick={() => setAddPanel(null)}>Annuler</button>
                      <button type="button" className="ps-btn primary" onClick={() => void submitPrepared()}>Pré-inscrire</button>
                    </div>
                    <p className="ps-sub">Si la personne est déjà sur Kinship, son compte sera retrouvé automatiquement.</p>
                    <p className="ps-sub">Pour faire co-attester le projet par une personne ou un partenaire sans compte : ne la pré-inscrivez pas — cela se fera à la clôture du projet.</p>
                  </div>
                )}
                <p className="ps-sub">
                  {isDraft ? 'Préparés — ils ne voient rien avant la création.' : 'Les demandes en attente restent au niveau de la vue d’ensemble.'}
                </p>
              </section>

              <section className="ps-sec">
                <h2>
                  Partenaires ({partners.length})
                  {!isEnded && (
                    <button type="button" className={`ps-add ${addPanel === 'partner' ? 'on' : ''}`} onClick={() => setAddPanel(addPanel === 'partner' ? null : 'partner')}>
                      + Ajouter un partenaire
                    </button>
                  )}
                </h2>
                {partners.map((p) => (
                  <div key={p.id} className="ps-prow">
                    <div className="ps-pdot">{initialsOf(p.organization || p.name)}</div>
                    <div>{p.organization || p.name} <small>· {isDraft ? 'préparé — la demande partira à la création' : 'partenaire'}</small></div>
                  </div>
                ))}
                {addPanel === 'partner' && (
                  <div className="ps-panel">
                    <div className="ps-steps" style={{ marginTop: 0 }}>Étape 1 — le type de partenariat, d’abord</div>
                    <div className="ps-pick sel">Partenariat administratif <small>· co-responsable avec commandes</small></div>
                    <div className="ps-pick off">Partenariat élargi — bientôt</div>
                    <div className="ps-steps">Votre réseau, puis la recherche dès la première lettre</div>
                    <input className="ps-in" value={partnerQuery} onChange={(e) => setPartnerQuery(e.target.value)} placeholder="Rechercher…" />
                    {filteredPartnerships.map((p) => {
                      const label = p.name || p.partners?.map((x) => x.name).join(' · ') || `Partenariat #${p.id}`;
                      const already = partners.some((x) => x.id === String(p.id));
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`ps-pick ${selectedPartnershipId === String(p.id) ? 'sel' : ''}`}
                          onClick={() => setSelectedPartnershipId(String(p.id))}
                        >
                          <div className="ps-pdot">{initialsOf(label)}</div>
                          <div>{label} {already && <small> · déjà partenaire — ajouter un autre co-responsable</small>}</div>
                        </button>
                      );
                    })}
                    <div className="ps-info">
                      <b>Les co-responsables peuvent :</b> voir le projet dans leur profil · ajouter des membres de leur organisation uniquement · attester des compétences · plus tard : confier des tâches.
                    </div>
                    <div className="ps-foot" style={{ border: 0, paddingTop: 8 }}>
                      <button type="button" className="ps-btn ghost" onClick={() => setAddPanel(null)}>Annuler</button>
                      <button type="button" className="ps-btn primary" disabled={!selectedPartnershipId} onClick={() => void addPartner()}>Ajouter</button>
                    </div>
                  </div>
                )}
                <p className="ps-sub">Un financeur n’est pas un partenaire.</p>
              </section>

              <section className="ps-sec">
                <h2>
                  Financeurs ({funders.length})
                  {!isEnded && (
                    <button type="button" className={`ps-add ${addPanel === 'funder' ? 'on' : ''}`} onClick={() => setAddPanel(addPanel === 'funder' ? null : 'funder')}>
                      + Ajouter un financeur
                    </button>
                  )}
                </h2>
                {funders.map((f) => (
                  <div key={f.id} className="ps-prow">
                    <div className="ps-pdot funder">{f.initials || initialsOf(f.name)}</div>
                    <div>
                      {f.name}{' '}
                      <small>· {funderStatusLabel(f)}</small>
                    </div>
                    {!isEnded && project.status !== 'in_progress' && (
                      <button
                        type="button"
                        className="ps-retir"
                        onClick={() => void removeFunder(f.id)}
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                ))}
                {addPanel === 'funder' && (
                  <div className="ps-panel">
                    <div className="ps-steps" style={{ marginTop: 0 }}>Vos financeurs — rattachés à votre structure</div>
                    {attachedFunders.length === 0 && <p className="ps-sub">Le rattachement financeur se demande et s’approuve dans l’espace partenariat.</p>}
                    {attachedFunders.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="ps-pick"
                        onClick={() => {
                          if (a.funder_company?.name) setFunderQuery(a.funder_company.name);
                        }}
                      >
                        <div className="ps-pdot funder">{initialsOf(a.funder_company?.name ?? '')}</div>
                        {a.funder_company?.name}
                      </button>
                    ))}
                    <div className="ps-divider">ou</div>
                    <div className="ps-steps">Rechercher une organisation sur Kinship</div>
                    <input className="ps-in" value={funderQuery} onChange={(e) => setFunderQuery(e.target.value)} placeholder="Fondation…" />
                    <p className="ps-sub">Pas encore rattachée : elle sera ajoutée à ce projet seulement — son lien partira par email et elle retrouvera le projet dans son espace, avec une pastille « À confirmer ».</p>
                    <div className="ps-divider">ou</div>
                    <div className="ps-steps">Il n’est pas sur Kinship ? Entrez son email</div>
                    <input className="ps-in" type="email" value={funderEmail} onChange={(e) => setFunderEmail(e.target.value)} placeholder="contact@financeur.fr" />
                    {matchedFunderOrg ? (
                      <p className="ps-sub">Nous vous proposons <b>{matchedFunderOrg.name}</b> — la désignation la retrouvera directement.</p>
                    ) : (
                      <p className="ps-sub">Si cette adresse correspond à une organisation déjà sur Kinship, nous vous la proposerons — la désignation la retrouvera directement.</p>
                    )}
                    <div className="ps-share">
                      <button type="button" className={funderShare === 'nominatif' ? 'on' : ''} onClick={() => setFunderShare('nominatif')}>nominatif</button>
                      <button type="button" className={funderShare === 'anonyme' ? 'on' : ''} onClick={() => setFunderShare('anonyme')}>anonyme</button>
                      <span className="ps-sub" style={{ margin: 0 }}>— votre choix, jamais implicite</span>
                    </div>
                    <div className="ps-banner">Il recevra l’information du démarrage par email. <b>Vous êtes responsable de ce partage.</b></div>
                    <p className="ps-sub"><b>Le fil :</b> au démarrage — informé + lien de suivi · à la clôture — le rapport. En brouillon : tout se prépare, rien ne part.</p>
                    <div className="ps-foot" style={{ border: 0, paddingTop: 8 }}>
                      <button type="button" className="ps-btn ghost" onClick={() => setAddPanel(null)}>Annuler</button>
                      <button type="button" className="ps-btn primary" onClick={() => void addFunder()}>Ajouter</button>
                    </div>
                  </div>
                )}
                <p className="ps-sub">
                  {isDraft
                    ? 'S’ajoute dès le brouillon — rien ne part avant la création.'
                    : 'Un financeur n’est pas un partenaire : il suit, il n’agit pas. Plusieurs financeurs possibles — chacun son lien. L’ajout vit ici et sur l’affiche (porteur seul) — le retrait, jusqu’au démarrage.'}
                </p>
              </section>

              <section className="ps-sec">
                <h2>
                  Documents ({mediaCount})
                  {!isEnded && (
                    <button type="button" className={`ps-add ${addPanel === 'media' ? 'on' : ''}`} onClick={() => setAddPanel(addPanel === 'media' ? null : 'media')}>
                      + Ajouter
                    </button>
                  )}
                </h2>
                <div className="ps-docs">
                  {documents.map((d) => {
                    const isPublic = d.visibility === 'public';
                    return (
                      <div key={d.id} className="ps-docrow">
                        <span className="ps-doc">📄 {d.filename}</span>
                        {!isEnded ? (
                          <div className="ps-share ps-docvis">
                            <button
                              type="button"
                              className={!isPublic ? 'on' : ''}
                              aria-pressed={!isPublic}
                              onClick={() => void setDocumentVisibility(d.id, 'private')}
                            >
                              Privé
                            </button>
                            <button
                              type="button"
                              className={isPublic ? 'on' : ''}
                              aria-pressed={isPublic}
                              onClick={() => void setDocumentVisibility(d.id, 'public')}
                            >
                              Public
                            </button>
                          </div>
                        ) : (
                          <span className={`ps-docpill ${isPublic ? 'pub' : 'priv'}`}>{isPublic ? 'Public' : 'Privé'}</span>
                        )}
                      </div>
                    );
                  })}
                  {links.map((l: any) => (
                    <span key={l.id} className="ps-doc">🔗 {l.name || l.url}</span>
                  ))}
                </div>
                {addPanel === 'media' && (
                  <div className="ps-panel">
                    <div className="ps-plabel">Ajouter un lien</div>
                    <input className="ps-in" placeholder="Libellé — ex. « La radio du quartier »" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                    <input className="ps-in" placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                    <button type="button" className="ps-btn outline" onClick={() => void addLink()} disabled={!linkUrl.trim()}>Ajouter le lien</button>
                    <div className="ps-plabel" style={{ marginTop: 12 }}>Ajouter un document ({documents.length}/5)</div>
                    <div className="ps-share">
                      <button type="button" className={uploadDocVis === 'private' ? 'on' : ''} onClick={() => setUploadDocVis('private')}>
                        Privé — ma structure
                      </button>
                      <button type="button" className={uploadDocVis === 'public' ? 'on' : ''} onClick={() => setUploadDocVis('public')}>
                        Public — tout Kinship
                      </button>
                    </div>
                    <p className="ps-sub">Privé : l’équipe du projet. Public : visible sur l’affiche (suit la visibilité du projet).</p>
                    <input
                      className="ps-in"
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void addDocument(file);
                      }}
                    />
                    <p className="ps-sub">1 Mo par fichier · 5 fichiers max — votre fichier sera compressé automatiquement.</p>
                  </div>
                )}
              </section>

              {isCreated && (
                <button
                  type="button"
                  className="ps-tile"
                  onClick={() => {
                    setSelectedProject(project);
                    setCurrentPage('project-management');
                    navigate('/project-management');
                  }}
                >
                  <div className="big">{project.badges || 0}</div>
                  <div>
                    <div className="tl">Preuves de compétences</div>
                    <div className="ps-sub" style={{ margin: 0 }}>attestation directe · retrait · récap · vue d’ensemble</div>
                  </div>
                  <div className="go">Gérer →</div>
                </button>
              )}

              {isDraft && (
                <div className="ps-foot">
                  <div className="ps-fcol">
                    <button type="button" className="ps-btn outline" disabled={saving} onClick={saveInformations}>
                      {saving ? 'Enregistrement…' : 'Sauvegarder le brouillon'}
                    </button>
                    <p className="ps-micro">Vous seul y accédez — les co-responsables et vos partenaires y accéderont une fois le projet créé.</p>
                  </div>
                  <div className="ps-fcol">
                    <button type="button" className="ps-btn primary" disabled={saving} onClick={() => void createFromDraft()}>
                      Créer le projet
                    </button>
                    <p className="ps-micro"><b>Privé par défaut : visible par votre structure seulement.</b></p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSpacePage;
