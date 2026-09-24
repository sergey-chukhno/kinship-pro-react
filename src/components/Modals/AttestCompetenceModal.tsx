import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BadgeAttribution, BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges, assignBadge, getProjectBadges } from '../../api/Badges';
import { isSeriesWithAxes, getAxesForSeries, getBadgeNamesForAxe } from '../../constants/badgeAxes';
import { isSingleSelectCompetenceSeries } from '../../utils/badgeAssignmentCompetenceSelection';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../api/config';
import {
  getBadgeDisplayName,
  getBadgeCompetencies,
  getCompetencyDisplayName,
} from './BadgeAssignmentModal';
import './Modal.css';
import './BadgeAssignmentModal.css';

interface AttestCompetenceModalProps {
  onClose: () => void;
  onAssign: (badgeData: BadgeAttribution) => void;
  participants: {
    id: string;
    memberId: string;
    name: string;
    avatar: string;
    organization?: string;
  }[];
  preselectedParticipant?: string | null;
  projectId?: string;
  projectTitle?: string;
  availableOrganizations?: Array<{
    id: number;
    name: string;
    type: 'School' | 'Company';
    role?: string;
  }>;
}

type CompetenceDraft = {
  name: string;
  level: string;
  expanded: boolean;
  expertiseIds: number[];
  comment: string;
  file: File | null;
  fileName: string;
};

type FrozenProof = {
  name: string;
  level: string;
  date?: string;
};

// Constat ajusté individuellement (mode « participant par participant », écran 8).
type ParticipantConstat = {
  expertiseIds: number[];
  comment: string;
  file: File | null;
  fileName: string;
};

const CATALOGUE_MARKERS = [
  'digcomp',
  'psychosocial',
  'toukouleur',
  'parcours des possibles',
  'audiovisuelle',
  'parcours professionnel',
  'métiers de la mer',
  "s'orienter",
  'soft skills',
];

const PARTICIPANTS_INITIAL_COUNT = 8;

const chipName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

// « Léa M., Amir B. et Chloé D. » — recap groupé du constat (écran 5, mode groupe).
const joinFr = (names: string[]): string => {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
};

const seriesProvenance = (series: string): 'own' | 'catalogue' => {
  const n = series.toLowerCase();
  return CATALOGUE_MARKERS.some((m) => n.includes(m)) ? 'catalogue' : 'own';
};

const commentRequiredFor = (badge: BadgeAPI): boolean => {
  if (badge.series === 'Série Audiovisuelle' && (badge.level === 'level_3' || badge.level === 'level_4')) return true;
  if (badge.series === 'Série TouKouLeur' && badge.level === 'level_3') return true;
  return badge.level === 'level_2';
};

const documentRequiredFor = (badge: BadgeAPI): boolean => {
  if (badge.series === 'Série Audiovisuelle' && (badge.level === 'level_3' || badge.level === 'level_4')) return true;
  if (badge.series === 'Série TouKouLeur' && badge.level === 'level_3') return true;
  return false;
};

