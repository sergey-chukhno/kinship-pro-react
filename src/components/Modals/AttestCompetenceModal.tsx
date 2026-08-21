import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BadgeAttribution, BadgeAPI } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getBadges, assignBadge, getProjectBadges } from '../../api/Badges';
import { isSeriesWithAxes, getAxesForSeries, getBadgeNamesForAxe } from '../../constants/badgeAxes';
import {
  isMetiersDeLaMerSeries,
  isSeriesWithAxesCompetenceSelection,
  isSingleSelectCompetenceSeries,
} from '../../utils/badgeAssignmentCompetenceSelection';
import { useToast } from '../../hooks/useToast';
import apiClient from '../../api/config';
import {
  getBadgeDisplayName,
  getBadgeValidationRules,
  getBadgeCompetencies,
  getCompetencyDisplayName,
  normalizeCompetencyName,
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

const chipName = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
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

const shouldValidateBadge = (badge: BadgeAPI): boolean => {
  const isParcoursProfessionnel = badge.series === 'Série Parcours professionnel';
  return (
    isSeriesWithAxesCompetenceSelection(badge.series) ||
    badge.level === 'level_1' ||
    (badge.level === 'level_2' &&
      (badge.series === 'Série Parcours des possibles' ||
        badge.series === 'Série Audiovisuelle' ||
        badge.series === 'Série TouKouLeur')) ||
    isParcoursProfessionnel
  );
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
  const [seriesOpen, setSeriesOpen] = useState(false);
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
  const [projectEvents, setProjectEvents] = useState<Array<{ id: number; title: string; date?: string }>>([]);
  const [frozen, setFrozen] = useState<FrozenProof[]>([]);
  const [badges, setBadges] = useState<BadgeAPI[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    const rules = getBadgeValidationRules(badge.name, badge.level);
    const mandatory = (rules?.mandatoryCompetencies || []).map(normalizeCompetencyName);
    const selectedNames = draft.expertiseIds
      .map((id) => comps.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .map((n) => normalizeCompetencyName(n as string));
    const mandatoryOk = mandatory.length === 0 || mandatory.every((m) => selectedNames.includes(m));
    return {
      checked: draft.expertiseIds.length,
      total: comps.length,
      mandatoryOk,
      rules,
      comps,
    };
  };

  const pickCompetence = (name: string) => {
    setDrafts((prev) => {
      if (prev[name]) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      const level = levelsFor(name)[0] || '1';
      const badge = badgeFor(name, level);
      const comps = badge ? getBadgeCompetencies(badge) : [];
      return {
        ...prev,
        [name]: {
          name,
          level,
          expanded: comps.length > 0,
          expertiseIds: [],
          comment: '',
          file: null,
          fileName: '',
        },
      };
    });
  };

  const setDraftLevel = (name: string, level: string) => {
    setDrafts((prev) => {
      const badge = badgeFor(name, level);
      const comps = badge ? getBadgeCompetencies(badge) : [];
      const cur = prev[name];
      if (!cur) {
        return {
          ...prev,
          [name]: {
            name,
            level,
            expanded: comps.length > 0,
            expertiseIds: [],
            comment: '',
            file: null,
            fileName: '',
          },
        };
      }
      return {
        ...prev,
        [name]: { ...cur, level, expertiseIds: [], expanded: comps.length > 0 },
      };
    });
  };

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

  const validateLocal = (
    selectedExpertiseIds: number[],
    badge: BadgeAPI,
    allExpertises: Array<{ id: number; name: string }>
  ) => {
    if (isMetiersDeLaMerSeries(badge.series)) {
      return selectedExpertiseIds.length < 1
        ? { isValid: false, errorMessage: 'Veuillez sélectionner au moins une compétence.' }
        : { isValid: true, errorMessage: null };
    }
    if (isSingleSelectCompetenceSeries(badge.series)) {
      return selectedExpertiseIds.length !== 1
        ? { isValid: false, errorMessage: 'Veuillez sélectionner une compétence.' }
        : { isValid: true, errorMessage: null };
    }
    if (!shouldValidateBadge(badge)) return { isValid: true, errorMessage: null };
    const rules = getBadgeValidationRules(badge.name, badge.level);
    if (!rules) return { isValid: true, errorMessage: null };
    let mandatory = rules.mandatoryCompetencies;
    if (badge.name === 'ACTING' && badge.level === 'level_1') mandatory = [];
    const selectedNames = selectedExpertiseIds
      .map((id) => allExpertises.find((e) => e.id === id)?.name)
      .filter((n): n is string => Boolean(n))
      .map(normalizeCompetencyName);
    const missing = mandatory.map(normalizeCompetencyName).filter((m) => !selectedNames.includes(m));
    if (missing.length > 0) {
      return { isValid: false, errorMessage: 'Compétence(s) obligatoire(s) manquante(s).' };
    }
    if (selectedNames.length < rules.minRequired) {
      return {
        isValid: false,
        errorMessage: `Vous devez sélectionner au moins ${rules.minRequired} compétence(s).`,
      };
    }
    return { isValid: true, errorMessage: null };
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
  };

  const selectAllParticipants = () => {
    setSelectedParticipants(filteredParticipants.map((p) => p.memberId));
  };

  const selectedDraftList = Object.values(drafts);
  const selectedBadges = selectedDraftList
    .map((d) => badgeFor(d.name, d.level))
    .filter((b): b is BadgeAPI => Boolean(b));

  const massNeedsComment = !isIndividual && selectedBadges.some(commentRequiredFor);
  const massNeedsDoc = !isIndividual && selectedBadges.some(documentRequiredFor);
  const massRecommendsDoc = !isIndividual && selectedBadges.some((b) => b.level === 'level_2');

  const proofCount = selectedParticipants.length * selectedDraftList.length;
  const preselectedPerson = participants.find((p) => p.memberId === preselectedParticipant);

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

    for (const draft of selectedDraftList) {
      const badge = badgeFor(draft.name, draft.level);
      if (!badge) {
        showWarningToast(`Niveau indisponible pour « ${getBadgeDisplayName(draft.name)} »`);
        return;
      }
      const comps = getBadgeCompetencies(badge);
      if (shouldValidateBadge(badge) && comps.length > 0) {
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

      showSuccessToast(
        assigned > 1
          ? `${assigned} preuves nées — un geste, une preuve par personne par compétence.`
          : `Preuve née pour « ${lastBadge ? getBadgeDisplayName(lastBadge.name) : 'la compétence'} ».`
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
      setTimeout(() => onClose(), 800);
    } catch (error: any) {
      const apiMessage = error.response?.data?.message || error.response?.data?.error;
      showErrorToast(apiMessage || "Erreur lors de l'attestation");
    } finally {
      setSubmitting(false);
    }
  };

  const shownParticipantChips = isIndividual
    ? []
    : selectedParticipants.slice(0, participantsExpanded ? selectedParticipants.length : 3);

  const renderCompetenceRow = (name: string) => {
    const draft = drafts[name];
    const checked = Boolean(draft);
    const level = draft?.level || levelsFor(name)[0] || '1';
    const badge = badgeFor(name, level);
    const comps = badge ? getBadgeCompetencies(badge) : [];
    const recap = draft && badge ? competenceRecap(draft, badge) : null;
    const levels = levelsFor(name);
    const expanded = Boolean(draft?.expanded && comps.length > 0);
    const cardClass = expanded ? 'att-card open' : recap && recap.checked > 0 ? 'att-card valid' : 'att-card';

    return (
      <div key={name} className={cardClass}>
        <div className={`att-crow ${checked ? 'checked' : 'idle'}`} style={{ borderBottom: expanded ? '0' : undefined, padding: 0 }}>
          <button type="button" className="att-crow" style={{ border: 0, padding: 0, flex: 1 }} onClick={() => pickCompetence(name)}>
            <span>{checked ? '☑' : '☐'}</span>
            <span>{getBadgeDisplayName(name)}</span>
            {levels.length > 1 && <span style={{ fontSize: 10, fontWeight: 400, color: '#8f8d86' }}>— au niveau :</span>}
          </button>
          {levels.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`att-lv ${level === lv && checked ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setDraftLevel(name, lv);
              }}
            >
              Niveau {lv}
            </button>
          ))}
          {checked && recap && recap.total > 0 && (
            <span className="att-ok">
              {recap.checked}/{recap.total} cochées{recap.mandatoryOk ? ' · l’obligatoire ✓' : ''}
            </span>
          )}
          {comps.length > 0 && (
            <button
              type="button"
              className="att-chev"
              onClick={(e) => {
                e.stopPropagation();
                if (!checked) pickCompetence(name);
                else {
                  setDrafts((prev) => ({
                    ...prev,
                    [name]: { ...prev[name], expanded: !prev[name].expanded },
                  }));
                }
              }}
            >
              {expanded ? '▾' : '▸'}
            </button>
          )}
        </div>

        {expanded && badge && recap && (
          <div className="att-subs">
            <div className="att-subs-title">
              Ses sous-compétences — {isSingleSelectCompetenceSeries(badge.series) ? 'sélection unique' : 'sélection multiple'}
              <span className="n"> · celles du Niveau {level}</span>
            </div>
            {recap.rules && <div className="att-subs-hint">{recap.rules.hintText}</div>}
            {recap.comps.map((c) => {
              const on = draft.expertiseIds.includes(c.id);
              const mandatory = (recap.rules?.mandatoryCompetencies || [])
                .map(normalizeCompetencyName)
                .includes(normalizeCompetencyName(c.name));
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`att-subline ${on ? 'on' : ''}`}
                  onClick={() => toggleExpertise(name, c.id, isSingleSelectCompetenceSeries(badge.series))}
                >
                  <span>{on ? '☑' : '☐'}</span>
                  <span>
                    {getCompetencyDisplayName(c.name, mandatory)}
                    {mandatory && <span className="att-obli"> (Obligatoire)</span>}
                  </span>
                </button>
              );
            })}
            {recap.checked > 0 && (
              <div className="att-hint" style={{ marginTop: 6 }}>
                {recap.checked} cochée{recap.checked > 1 ? 's' : ''} sur {recap.total}
                {recap.mandatoryOk ? ', l’obligatoire ✓ — la compétence peut s’attester.' : '.'}
              </div>
            )}
            {(commentRequiredFor(badge) || documentRequiredFor(badge) || badge.level === 'level_1' || badge.level === 'level_2') && (
              <div className="att-doctrine">
                {badge.level === 'level_1'
                  ? 'Niveau 1 — commentaire et document optionnels'
                  : commentRequiredFor(badge)
                    ? `Niveau ${level} — commentaire obligatoire ✱${badge.level === 'level_2' ? ' · document fortement conseillé' : documentRequiredFor(badge) ? ' · document obligatoire' : ''}`
                    : `Niveau ${level} — commentaire et document optionnels`}
              </div>
            )}
          </div>
        )}

        {isIndividual && checked && (
          <div style={{ display: 'flex', gap: 6, padding: '6px 0 2px 22px', flexWrap: 'wrap' }}>
            <input
              className="att-search"
              style={{ margin: 0, flex: 1, minWidth: 140 }}
              placeholder={commentRequiredFor(badge!) ? '💬 commentaire ✱' : '💬 commentaire (optionnel)'}
              value={draft.comment}
              onChange={(e) =>
                setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], comment: e.target.value } }))
              }
            />
            <label className="att-attach">
              📎 {draft.fileName || 'joindre un document'}
              <input
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx,.mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDrafts((prev) => ({ ...prev, [name]: { ...prev[name], file, fileName: file.name } }));
                }}
              />
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="badge-assignment-modal-overlay" onClick={onClose}>
      <div className="att-modal" role="dialog" aria-modal="true" aria-labelledby="att-title" onClick={(e) => e.stopPropagation()}>
        <div className="att-head">
          <h2 id="att-title">{isIndividual ? `Attester — ${preselectedPerson?.name || ''}` : 'Attester une compétence'}</h2>
          <p className="att-sub">{projectTitle || 'Projet'}</p>
          <button type="button" className="att-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="att-body">
          {organizationsForSelection.length > 1 && (
            <>
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
            </>
          )}

          {!isIndividual && (
            <>
              <div className="att-slab">Les participants</div>
              <div className="att-chips">
                {shownParticipantChips.map((id) => {
                  const p = participants.find((x) => x.memberId === id);
                  if (!p) return null;
                  return (
                    <button key={id} type="button" className="att-chip" onClick={() => toggleParticipant(id)}>
                      ☑ {chipName(p.name)}
                    </button>
                  );
                })}
                {selectedParticipants.length > 3 && !participantsExpanded && (
                  <button type="button" className="att-chip off" onClick={() => setParticipantsExpanded(true)}>
                    ☐ + {selectedParticipants.length - 3} autres ▾
                  </button>
                )}
              </div>
              <input
                className="att-search"
                style={{ marginTop: 6 }}
                placeholder="🔍 rechercher dès la première lettre"
                value={participantsSearchTerm}
                onChange={(e) => setParticipantsSearchTerm(e.target.value)}
              />
              <button type="button" className="att-chip off" onClick={selectAllParticipants}>
                ☑ Tout cocher ({filteredParticipants.length})
              </button>
              {(participantsSearchTerm || participantsExpanded) && (
                <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 6 }}>
                  {filteredParticipants.map((p) => (
                    <button
                      key={p.memberId}
                      type="button"
                      className={`att-chip ${selectedParticipants.includes(p.memberId) ? '' : 'off'}`}
                      style={{ margin: '0 4px 4px 0' }}
                      onClick={() => toggleParticipant(p.memberId)}
                    >
                      {selectedParticipants.includes(p.memberId) ? '☑' : '☐'} {chipName(p.name)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {isIndividual && frozen.length > 0 && (
            <>
              <div className="att-slab">Déjà attesté <span className="n">— figé au geste</span></div>
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

          <div className="att-slab">La série <span className="n">— celles auxquelles votre structure peut prétendre</span></div>
          {loadingBadges && <p className="att-hint">Chargement…</p>}
          {series && (
            <div className="att-srow sel">
              📚 {displaySeries(series)}
              <span className="ct">✓ choisie · {competenceNames.length} compétences</span>
            </div>
          )}
          {availableSeries.length !== 1 && (
            <>
              <button type="button" className="att-dash" onClick={() => setSeriesOpen((v) => !v)}>
                {seriesOpen ? '▾' : '▸'} Choisir une autre série
              </button>
              {seriesOpen && (
                <div style={{ marginTop: 6 }}>
                  <input
                    className="att-search"
                    placeholder="🔍 rechercher dès la première lettre…"
                    value={seriesQuery}
                    onChange={(e) => setSeriesQuery(e.target.value)}
                  />
                  {groupedSeries.own.length > 0 && <div className="att-grp">Vos séries</div>}
                  {groupedSeries.own.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`att-srow ${s === series ? 'sel' : ''}`}
                      onClick={() => {
                        setSeries(s);
                        setDrafts({});
                        setSeriesOpen(false);
                      }}
                    >
                      📚 {displaySeries(s)}
                      <span className="ct">{s === series ? '✓ choisie' : `${(badgesBySeries[s] || []).length}`}</span>
                    </button>
                  ))}
                  {groupedSeries.catalogue.length > 0 && <div className="att-grp">Catalogue Kinship</div>}
                  {groupedSeries.catalogue.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`att-srow ${s === series ? 'sel' : ''}`}
                      onClick={() => {
                        setSeries(s);
                        setDrafts({});
                        setSeriesOpen(false);
                      }}
                    >
                      📚 {displaySeries(s)}
                      <span className="ct">{s === series ? '✓ choisie' : `${(badgesBySeries[s] || []).length}`}</span>
                    </button>
                  ))}
                  <div className="att-grp">Distribuées par vos autorités</div>
                  <p className="att-hint">— apparaissent quand votre structure en reçoit.</p>
                </div>
              )}
            </>
          )}

          {series && (
            <>
              <div className="att-slab">
                {isIndividual ? 'Ses compétences' : 'Les compétences'} <span className="n">— la série choisie</span>
              </div>
              {isSeriesWithAxes(series) &&
                getAxesForSeries(series).map((axe) => {
                  const names = competenceNames.filter((n) => getBadgeNamesForAxe(series, axe.title).includes(n) && !frozenNames.has(n));
                  if (names.length === 0) return null;
                  return (
                    <div key={axe.id} style={{ marginBottom: 8 }}>
                      <div className="att-grp">{axe.title}</div>
                      {names.filter((n) => showAllCompetences || visibleNames.includes(n)).map(renderCompetenceRow)}
                    </div>
                  );
                })}
              {!isSeriesWithAxes(series) && visibleNames.map(renderCompetenceRow)}
              {!showAllCompetences && competenceNames.filter((n) => !frozenNames.has(n)).length > visibleNames.length && (
                <button type="button" className="att-dash" onClick={() => setShowAllCompetences(true)}>
                  ▸ toute la série ({competenceNames.filter((n) => !frozenNames.has(n)).length})
                </button>
              )}
            </>
          )}

          {massNeedsComment && (
            <>
              <div className="att-slab">
                Le commentaire commun <span className="n">— exigé par le niveau choisi <span className="att-req">✱</span></span>
              </div>
              <textarea
                className="att-comment"
                placeholder="💬 Il vaut pour tous les participants cochés — il justifie l’attestation commune."
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="att-attach">
                  📎 {fileName || 'joindre un document'}
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
                <span className="att-hint">
                  {massNeedsDoc ? 'obligatoire' : massRecommendsDoc ? '— fortement conseillé au Niveau 2' : ''}
                </span>
              </div>
              <p className="att-hint">Figé au geste, jamais après.</p>
            </>
          )}

          <div className="att-selon">
            <b>Selon :</b>
            <button
              type="button"
              className={`att-tog ${selon === 'event' ? 'on' : ''}`}
              onClick={() => {
                setSelon('event');
                setEventOpen(true);
              }}
            >
              {eventId ? projectEvents.find((e) => e.id === eventId)?.title || 'un événement' : 'un événement'} ▾
            </button>
            <span style={{ color: '#8f8d86' }}>ou</span>
            <button type="button" className={`att-tog ${selon === 'project' ? 'on' : ''}`} onClick={() => setSelon('project')}>
              le projet
            </button>
          </div>
          {selon === 'event' && eventOpen && (
            <div className="att-ev-list">
              {projectEvents.length === 0 && <p className="att-hint">Aucun événement lié à ce projet.</p>}
              {projectEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  className={`att-srow ${eventId === ev.id ? 'sel' : ''}`}
                  onClick={() => {
                    setEventId(ev.id);
                    setEventOpen(false);
                  }}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          )}

          <div className="att-actions">
            <button type="button" className="att-go" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Attestation…' : 'Attester'}
            </button>
          </div>
          <div className="att-foot">
            <b>Un geste — une preuve par {isIndividual ? 'compétence, pour elle' : 'personne par compétence, au niveau choisi'}</b>
            {proofCount > 0 ? ` — ici : ${isIndividual ? `${selectedDraftList.length} compétence${selectedDraftList.length > 1 ? 's' : ''} → ${proofCount} preuve${proofCount > 1 ? 's' : ''}` : `${selectedParticipants.length} participant${selectedParticipants.length > 1 ? 's' : ''} · ${selectedDraftList.length} compétence${selectedDraftList.length > 1 ? 's' : ''} → ${proofCount} preuves`}.` : '.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttestCompetenceModal;