const AttestCompetenceModal: React.FC<AttestCompetenceModalProps> = ({
  onClose,
  onAssign,
  participants,
  preselectedParticipant,
  projectId,
  projectTitle,
  availableOrganizations,
}) => {
  const { state } = useAppContext();
  const { showWarning: showWarningToast, showError: showErrorToast, showSuccess: showSuccessToast } = useToast();
  const isIndividual = Boolean(preselectedParticipant);

  const [series, setSeries] = useState('');
  const [seriesQuery, setSeriesQuery] = useState('');
  const [showAllCompetences, setShowAllCompetences] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, CompetenceDraft>>({});
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    preselectedParticipant ? [preselectedParticipant] : []
  );
  const [participantsSearchTerm, setParticipantsSearchTerm] = useState('');
  const [participantsExpanded, setParticipantsExpanded] = useState(false);
  const [commentaire, setCommentaire] = useState('');
  const [fichier, setFichier] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<number | undefined>(undefined);
  const [selon, setSelon] = useState<'project' | 'event'>('project');
  const [eventId, setEventId] = useState<number | undefined>(undefined);
  const [eventOpen, setEventOpen] = useState(false);
  const [commentFieldOpen, setCommentFieldOpen] = useState(false);
  const [proofFieldOpen, setProofFieldOpen] = useState(false);
  const [projectEvents, setProjectEvents] = useState<Array<{ id: number; title: string; date?: string }>>([]);
  const [frozen, setFrozen] = useState<FrozenProof[]>([]);
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successState, setSuccessState] = useState<{ count: number; badgeName: string } | null>(null);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [constatMode, setConstatMode] = useState<'groupe' | 'individuel'>('groupe');
  const [individualDrafts, setIndividualDrafts] = useState<Record<string, ParticipantConstat>>({});
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);

  const displaySeries = useCallback((seriesName: string) => {
    return seriesName.toLowerCase().includes('toukouleur') ? 'Série Soft Skills 4LAB' : seriesName;
  }, []);

  useEffect(() => {
    if (preselectedParticipant) setSelectedParticipants([preselectedParticipant]);
  }, [preselectedParticipant]);

  useEffect(() => {
    const fetchBadges = async () => {
      setLoadingBadges(true);
      try {
        setBadges(await getBadges());
      } catch {
        showErrorToast('Erreur lors du chargement des compétences');
      } finally {
        setLoadingBadges(false);
      }
    };
    void fetchBadges();
    // Fetch once on open — toast helpers are a new reference every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void apiClient
      .get(`/api/v1/projects/${projectId}/events`)
      .then((res) => {
        const list = res.data?.data ?? res.data ?? [];
        setProjectEvents(Array.isArray(list) ? list : []);
      })
      .catch(() => setProjectEvents([]));
  }, [projectId]);

  useEffect(() => {
    if (!isIndividual || !projectId || !preselectedParticipant) return;
    void getProjectBadges(Number(projectId), 1, 50, { receiver_query: undefined })
      .then((res) => {
        const rows = (res.data || [])
          .filter((item: any) => String(item.receiver?.id || item.receiver_id) === String(preselectedParticipant))
          .map((item: any) => {
            const badge = item.badge || {};
            const date = item.assigned_at || item.created_at;
            return {
              name: badge.name || 'Compétence',
              level: badge.level ? String(badge.level).replace('level_', '') : '1',
              date: date ? new Date(date).toLocaleDateString('fr-FR') : undefined,
            } as FrozenProof;
          });
        setFrozen(rows);
      })
      .catch(() => setFrozen([]));
  }, [isIndividual, projectId, preselectedParticipant]);

  const organizationsForSelection = useMemo(() => {
    if (availableOrganizations && availableOrganizations.length > 0) return availableOrganizations;
    const contexts = state.user?.available_contexts;
    const orgs: Array<{ id: number; name: string; type: 'School' | 'Company'; role?: string }> = [];
    const badgeRoles = ['superadmin', 'admin', 'referent', 'référent', 'intervenant'];
    contexts?.schools?.forEach((school: any) => {
      if (badgeRoles.includes(school.role?.toLowerCase() || '')) {
        orgs.push({ id: school.id, name: school.name || 'École', type: 'School', role: school.role });
      }
    });
    contexts?.companies?.forEach((company: any) => {
      if (badgeRoles.includes(company.role?.toLowerCase() || '')) {
        orgs.push({ id: company.id, name: company.name || 'Organisation', type: 'Company', role: company.role });
      }
    });
    return orgs;
  }, [availableOrganizations, state.user?.available_contexts]);

  useEffect(() => {
    if (organizationsForSelection.length === 1) {
      setSelectedOrganizationId(organizationsForSelection[0].id);
    }
  }, [organizationsForSelection]);

  const badgesBySeries = useMemo(() => {
    const organized: { [series: string]: BadgeAPI[] } = {};
    badges.forEach((badge) => {
      if (!organized[badge.series]) organized[badge.series] = [];
      organized[badge.series].push(badge);
    });
    return organized;
  }, [badges]);

  const availableSeries = useMemo(() => Object.keys(badgesBySeries), [badgesBySeries]);

  useEffect(() => {
    if (!series && availableSeries.length === 1) setSeries(availableSeries[0]);
  }, [availableSeries, series]);

  const groupedSeries = useMemo(() => {
    const q = seriesQuery.trim().toLowerCase();
    const list = availableSeries.filter((s) => !q || displaySeries(s).toLowerCase().includes(q) || s.toLowerCase().includes(q));
    return {
      own: list.filter((s) => seriesProvenance(s) === 'own'),
      catalogue: list.filter((s) => seriesProvenance(s) === 'catalogue'),
    };
  }, [availableSeries, seriesQuery, displaySeries]);

  const seriesBadges = useMemo(() => {
    return (badgesBySeries[series] || []).filter((b) => b.name !== 'Test Badge');
  }, [badgesBySeries, series]);

  const competenceNames = useMemo(() => {
    const names: string[] = [];
    seriesBadges.forEach((b) => {
      if (!names.includes(b.name)) names.push(b.name);
    });
    return names;
  }, [seriesBadges]);

  const frozenNames = useMemo(() => new Set(frozen.map((f) => f.name)), [frozen]);

  const visibleNames = useMemo(() => {
    const rest = competenceNames.filter((n) => !frozenNames.has(n));
    if (showAllCompetences || rest.length <= 4) return rest;
    const selected = rest.filter((n) => drafts[n]);
    const others = rest.filter((n) => !drafts[n]);
    return [...selected, ...others].slice(0, Math.max(4, selected.length));
  }, [competenceNames, frozenNames, showAllCompetences, drafts]);

  const levelsFor = useCallback(
    (name: string): string[] => {
      const levels = seriesBadges
        .filter((b) => b.name === name)
        .map((b) => b.level.replace('level_', ''))
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();
      return levels.length ? levels : ['1'];
    },
    [seriesBadges]
  );

  const badgeFor = useCallback(
    (name: string, level: string): BadgeAPI | undefined =>
      seriesBadges.find((b) => b.name === name && b.level === `level_${level}`),
    [seriesBadges]
  );

  const competenceRecap = (draft: CompetenceDraft, badge: BadgeAPI | undefined) => {
    if (!badge) return null;
    const comps = getBadgeCompetencies(badge);
    if (comps.length === 0) return null;
    // V1.1 (décision du 17/09) : la règle de complétion est retirée — un seul
    // item coché suffit, la même règle pour toutes les séries.
    return {
      checked: draft.expertiseIds.length,
      total: comps.length,
      comps,
    };
  };

  // V1.1 : un geste = une compétence observée à la fois — la sélection de la
  // compétence (avec son niveau) se fait à l'étape « Compétence » du tunnel
  // (voir selectCompetence plus bas, écran Compétence) ; ici on garde la
  // validation, le "tout cocher" et le fil des items (partagés entre écrans).
  const toggleExpertise = (name: string, expertiseId: number, single: boolean) => {
    setDrafts((prev) => {
      const cur = prev[name];
      if (!cur) return prev;
      const nextIds = single
        ? [expertiseId]
        : cur.expertiseIds.includes(expertiseId)
          ? cur.expertiseIds.filter((id) => id !== expertiseId)
          : [...cur.expertiseIds, expertiseId];
      return { ...prev, [name]: { ...cur, expertiseIds: nextIds, expanded: true } };
    });
  };

  // « Tout cocher », avec rappel du nombre à gauche — présent sur tous les
  // écrans de constat, quelle que soit la longueur de la liste (V1.1, écran 5).
  const toggleAllExpertise = (name: string, allIds: number[], currentIds: number[]) => {
    setDrafts((prev) => {
      const cur = prev[name];
      if (!cur) return prev;
      const nextIds = currentIds.length === allIds.length ? [] : allIds;
      return { ...prev, [name]: { ...cur, expertiseIds: nextIds, expanded: true } };
    });
  };

  // Ajuster participant par participant (écran 8) : même logique de case à
  // cocher que le mode groupe, mais un jeu d'items propre à chaque personne.
  const toggleIndividualExpertise = (participantId: string, expertiseId: number, single: boolean) => {
    setIndividualDrafts((prev) => {
      const cur = prev[participantId];
      if (!cur) return prev;
      const nextIds = single
        ? [expertiseId]
        : cur.expertiseIds.includes(expertiseId)
          ? cur.expertiseIds.filter((id) => id !== expertiseId)
          : [...cur.expertiseIds, expertiseId];
      return { ...prev, [participantId]: { ...cur, expertiseIds: nextIds } };
    });
  };

  const toggleAllIndividualExpertise = (participantId: string, allIds: number[], currentIds: number[]) => {
    setIndividualDrafts((prev) => {
      const cur = prev[participantId];
      if (!cur) return prev;
      const nextIds = currentIds.length === allIds.length ? [] : allIds;
      return { ...prev, [participantId]: { ...cur, expertiseIds: nextIds } };
    });
  };


  // V1.1 (décision du 17/09) : toute règle de complétion est retirée. Chaque
  // item constaté produit sa preuve, quel qu'il soit et quels que soient les
  // autres — la même règle pour toutes les séries : il suffit d'en cocher un.
  const validateLocal = (
    selectedExpertiseIds: number[],
    _badge: BadgeAPI,
    _allExpertises: Array<{ id: number; name: string }>
  ) => {
    return selectedExpertiseIds.length >= 1
      ? { isValid: true, errorMessage: null }
      : { isValid: false, errorMessage: 'Cochez au moins un item constaté.' };
  };

  const filteredParticipants = useMemo(() => {
    const term = participantsSearchTerm.trim().toLowerCase();
    if (!term) return participants;
    return participants.filter(
      (p) => (p.name || '').toLowerCase().includes(term) || (p.organization || '').toLowerCase().includes(term)
    );
  }, [participants, participantsSearchTerm]);

  const toggleParticipant = (memberId: string) => {
    if (isIndividual) return;
    setSelectedParticipants((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
  };

  const selectAllParticipants = () => {
    setSelectedParticipants(filteredParticipants.map((p) => p.memberId));
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
  };

  // ---- Assistant V1.1 : un ecran par etape, un clic sur une ligne avance ----
  type WizardStepKey = 'serie' | 'axe' | 'competence' | 'participants' | 'constat';

  const stepDefs: { key: WizardStepKey; label: string }[] = useMemo(() => {
    const base: { key: WizardStepKey; label: string }[] = [
      { key: 'serie', label: 'Série' },
      { key: 'axe', label: 'Axe' },
      { key: 'competence', label: 'Compétence' },
      { key: 'participants', label: 'Participants' },
      { key: 'constat', label: 'Constat' },
    ];
    return isIndividual ? base.filter((s) => s.key !== 'participants') : base;
  }, [isIndividual]);

  // Une seule série disponible : cet écran n'existe pas (V1.1, écran 1).
  const hasSerieScreen = availableSeries.length !== 1;
  const firstStep: WizardStepKey = hasSerieScreen ? 'serie' : isSeriesWithAxes(series) ? 'axe' : 'competence';

  const [step, setStep] = useState<WizardStepKey>(firstStep);
  const [selectedAxe, setSelectedAxe] = useState<string | null>(null);
  const [expandedCompetence, setExpandedCompetence] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSerieScreen && series && step === 'serie') {
      setStep(isSeriesWithAxes(series) ? 'axe' : 'competence');
    }
  }, [hasSerieScreen, series, step]);

  const currentStepIndex = stepDefs.findIndex((s) => s.key === step);

  // Écran 11 : sortie en cours de liste. On ne redemande rien tant que rien
  // n'a été engagé (premier écran) ni après une attestation déjà produite.
  const hasProgress = !successState && currentStepIndex > 0;
  const requestClose = () => {
    if (hasProgress) {
      setCloseConfirmOpen(true);
      return;
    }
    onClose();
  };

  const chooseSeries = (s: string) => {
    setSeries(s);
    setDrafts({});
    setSelectedAxe(null);
    setExpandedCompetence(null);
    setShowAllCompetences(false);
    setSeriesQuery('');
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
    setStep(isSeriesWithAxes(s) ? 'axe' : 'competence');
  };

  // Choisir une compétence (et son niveau) affiche ses items juste en
  // dessous, sur le même écran (niveau + skills ensemble) -- on ne part plus
  // des participants avant d'avoir vu ce qu'il y a à cocher. On avance
  // explicitement (bouton Continuer) une fois au moins un item coché.
  const selectCompetence = (name: string, level: string) => {
    setDrafts((prev) => {
      if (prev[name] && prev[name].level === level) return prev;
      const badge = badgeFor(name, level);
      const comps = badge ? getBadgeCompetencies(badge) : [];
      return {
        [name]: { name, level, expanded: comps.length > 0, expertiseIds: [], comment: '', file: null, fileName: '' },
      };
    });
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
  };

  const goBack = () => {
    if (step === 'axe') {
      setStep('serie');
      return;
    }
    if (step === 'competence') {
      setStep(isSeriesWithAxes(series) ? 'axe' : 'serie');
      return;
    }
    if (step === 'participants') {
      setStep('competence');
      return;
    }
    if (step === 'constat') {
      setConstatMode('groupe');
      setIndividualDrafts({});
      setActiveParticipantId(null);
      setStep(isIndividual ? 'competence' : 'participants');
      return;
    }
  };

  const selectedOrgName = useMemo(() => {
    if (selectedOrganizationId) {
      return organizationsForSelection.find((o) => o.id === selectedOrganizationId)?.name;
    }
    return organizationsForSelection[0]?.name;
  }, [organizationsForSelection, selectedOrganizationId]);

  const selectedDraftList = Object.values(drafts);
  const pickedName = selectedDraftList[0]?.name;
  const pickedDraft = pickedName ? drafts[pickedName] : undefined;
  const pickedBadge = pickedDraft ? badgeFor(pickedDraft.name, pickedDraft.level) : undefined;
  const pickedComps = pickedBadge ? getBadgeCompetencies(pickedBadge) : [];
  const canContinueFromCompetence = Boolean(pickedDraft) && (pickedComps.length === 0 || pickedDraft!.expertiseIds.length > 0);

  const selectedBadges = selectedDraftList
    .map((d) => badgeFor(d.name, d.level))
    .filter((b): b is BadgeAPI => Boolean(b));

  const massNeedsComment = !isIndividual && selectedBadges.some(commentRequiredFor);
  const massNeedsDoc = !isIndividual && selectedBadges.some(documentRequiredFor);
  const massRecommendsDoc = !isIndividual && selectedBadges.some((b) => b.level === 'level_2');

  const proofCount = selectedParticipants.length * selectedDraftList.length;
  const selectedParticipantNames = selectedParticipants.map((id) => {
    const p = participants.find((pp) => pp.memberId === id);
    return p ? chipName(p.name) : '';
  }).filter(Boolean);
  const preselectedPerson = participants.find((p) => p.memberId === preselectedParticipant);

  // Écran 8 : « Ajuster participant par participant ». Le groupe reste la
  // valeur par défaut ; ce lien fait bifurquer vers une séquence individuelle,
  // amorcée avec ce qui était coché en commun (rien n'est perdu au basculement).
  const enterIndividualMode = () => {
    if (!pickedDraft) return;
    const base: ParticipantConstat = {
      expertiseIds: pickedDraft.expertiseIds,
      comment: commentaire,
      file: fichier,
      fileName,
    };
    const next: Record<string, ParticipantConstat> = {};
    selectedParticipants.forEach((id) => {
      next[id] = { ...base };
    });
    setIndividualDrafts(next);
    setActiveParticipantId(selectedParticipants[0] || null);
    setConstatMode('individuel');
  };

  const exitIndividualMode = () => {
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
  };

  // Écran 7 : enchaînement après succès. On repart du même projet/organisation,
  // sans tout refermer -- deux raccourcis courants plutôt qu'un retour à zéro.
  const resetConstatExtras = () => {
    setConstatMode('groupe');
    setIndividualDrafts({});
    setActiveParticipantId(null);
    setCommentaire('');
    setFichier(null);
    setFileName('');
    setCommentFieldOpen(false);
    setProofFieldOpen(false);
    setSelon('project');
    setEventId(undefined);
    setEventOpen(false);
  };

  const handleOtherCompetence = () => {
    setSuccessState(null);
    setDrafts({});
    setExpandedCompetence(null);
    resetConstatExtras();
    setStep(isSeriesWithAxes(series) ? 'axe' : 'competence');
  };

  const handleSameCompetenceOtherParticipants = () => {
    setSuccessState(null);
    setSelectedParticipants([]);
    setParticipantsSearchTerm('');
    setParticipantsExpanded(false);
    resetConstatExtras();
    setStep('participants');
  };

  const namesForCompetenceStep = useMemo(() => {
    if (isSeriesWithAxes(series) && selectedAxe) {
      return competenceNames.filter((n) => getBadgeNamesForAxe(series, selectedAxe).includes(n) && !frozenNames.has(n));
    }
    return visibleNames;
  }, [series, selectedAxe, competenceNames, frozenNames, visibleNames]);

  const handleSubmit = async () => {
    if (selectedDraftList.length === 0) {
      showWarningToast('Cochez au moins une compétence');
      return;
    }
    if (selectedParticipants.length === 0) {
      showWarningToast('Veuillez sélectionner au moins un participant');
      return;
    }
    if (!projectId) {
      showErrorToast('ID du projet manquant');
      return;
    }
    if (organizationsForSelection.length > 1 && !selectedOrganizationId) {
      showWarningToast('Veuillez sélectionner une organisation');
      return;
    }

    const useIndividualConstats = !isIndividual && constatMode === 'individuel';

    for (const draft of selectedDraftList) {
      const badge = badgeFor(draft.name, draft.level);
      if (!badge) {
        showWarningToast(`Niveau indisponible pour « ${getBadgeDisplayName(draft.name)} »`);
        return;
      }
      const comps = getBadgeCompetencies(badge);

      if (useIndividualConstats) {
        for (const pid of selectedParticipants) {
          const pd = individualDrafts[pid];
          const pLabel = (() => {
            const p = participants.find((x) => x.memberId === pid);
            return p ? chipName(p.name) : 'ce participant';
          })();
          if (comps.length > 0) {
            const validation = validateLocal(pd?.expertiseIds || [], badge, comps);
            if (!validation.isValid && validation.errorMessage) {
              showWarningToast(`${pLabel} — ${getBadgeDisplayName(draft.name)} : ${validation.errorMessage}`);
              return;
            }
          }
          if (documentRequiredFor(badge) && !pd?.file) {
            showWarningToast(`Joignez un document pour ${pLabel}`);
            return;
          }
          if (commentRequiredFor(badge)) {
            const text = (pd?.comment || '').trim();
            if (!text) {
              showWarningToast(`Le commentaire est obligatoire pour ${pLabel}`);
              return;
            }
            if (badge.series === 'Série TouKouLeur' && badge.level === 'level_3' && text.length < 100) {
              showWarningToast('Le commentaire doit contenir au moins 100 caractères pour le niveau 3 de la Série Soft Skills 4LAB');
              return;
            }
          }
        }
        continue;
      }

      if (comps.length > 0) {
        const validation = validateLocal(draft.expertiseIds, badge, comps);
        if (!validation.isValid && validation.errorMessage) {
          showWarningToast(`${getBadgeDisplayName(draft.name)} : ${validation.errorMessage}`);
          return;
        }
      }
      if (documentRequiredFor(badge)) {
        const file = isIndividual ? draft.file : fichier;
        if (!file) {
          showWarningToast(`Joignez un document pour ${getBadgeDisplayName(draft.name)}`);
          return;
        }
      }
      if (commentRequiredFor(badge)) {
        const text = (isIndividual ? draft.comment : commentaire).trim();
        if (!text) {
          showWarningToast(`Le commentaire est obligatoire pour ${getBadgeDisplayName(draft.name)}`);
          return;
        }
        if (badge.series === 'Série TouKouLeur' && badge.level === 'level_3' && text.length < 100) {
          showWarningToast('Le commentaire doit contenir au moins 100 caractères pour le niveau 3 de la Série Soft Skills 4LAB');
          return;
        }
      }
    }

    const recipientIds = selectedParticipants
      .map((id) => {
        const p = participants.find((x) => x.memberId === id);
        return p ? parseInt(p.memberId, 10) : null;
      })
      .filter((id): id is number => id !== null);

    setSubmitting(true);
    try {
      let assigned = 0;
      let lastBadge: BadgeAPI | null = null;

      if (useIndividualConstats) {
        for (const draft of selectedDraftList) {
          const badge = badgeFor(draft.name, draft.level);
          if (!badge) continue;
          lastBadge = badge;
          for (const pid of selectedParticipants) {
            const pd = individualDrafts[pid];
            const p = participants.find((x) => x.memberId === pid);
            if (!p) continue;
            const validExpertiseIds = (pd?.expertiseIds || []).filter((id) => id > 0);
            const response = await assignBadge(
              parseInt(projectId, 10),
              {
                badge_id: badge.id,
                recipient_ids: [parseInt(p.memberId, 10)],
                badge_skill_ids: validExpertiseIds.length > 0 ? validExpertiseIds : undefined,
                comment: pd?.comment || undefined,
                organization_id: selectedOrganizationId,
                event_id: selon === 'event' ? eventId : undefined,
              },
              pd?.file ? [pd.file] : undefined
            );
            assigned += response.assigned_count || 1;
          }
        }
      } else {
        for (const draft of selectedDraftList) {
          const badge = badgeFor(draft.name, draft.level);
          if (!badge) continue;
          lastBadge = badge;
          const validExpertiseIds = draft.expertiseIds.filter((id) => id > 0);
          const comment = isIndividual ? draft.comment : commentaire;
          const file = isIndividual ? draft.file : fichier;
          const response = await assignBadge(
            parseInt(projectId, 10),
            {
              badge_id: badge.id,
              recipient_ids: recipientIds,
              badge_skill_ids: validExpertiseIds.length > 0 ? validExpertiseIds : undefined,
              comment: comment || undefined,
              organization_id: selectedOrganizationId,
              event_id: selon === 'event' ? eventId : undefined,
            },
            file ? [file] : undefined
          );
          assigned += response.assigned_count || recipientIds.length;
        }
      }

      showSuccessToast(
        assigned > 1
          ? `${assigned} preuves de compétences produites — une par personne, portant les constats cochés.`
          : `Preuve de compétences produite pour « ${lastBadge ? getBadgeDisplayName(lastBadge.name) : 'la compétence'} ».`
      );

      const selectedParticipant = participants.find((p) => p.memberId === selectedParticipants[0]);
      if (selectedParticipant && lastBadge) {
        onAssign({
          id: `badge-${Date.now()}`,
          badgeId: lastBadge.id.toString(),
          badgeTitle: lastBadge.name,
          badgeSeries: lastBadge.series,
          badgeLevel: lastBadge.level.replace('level_', ''),
          badgeImage: lastBadge.image_url || '/TouKouLeur-Jaune.png',
          participantId: selectedParticipant.memberId,
          participantName: selectedParticipant.name,
          participantAvatar: selectedParticipant.avatar,
          participantOrganization: selectedParticipant.organization || 'Non spécifiée',
          attributedBy: state.user?.id?.toString() || '',
          attributedByName: state.user?.name || '',
          attributedByAvatar: state.user?.avatar || '',
          attributedByOrganization: state.user?.organization || 'Non spécifiée',
          projectId,
          projectTitle: projectTitle || '',
          domaineEngagement: '',
          commentaire: commentaire || undefined,
          dateAttribution: new Date().toISOString(),
        });
      }
      setSuccessState({ count: assigned, badgeName: lastBadge ? getBadgeDisplayName(lastBadge.name) : 'la compétence' });
    } catch (error: any) {
      const apiMessage = error.response?.data?.message || error.response?.data?.error;
      showErrorToast(apiMessage || "Erreur lors de l'attestation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="badge-assignment-modal-overlay" onClick={requestClose}>
      <div className="att-modal" role="dialog" aria-modal="true" aria-labelledby="att-title" onClick={(e) => e.stopPropagation()}>
        <div className="att-topbar">
          <div className="att-logo">K</div>
          <h2 id="att-title" className="att-topbar-title">Attester une compétence</h2>
          <div className="att-topbar-org">
            <div className="att-org-name">{isIndividual ? preselectedPerson?.name || 'Participant' : selectedOrgName || 'Votre structure'}</div>
            <div className="att-org-project">
              {isIndividual ? preselectedPerson?.organization || projectTitle || 'Projet' : `projet « ${projectTitle || 'Projet'} »`}
            </div>
          </div>
          <button type="button" className="att-close" onClick={requestClose} aria-label="Fermer">×</button>
        </div>
        {!successState && (
        <div className="att-steps">
          {stepDefs.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <span className="att-step-sep">—</span>}
              <span className={`att-step ${i < currentStepIndex ? 'done' : i === currentStepIndex ? 'current' : ''}`}>
                <span className="num">{i + 1}</span> {s.label}
              </span>
            </React.Fragment>
          ))}
        </div>
        )}

        {!successState && currentStepIndex === 0 && organizationsForSelection.length > 1 && (
          <div className="att-org-picker">
            <div className="att-slab">L’organisation</div>
            <select
              className="att-org"
              value={selectedOrganizationId || ''}
              onChange={(e) => setSelectedOrganizationId(parseInt(e.target.value, 10))}
            >
              <option value="">Sélectionner une organisation</option>
              {organizationsForSelection.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="att-body">
          {successState && (
            <div className="att-success">
              <div className="att-success-icon">✓</div>
              <div className="att-success-title">
                {successState.count > 1
                  ? `${successState.count} preuves de compétences produites`
                  : 'Preuve de compétences produite'}
              </div>
              <p className="att-success-sub">
                {successState.count > 1
                  ? `Une par personne, portant les constats cochés pour « ${successState.badgeName} ».`
                  : `Pour « ${successState.badgeName} ».`}
              </p>
              <div className="att-success-actions">
                {!isIndividual && (
                  <button type="button" className="att-success-btn" onClick={handleSameCompetenceOtherParticipants}>
                    Même compétence, autres participants
                  </button>
                )}
                <button type="button" className="att-success-btn" onClick={handleOtherCompetence}>
                  Autre compétence
                </button>
                <button type="button" className="att-go" onClick={onClose}>
                  Terminé
                </button>
              </div>
            </div>
          )}
          {!successState && step === 'serie' && (
            <>
              <div className="pt-2 att-qline">Dans quelle série ?</div>
              <p className="att-qhelp">Un constat, un ou plusieurs participants.</p>
              {loadingBadges && <p className="att-hint">Chargement…</p>}
              <input
                className="att-search"
                placeholder="Rechercher dès la première lettre…"
                value={seriesQuery}
                onChange={(e) => setSeriesQuery(e.target.value)}
              />
              {groupedSeries.own.length > 0 && <div className="att-grp">Vos séries</div>}
              {groupedSeries.own.map((s) => (
                <button key={s} type="button" className={`att-srow ${s === series ? 'sel' : ''}`} onClick={() => chooseSeries(s)}>
                  {displaySeries(s)}
                  <span className="ct">{s === series ? '✓ choisie' : `${(badgesBySeries[s] || []).length}`}</span>
                </button>
              ))}
              {groupedSeries.catalogue.length > 0 && <div className="att-grp">Catalogue Kinship</div>}
              {groupedSeries.catalogue.map((s) => (
                <button key={s} type="button" className={`att-srow ${s === series ? 'sel' : ''}`} onClick={() => chooseSeries(s)}>
                  {displaySeries(s)}
                  <span className="ct">{s === series ? '✓ choisie' : `${(badgesBySeries[s] || []).length}`}</span>
                </button>
              ))}
              <div className="att-grp">Distribuées par vos autorités</div>
              <p className="att-hint">— apparaissent quand votre structure en reçoit.</p>
            </>
          )}

          {!successState && step === 'axe' && isSeriesWithAxes(series) && (
            <>
              <div className="att-grp">{displaySeries(series)}</div>
              <div className="att-qline">Dans quel axe ?</div>
              <p className="att-qhelp">Plusieurs axes dans cette série.</p>
              {getAxesForSeries(series).map((axe) => {
                const names = competenceNames.filter((n) => getBadgeNamesForAxe(series, axe.title).includes(n) && !frozenNames.has(n));
                if (names.length === 0) return null;
                return (
                  <button
                    key={axe.id}
                    type="button"
                    className={`att-srow ${selectedAxe === axe.title ? 'sel' : ''}`}
                    onClick={() => {
                      setSelectedAxe(axe.title);
                      setStep('competence');
                    }}
                  >
                    {axe.title}
                    <span className="ct">
                      {names.length} compétence{names.length > 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })}
              <div className="att-navbar">
                <button type="button" className="att-back-link" onClick={goBack}>
                  Retour
                </button>
                <span className="att-navhint">un clic sur une ligne passe à l’étape suivante</span>
              </div>
            </>
          )}

          {!successState && step === 'competence' && (
            <>
              {isIndividual && frozen.length > 0 && (
                <>
                  <div className="att-slab">
                    Déjà attesté <span className="n">— figé au geste</span>
                  </div>
                  {frozen.map((f) => (
                    <div key={`${f.name}-${f.level}`} className="att-frozen">
                      <span className="att-ok">✓</span>
                      {getBadgeDisplayName(f.name)}
                      <span className="att-lv">Niveau {f.level}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8f8d86' }}>
                        {f.date ? `le ${f.date} · ` : ''}sa preuve est née
                      </span>
                    </div>
                  ))}
                </>
              )}
              <div className="att-grp">
                {displaySeries(series)}
                {selectedAxe ? ` · ${selectedAxe}` : ''}
              </div>
              <div className="att-qline">Qu’avez-vous observé ?</div>
              <p className="att-qhelp">La compétence, puis le niveau — sur le même écran.</p>
              {namesForCompetenceStep.map((name) => {
                const draft = drafts[name];
                const picked = Boolean(draft);
                const levels = levelsFor(name);
                const level = draft?.level || levels[0] || '1';
                const badge = badgeFor(name, level);
                const comps = badge ? getBadgeCompetencies(badge) : [];
                const isExpanded = expandedCompetence === name;
                const cardClass = isExpanded ? 'att-card open' : picked ? 'att-card valid' : 'att-card';
                return (
                  <div key={name} className={cardClass}>
                    <button
                      type="button"
                      className="att-crow"
                      style={{ border: 0, padding: 0, width: '100%' }}
                      onClick={() => {
                        if (!picked) selectCompetence(name, levels[0] || '1');
                        setExpandedCompetence(isExpanded ? null : name);
                      }}
                    >
                      <span className="att-avatar" aria-hidden="true">
                        {getBadgeDisplayName(name).trim().charAt(0)}
                      </span>
                      <span>{getBadgeDisplayName(name)}</span>
                      {picked && !isExpanded && (
                        <span className="att-ok">
                          Niveau {level}
                          {comps.length > 0 ? ` · ${draft!.expertiseIds.length}/${comps.length}` : ''}
                        </span>
                      )}
                      <span className="att-chev">{isExpanded ? '▾' : '▸'}</span>
                    </button>
                    {isExpanded && (
                      <div className="att-subs">
                        {levels.length > 1 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: comps.length > 0 ? 8 : 0 }}>
                            {levels.map((lv) => (
                              <button
                                key={lv}
                                type="button"
                                className={`att-lv ${level === lv ? 'on' : ''}`}
                                onClick={() => selectCompetence(name, lv)}
                              >
                                Niveau {lv}
                              </button>
                            ))}
                          </div>
                        )}
                        {comps.length > 0 ? (
                          <>
                            <div className="att-subs-title">
                              <span>
                                {draft?.expertiseIds.length || 0} sur {comps.length}
                              </span>
                              {comps.length > 1 && (
                                <button
                                  type="button"
                                  className="att-tout-cocher"
                                  onClick={() =>
                                    toggleAllExpertise(name, comps.map((c) => c.id), draft?.expertiseIds || [])
                                  }
                                >
                                  {draft && draft.expertiseIds.length === comps.length ? 'Tout décocher' : 'Tout cocher'}
                                </button>
                              )}
                            </div>
                            {comps.map((c) => {
                              const on = draft?.expertiseIds.includes(c.id) || false;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`att-subline ${on ? 'on' : ''}`}
                                  onClick={() => toggleExpertise(name, c.id, isSingleSelectCompetenceSeries(badge!.series))}
                                >
                                  <span className={`att-box ${on ? 'on' : ''}`} />
                                  <span>{getCompetencyDisplayName(c.name, false)}</span>
                                </button>
                              );
                            })}
                            <div className="att-hint" style={{ marginTop: 4 }}>
                              Un seul item coché suffit à produire une preuve.
                            </div>
                          </>
                        ) : (
                          <p className="att-hint">Rien à cocher pour cette compétence — la sélection suffit.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!showAllCompetences &&
                !selectedAxe &&
                competenceNames.filter((n) => !frozenNames.has(n)).length > namesForCompetenceStep.length && (
                  <button type="button" className="att-dash" onClick={() => setShowAllCompetences(true)}>
                    ▸ toute la série ({competenceNames.filter((n) => !frozenNames.has(n)).length})
                  </button>
                )}
              <div className="att-bottombar">
                <div className="att-recap">
                  <button type="button" className="att-back-link" onClick={goBack}>
                    Retour
                  </button>
                  {pickedName ? `${getBadgeDisplayName(pickedName)} · Niveau ${pickedDraft?.level}` : 'Choisissez une compétence'}
                </div>
                <button
                  type="button"
                  className="att-go"
                  disabled={!canContinueFromCompetence}
                  onClick={() => setStep(isIndividual ? 'constat' : 'participants')}
                >
                  Continuer
                </button>
              </div>
            </>
          )}

          {!successState && step === 'participants' && !isIndividual && (
            <>
              <div className="att-grp">{pickedName ? getBadgeDisplayName(pickedName) : ''}</div>
              <div className="att-qline">Qui avez-vous observé ?</div>
              <p className="att-qhelp">Sélectionner les participants.</p>
              <div className="att-slab-row">
                <div className="att-slab">
                  Les participants du projet <span className="n">— {participants.length}</span>
                </div>
                <button type="button" className="att-tout-cocher" onClick={selectAllParticipants}>
                  Tout sélectionner
                </button>
              </div>
              <input
                className="att-search"
                placeholder="Rechercher dès la première lettre"
                value={participantsSearchTerm}
                onChange={(e) => setParticipantsSearchTerm(e.target.value)}
              />
              <div className="att-participants-grid">
                {(participantsSearchTerm || participantsExpanded
                  ? filteredParticipants
                  : filteredParticipants.slice(0, PARTICIPANTS_INITIAL_COUNT)
                ).map((p) => {
                  const checked = selectedParticipants.includes(p.memberId);
                  return (
                    <button
                      key={p.memberId}
                      type="button"
                      className={`att-participant-row ${checked ? 'on' : ''}`}
                      onClick={() => toggleParticipant(p.memberId)}
                    >
                      <span className={`att-box ${checked ? 'on' : ''}`} />
                      {chipName(p.name)}
                    </button>
                  );
                })}
              </div>
              {!participantsSearchTerm && !participantsExpanded && filteredParticipants.length > PARTICIPANTS_INITIAL_COUNT && (
                <button
                  type="button"
                  className="att-participants-more"
                  onClick={() => setParticipantsExpanded(true)}
                >
                  {filteredParticipants.length - PARTICIPANTS_INITIAL_COUNT} autres participants…
                </button>
              )}
              <div className="att-bottombar">
                <div className="att-recap">
                  <button type="button" className="att-back-link" onClick={goBack}>
                    Retour
                  </button>
                  {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} sélectionné
                  {selectedParticipants.length > 1 ? 's' : ''}
                </div>
                <button
                  type="button"
                  className="att-go"
                  disabled={selectedParticipants.length === 0}
                  onClick={() => setStep('constat')}
                >
                  Continuer
                </button>
              </div>
            </>
          )}

          {!successState && step === 'constat' && pickedName && pickedDraft && (
            <>
              <div className="att-grp">
                {getBadgeDisplayName(pickedName)} · Niveau {pickedDraft.level}
                {pickedComps.length > 0 ? ` · ${pickedDraft.expertiseIds.length}/${pickedComps.length} coché${pickedDraft.expertiseIds.length > 1 ? 's' : ''}` : ''}
              </div>

              {isIndividual && (
                <>
                  <div className="att-qline">Selon quelles conditions ?</div>
                  <p className="att-qhelp">Ce qui a été coché reste modifiable en revenant à l’étape précédente.</p>
                </>
              )}

              {pickedBadge &&
                isIndividual &&
                (commentRequiredFor(pickedBadge) ||
                  documentRequiredFor(pickedBadge) ||
                  pickedBadge.level === 'level_1' ||
                  pickedBadge.level === 'level_2') && (
                  <div className="att-doctrine">
                    {pickedBadge.level === 'level_1'
                      ? 'Niveau 1 — commentaire et document optionnels'
                      : commentRequiredFor(pickedBadge)
                        ? `Commentaire obligatoire ✱${pickedBadge.level === 'level_2' ? ' · document fortement conseillé' : documentRequiredFor(pickedBadge) ? ' · document obligatoire' : ''}`
                        : 'Commentaire et document optionnels'}
                  </div>
                )}

              {pickedBadge && !isIndividual && (massNeedsComment || massNeedsDoc) && (
                <div className="att-doctrine">
                  {`Commentaire obligatoire ✱${massNeedsDoc ? ' · document obligatoire' : massRecommendsDoc ? ' · document fortement conseillé' : ''}`}
                </div>
              )}

              {isIndividual ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  <input
                    className="att-search"
                    style={{ margin: 0, flex: 1, minWidth: 140 }}
                    placeholder={pickedBadge && commentRequiredFor(pickedBadge) ? 'Commentaire ✱' : 'Commentaire (optionnel)'}
                    value={pickedDraft.comment}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [pickedName]: { ...prev[pickedName], comment: e.target.value } }))
                    }
                  />
                  <label className="att-attach">
                    {pickedDraft.fileName || 'Joindre un document'}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx,.mp3"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setDrafts((prev) => ({ ...prev, [pickedName]: { ...prev[pickedName], file, fileName: file.name } }));
                      }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <div className="att-slab-row">
                    <div className="att-slab">
                      Les mêmes constats pour <span className="n">{joinFr(selectedParticipantNames)}</span>
                    </div>
                    {constatMode === 'groupe' && selectedParticipants.length > 1 && (
                      <button type="button" className="att-tout-cocher" onClick={enterIndividualMode}>
                        Ajuster participant par participant
                      </button>
                    )}
                  </div>

                  {constatMode === 'individuel' ? (
                    <>
                      <div className="att-slab-row">
                        <div className="att-slab">Constat propre à chaque participant</div>
                        <button type="button" className="att-tout-cocher" onClick={exitIndividualMode}>
                          Revenir au mode groupe
                        </button>
                      </div>
                      <div className="att-participant-switch">
                        {selectedParticipants.map((pid) => {
                          const p = participants.find((pp) => pp.memberId === pid);
                          const d = individualDrafts[pid];
                          const active = activeParticipantId === pid;
                          return (
                            <button
                              key={pid}
                              type="button"
                              className={`att-switch-chip ${active ? 'on' : ''}`}
                              onClick={() => setActiveParticipantId(pid)}
                            >
                              {p ? chipName(p.name) : pid}
                              {d && pickedComps.length > 0 ? ` · ${d.expertiseIds.length}/${pickedComps.length}` : ''}
                            </button>
                          );
                        })}
                      </div>

                      {activeParticipantId && individualDrafts[activeParticipantId] && (() => {
                        const aid = activeParticipantId;
                        const ad = individualDrafts[aid];
                        const aName = participants.find((p) => p.memberId === aid)?.name;
                        return (
                          <>
                            {pickedComps.length > 0 ? (
                              <>
                                <div className="att-subs-title">
                                  <span>
                                    {ad.expertiseIds.length} sur {pickedComps.length}
                                  </span>
                                  {pickedComps.length > 1 && (
                                    <button
                                      type="button"
                                      className="att-tout-cocher"
                                      onClick={() =>
                                        toggleAllIndividualExpertise(aid, pickedComps.map((c) => c.id), ad.expertiseIds)
                                      }
                                    >
                                      {ad.expertiseIds.length === pickedComps.length ? 'Tout décocher' : 'Tout cocher'}
                                    </button>
                                  )}
                                </div>
                                {pickedComps.map((c) => {
                                  const on = ad.expertiseIds.includes(c.id);
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      className={`att-subline ${on ? 'on' : ''}`}
                                      onClick={() =>
                                        toggleIndividualExpertise(aid, c.id, isSingleSelectCompetenceSeries(pickedBadge!.series))
                                      }
                                    >
                                      <span className={`att-box ${on ? 'on' : ''}`} />
                                      <span>{getCompetencyDisplayName(c.name, false)}</span>
                                    </button>
                                  );
                                })}
                                <div className="att-hint" style={{ marginTop: 4 }}>
                                  Un seul item coché suffit à produire une preuve — propre à {aName ? chipName(aName) : 'ce participant'}.
                                </div>
                              </>
                            ) : (
                              <p className="att-hint">Rien à cocher pour cette compétence — la sélection suffit.</p>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                              <input
                                className="att-search"
                                style={{ margin: 0, flex: 1, minWidth: 140 }}
                                placeholder={pickedBadge && commentRequiredFor(pickedBadge) ? 'Commentaire ✱' : 'Commentaire (optionnel)'}
                                value={ad.comment}
                                onChange={(e) =>
                                  setIndividualDrafts((prev) => ({
                                    ...prev,
                                    [aid]: { ...prev[aid], comment: e.target.value },
                                  }))
                                }
                              />
                              <label className="att-attach">
                                {ad.fileName || 'Joindre un document'}
                                <input
                                  type="file"
                                  hidden
                                  accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx,.mp3"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIndividualDrafts((prev) => ({
                                      ...prev,
                                      [aid]: { ...prev[aid], file, fileName: file.name },
                                    }));
                                  }}
                                />
                              </label>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : pickedComps.length > 0 ? (
                    <>
                      <div className="att-subs-title">
                        <span>
                          {pickedDraft.expertiseIds.length} sur {pickedComps.length}
                        </span>
                        {pickedComps.length > 1 && (
                          <button
                            type="button"
                            className="att-tout-cocher"
                            onClick={() =>
                              toggleAllExpertise(pickedName, pickedComps.map((c) => c.id), pickedDraft.expertiseIds)
                            }
                          >
                            {pickedDraft.expertiseIds.length === pickedComps.length ? 'Tout décocher' : 'Tout cocher'}
                          </button>
                        )}
                      </div>
                      {pickedComps.map((c) => {
                        const on = pickedDraft.expertiseIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            className={`att-subline ${on ? 'on' : ''}`}
                            onClick={() => toggleExpertise(pickedName, c.id, isSingleSelectCompetenceSeries(pickedBadge!.series))}
                          >
                            <span className={`att-box ${on ? 'on' : ''}`} />
                            <span>{getCompetencyDisplayName(c.name, false)}</span>
                          </button>
                        );
                      })}
                      <div className="att-hint" style={{ marginTop: 4 }}>
                        Un seul item coché suffit à produire une preuve.
                      </div>
                    </>
                  ) : (
                    <p className="att-hint">Rien à cocher pour cette compétence — la sélection suffit.</p>
                  )}
                </>
              )}

              {projectEvents.length > 0 && (
                <div className="att-selon">
                  <b>Constaté pendant :</b>
                  <button type="button" className="att-tog on" onClick={() => setEventOpen((v) => !v)}>
                    {selon === 'event' && eventId ? projectEvents.find((e) => e.id === eventId)?.title || 'un événement' : 'Le projet'} ▾
                  </button>
                </div>
              )}
              {projectEvents.length > 0 && eventOpen && (
                <div className="att-ev-list">
                  <button
                    type="button"
                    className={`att-srow ${selon === 'project' ? 'sel' : ''}`}
                    onClick={() => {
                      setSelon('project');
                      setEventId(undefined);
                      setEventOpen(false);
                    }}
                  >
                    Le projet
                  </button>
                  {projectEvents.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className={`att-srow ${selon === 'event' && eventId === ev.id ? 'sel' : ''}`}
                      onClick={() => {
                        setSelon('event');
                        setEventId(ev.id);
                        setEventOpen(false);
                      }}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              )}

              {!isIndividual && (
                <>
                  <div className="att-facultatif-title">Facultatif — rien n’est exigé</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    {!massNeedsDoc && !proofFieldOpen && (
                      <button type="button" className="att-attach" onClick={() => setProofFieldOpen(true)}>
                        + Preuve ou objet
                      </button>
                    )}
                    {(massNeedsDoc || proofFieldOpen) && (
                      <label className="att-attach">
                        {fileName || 'Joindre un document'}
                        <input
                          type="file"
                          hidden
                          accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx,.mp3"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setFichier(file);
                            setFileName(file.name);
                          }}
                        />
                      </label>
                    )}
                    {!massNeedsComment && !commentFieldOpen && (
                      <button type="button" className="att-attach" onClick={() => setCommentFieldOpen(true)}>
                        + Commentaire
                      </button>
                    )}
                  </div>
                  {(massNeedsComment || commentFieldOpen) && (
                    <textarea
                      className="att-comment"
                      style={{ marginTop: 8 }}
                      placeholder="Il vaut pour tous les participants cochés — il justifie l’attestation commune."
                      value={commentaire}
                      onChange={(e) => setCommentaire(e.target.value)}
                    />
                  )}
                </>
              )}

              <div className="att-bottombar">
                <div className="att-recap">
                  <button type="button" className="att-back-link" onClick={goBack}>
                    Retour
                  </button>
                  {isIndividual ? (
                    <>
                      <b>Un geste — une preuve par compétence, pour elle</b>
                      {proofCount > 0 ? ` — ici : ${proofCount} preuve${proofCount > 1 ? 's' : ''}.` : '.'}
                    </>
                  ) : constatMode === 'individuel' ? (
                    <>
                      {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} —{' '}
                      {proofCount} preuve{proofCount > 1 ? 's' : ''} de compétences, chacune avec ses propres constats.
                    </>
                  ) : (
                    <>
                      {selectedParticipants.length} participant{selectedParticipants.length > 1 ? 's' : ''} —{' '}
                      {proofCount} preuve{proofCount > 1 ? 's' : ''} de compétences
                      {pickedDraft.expertiseIds.length > 0
                        ? `, chacune portant ${pickedDraft.expertiseIds.length > 1 ? 'les' : 'le'} ${pickedDraft.expertiseIds.length} constat${pickedDraft.expertiseIds.length > 1 ? 's' : ''}.`
                        : '.'}
                    </>
                  )}
                </div>
                <button type="button" className="att-go" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                  {submitting
                    ? 'Attestation…'
                    : `Attester${!isIndividual && selectedParticipants.length > 0 ? ` — ${selectedParticipants.length} participant${selectedParticipants.length > 1 ? 's' : ''}` : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {confirmOpen && pickedName && pickedDraft && (
      <div className="att-confirm-overlay" onClick={() => setConfirmOpen(false)}>
        <div className="att-confirm-card" onClick={(e) => e.stopPropagation()}>
          <h3 className="att-confirm-title">Attester ces constats ?</h3>
          <p className="att-confirm-sub">
            Vous allez produire <b>{proofCount} preuve{proofCount > 1 ? 's' : ''} de compétences</b>
            {isIndividual
              ? ''
              : constatMode === 'individuel'
                ? ' — une par participant, avec ses propres constats'
                : ' — une par participant, portant les constats cochés'}
            .
          </p>
          <div className="att-confirm-recap">
            <div>
              <b>Compétence</b> {getBadgeDisplayName(pickedName)} · Niveau {pickedDraft.level}
            </div>
            {!isIndividual && constatMode === 'individuel' ? (
              selectedParticipants.map((pid) => {
                const p = participants.find((pp) => pp.memberId === pid);
                const d = individualDrafts[pid];
                const names =
                  pickedComps
                    .filter((c) => d?.expertiseIds.includes(c.id))
                    .map((c) => getCompetencyDisplayName(c.name, false))
                    .join(' · ') || '—';
                return (
                  <div key={pid}>
                    <b>{p ? chipName(p.name) : pid}</b> {names}
                  </div>
                );
              })
            ) : (
              <div>
                <b>Constats</b>{' '}
                {pickedComps
                  .filter((c) => pickedDraft.expertiseIds.includes(c.id))
                  .map((c) => getCompetencyDisplayName(c.name, false))
                  .join(' · ') || '—'}
              </div>
            )}
            {!(!isIndividual && constatMode === 'individuel') && (
              <div>
                <b>Participants</b> {isIndividual ? preselectedPerson?.name || 'Participant' : selectedParticipantNames.join(', ')}
              </div>
            )}
            <div>
              <b>Selon</b>{' '}
              {selon === 'event' && eventId
                ? `un événement « ${projectEvents.find((e) => e.id === eventId)?.title || ''} »`
                : `le projet « ${projectTitle || 'Projet'} »`}
            </div>
          </div>
          <div className="att-confirm-warn">
            C&apos;est définitif. Une preuve produite ne se modifie pas et ne se retire pas.
          </div>
          <div className="att-confirm-actions">
            <button type="button" className="att-confirm-cancel" onClick={() => setConfirmOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="att-go"
              onClick={() => {
                setConfirmOpen(false);
                void handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? 'Attestation…' : 'Attester'}
            </button>
          </div>
        </div>
      </div>
    )}

    {closeConfirmOpen && (
      <div className="att-confirm-overlay" onClick={() => setCloseConfirmOpen(false)}>
        <div className="att-confirm-card" onClick={(e) => e.stopPropagation()}>
          <h3 className="att-confirm-title">Quitter sans attester ?</h3>
          <p className="att-confirm-sub">
            Ce qui a été coché dans ce geste sera perdu — série, compétence, participants et constats.
          </p>
          <div className="att-confirm-actions">
            <button type="button" className="att-confirm-cancel" onClick={() => setCloseConfirmOpen(false)}>
              Continuer le geste
            </button>
            <button
              type="button"
              className="att-go att-danger"
              onClick={() => {
                setCloseConfirmOpen(false);
                onClose();
              }}
            >
              Quitter
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AttestCompetenceModal;
