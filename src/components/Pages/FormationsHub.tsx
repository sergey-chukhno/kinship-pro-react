import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FormationCard,
  FormationStatus,
  FinancementType,
  FINANCEMENT_LABEL,
  FINANCEMENT_OPTIONS,
  MOCK_OF_ORG,
} from '../../data/mockFormations';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import {
  getFormations,
  subscribeFormations,
  upsertFormation,
  updateFormation,
  setSelectedFormationId,
  ensureBaseFormationSlot,
  getOpenableFormationSlot,
  hasOpenableFormationSlot,
  updateFormationSlot,
  formatSlotDateLabel,
} from '../../utils/formationStore';
import FormationModal, { FormationFormData } from '../Modals/FormationModal';
import { canBrowseFormationsReadOnly, canCreateFormation } from '../../utils/ofActivationStore';
import { useToast } from '../../hooks/useToast';
import './FormationsHub.css';

const TABS: { id: FormationStatus; label: string }[] = [
  { id: 'draft', label: 'Brouillons' },
  { id: 'coming', label: 'À venir' },
  { id: 'in_progress', label: 'En cours' },
  { id: 'ended', label: 'Terminées' },
  { id: 'archived', label: 'Archivées' },
];

const FINANCEMENT_CLASS: Record<FinancementType, string> = {
  CPF: 'cpf',
  OPCO: 'opco',
  Entreprise: 'entreprise',
  Association: 'associative',
  Institution: 'autre',
  Autre: 'autre',
};

const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

function formatFrDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function isIsoDateToday(iso: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return iso === today;
}

/** Years & months referenced by a formation (dates + meta FR). */
function getFormationDateParts(f: FormationCard): { years: number[]; months: number[] } {
  const years = new Set<number>();
  const months = new Set<number>();

  const addIso = (iso?: string) => {
    if (!iso) return;
    const [y, m] = iso.split('-').map(Number);
    if (y) years.add(y);
    if (m) months.add(m);
  };

  addIso(f.startDate);
  addIso(f.endDate);
  if (f.archivedYear) years.add(f.archivedYear);

  const frDateRegex = /(\d{2})\/(\d{2})\/(\d{4})/g;
  let match: RegExpExecArray | null;
  while ((match = frDateRegex.exec(f.meta)) !== null) {
    const month = Number(match[2]);
    const year = Number(match[3]);
    if (month) months.add(month);
    if (year) years.add(year);
  }

  return { years: Array.from(years), months: Array.from(months) };
}

function matchesSearch(f: FormationCard, q: string): boolean {
  if (!q) return true;
  const haystack = [
    f.title,
    f.description,
    f.meta,
    f.financement,
    f.proofNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

const FormationsHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<FormationStatus>('in_progress');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterFinancement, setFilterFinancement] = useState<string>('');
  const [formations, setFormationsState] = useState<FormationCard[]>(() => getFormations());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFormation, setEditingFormation] = useState<FormationCard | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(getFormations().filter((f) => f.selected).map((f) => f.id))
  );

  useEffect(() => subscribeFormations(setFormationsState), []);

  useEffect(() => {
    if (searchParams.get('open') === 'create') {
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
      if (!canCreateFormation()) {
        setCurrentPage('of-activation');
        navigate('/of-activation');
        return;
      }
      setCurrentPage('create');
      navigate('/create?type=formation');
    }
  }, [searchParams, setSearchParams, navigate, setCurrentPage]);

  const openCreateModal = () => {
    if (!canCreateFormation()) {
      setCurrentPage('of-activation');
      navigate('/of-activation');
      return;
    }
    setCurrentPage('create');
    navigate('/create?type=formation');
  };

  const openEditModal = (formation: FormationCard) => {
    setIsCreateModalOpen(false);
    setEditingFormation(formation);
  };

  const closeFormationModal = () => {
    setIsCreateModalOpen(false);
    setEditingFormation(null);
  };

  const openDetail = (formation: FormationCard) => {
    setSelectedFormationId(formation.id);
    setCurrentPage('formation-detail');
    navigate('/formation-detail');
  };

  const openCard = (formation: FormationCard) => {
    openDetail(formation);
  };

  const patchFromForm = (data: FormationFormData): Partial<FormationCard> => ({
    title: data.title,
    description: data.description || undefined,
    financement: data.financement || undefined,
    isEuMcDeclared: data.isEuMcDeclared || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    attendanceSurveyOptIn: data.attendanceSurveyOptIn || undefined,
    durationHours: data.durationHours ? Number(data.durationHours) : undefined,
    participationMode: data.participationMode,
    learningOutcomes: data.learningOutcomes,
    imageName: data.imageName || undefined,
  });

  const openPreuve = (formation: FormationCard) => {
    setSelectedFormationId(formation.id);
    setCurrentPage('preuve-formation');
    navigate('/preuve-formation');
  };

  const buildDraftMeta = (data: FormationFormData, createdLabel: string) => {
    if (data.startDate && data.endDate) {
      return `créée le ${createdLabel} · prévue du ${formatFrDate(data.startDate)} au ${formatFrDate(data.endDate)} · jamais activée · visible par vous seul`;
    }
    return `créée le ${createdLabel} · jamais activée · visible par vous seul`;
  };

  const activateFormation = (id: string, data: FormationFormData) => {
    const startsToday = Boolean(data.startDate && isIsoDateToday(data.startDate));
    const status: FormationStatus = startsToday ? 'in_progress' : 'coming';
    const meta = startsToday
      ? `du ${formatFrDate(data.startDate)} au ${formatFrDate(data.endDate)} · en cours`
      : `du ${formatFrDate(data.startDate)} au ${formatFrDate(data.endDate)} · démarrage automatique le ${formatFrDate(data.startDate)}`;
    updateFormation(id, {
      ...patchFromForm(data),
      status,
      meta,
      frameLocked: true,
    });
    if (data.startDate) {
      ensureBaseFormationSlot(id, {
        dateLabel: formatSlotDateLabel(new Date(`${data.startDate}T12:00:00`)),
      });
    }
    setFormationsState(getFormations());
    closeFormationModal();
    setSelectedFormationId(id);
    setCurrentPage('formation-detail');
    navigate('/formation-detail');
    showSuccess('Cadre figé — les inscriptions sont ouvertes');
  };

  const handleCreateFormation = (data: FormationFormData) => {
    const today = new Date();
    const createdLabel = today.toLocaleDateString('fr-FR');
    const id = `f-${Date.now()}`;

    const card: FormationCard = {
      id,
      status: 'draft',
      meta: buildDraftMeta(data, createdLabel),
      ...patchFromForm(data),
      title: data.title,
    };

    upsertFormation(card);
    setFormationsState(getFormations());

    if (data.intent === 'create') {
      activateFormation(id, data);
      return;
    }

    closeFormationModal();
    setActiveTab('draft');
    showSuccess('Formation enregistrée en brouillon');
  };

  const handleUpdateFormation = (data: FormationFormData) => {
    if (!editingFormation) return;

    if (data.intent === 'create') {
      activateFormation(editingFormation.id, data);
      return;
    }

    const meta = buildDraftMeta(data, new Date().toLocaleDateString('fr-FR'));
    updateFormation(editingFormation.id, {
      ...patchFromForm(data),
      meta,
    });
    setFormationsState(getFormations());
    closeFormationModal();
    showSuccess('✓ Enregistré');
  };

  const openSession = (formation: FormationCard) => {
    const dateLabel = formation.startDate
      ? formatSlotDateLabel(new Date(`${formation.startDate}T12:00:00`))
      : formatSlotDateLabel();
    ensureBaseFormationSlot(formation.id, { dateLabel });
    const slot = getOpenableFormationSlot(formation.id);
    if (!slot || slot.status === 'closed') {
      showError('Cette session est clôturée et ne peut plus être rouverte.');
      return;
    }
    updateFormationSlot(formation.id, slot.id, { status: 'open' });
    setSelectedFormationId(formation.id);
    openPresenceSession({
      formationId: formation.id,
      slotId: slot.id,
      formationTitle: formation.title.replace(/\s*—.*$/, '').trim() || formation.title,
      slotLabel: slot.label,
      sessionDateLabel: slot.dateLabel,
      confirmed: 0,
      total: 17,
    });
    setCurrentPage('presence-session');
    navigate('/presence-session');
  };

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    formations.forEach((f) => {
      getFormationDateParts(f).years.forEach((y) => years.add(y));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [formations]);

  const matchesToolbarFilters = (f: FormationCard) => {
    const q = search.trim().toLowerCase();
    if (!matchesSearch(f, q)) return false;

    if (filterFinancement && f.financement !== filterFinancement) return false;

    const { years, months } = getFormationDateParts(f);

    if (filterYear) {
      const y = Number(filterYear);
      if (!years.includes(y)) return false;
    }

    if (filterMonth) {
      const m = Number(filterMonth);
      if (!months.includes(m)) return false;
    }

    return true;
  };

  const counts = useMemo(() => {
    const map: Record<FormationStatus, number> = {
      draft: 0,
      coming: 0,
      in_progress: 0,
      ended: 0,
      archived: 0,
    };
    formations.forEach((f) => {
      if (matchesToolbarFilters(f)) map[f.status] += 1;
    });
    return map;
  }, [formations, search, filterYear, filterMonth, filterFinancement]);

  const filtered = useMemo(() => {
    return formations.filter((f) => f.status === activeTab && matchesToolbarFilters(f));
  }, [activeTab, formations, search, filterYear, filterMonth, filterFinancement]);

  const hasActiveFilters =
    Boolean(search.trim()) || Boolean(filterYear) || Boolean(filterMonth) || Boolean(filterFinancement);

  const overdueCount = formations.filter(
    (f) => f.status === 'in_progress' && f.endDateOverdue && matchesToolbarFilters(f)
  ).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderBadges = (formation: FormationCard) => (
    <>
      {formation.financement && (
        <span className={`formation-badge ${FINANCEMENT_CLASS[formation.financement]}`}>
          {FINANCEMENT_LABEL[formation.financement]}
        </span>
      )}
      {formation.isEuMcDeclared && (
        <span className="formation-badge mc-ue">MC UE déclarée</span>
      )}
    </>
  );

  const renderActions = (formation: FormationCard) => {
    switch (formation.status) {
      case 'draft':
        return (
          <>
            <button
              type="button"
              className="formation-btn primary"
              onClick={() => openEditModal(formation)}
            >
              Modifier
            </button>
            <button type="button" className="formation-btn">Supprimer</button>
          </>
        );
      case 'coming':
        return (
          <>
            <button
              type="button"
              className="formation-btn"
              onClick={() => openDetail(formation)}
            >
              Voir la formation
            </button>
            <button
              type="button"
              className="formation-btn"
              onClick={() => {
                sessionStorage.setItem('kinship_f2_tab', 'informations');
                openDetail(formation);
              }}
            >
              Modifier les dates
            </button>
          </>
        );
      case 'in_progress':
        return (
          <>
            {hasOpenableFormationSlot(formation.id) && (
              <button
                type="button"
                className="formation-btn primary"
                onClick={() => openSession(formation)}
              >
                Ouvrir la session de présence
              </button>
            )}
            <button
              type="button"
              className="formation-btn"
              onClick={() => openDetail(formation)}
            >
              Voir la formation
            </button>
          </>
        );
      case 'ended':
        if (formation.hasProof) {
          return (
            <>
              <button
                type="button"
                className="formation-btn primary"
                onClick={() => openPreuve(formation)}
              >
                Consulter la PF
              </button>
              <button type="button" className="formation-btn">Partager la PF</button>
            </>
          );
        }
        return (
          <button
            type="button"
            className="formation-btn"
            onClick={() => openDetail(formation)}
          >
            Voir la formation
          </button>
        );
      case 'archived':
        return (
          <>
            <button
              type="button"
              className="formation-btn"
              onClick={() => openDetail(formation)}
            >
              Voir la formation
            </button>
            {formation.hasProof && (
              <>
                <button
                  type="button"
                  className="formation-btn"
                  onClick={() => openPreuve(formation)}
                >
                  Consulter la PF
                </button>
                <button type="button" className="formation-btn">Partager la PF</button>
              </>
            )}
            <button type="button" className="formation-btn muted">Dupliquer</button>
            <button type="button" className="formation-btn">Masquer</button>
          </>
        );
      default:
        return null;
    }
  };

  const renderCard = (formation: FormationCard) => {
    const showCheckbox = formation.status === 'ended';
    const isSelected = selectedIds.has(formation.id);

    return (
      <article
        key={formation.id}
        className="formation-card"
        onClick={() => openCard(formation)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openCard(formation);
          }
        }}
      >
        <div className="formation-card-row">
          <div className="formation-card-title-row">
            {showCheckbox && (
              <button
                type="button"
                className={`formation-card-check ${isSelected ? 'checked' : 'unchecked'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(formation.id);
                }}
                aria-pressed={isSelected}
                aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
              >
                {isSelected ? '✓' : ''}
              </button>
            )}
            <div>
              <h3 className="formation-card-title">
                {formation.title}
                {renderBadges(formation)}
              </h3>
              <p className="formation-card-meta">
                {formation.endDateOverdue ? (
                  <>
                    {formation.meta.split('date de fin dépassée')[0]}
                    <span className="overdue">date de fin dépassée — à clôturer depuis la fiche</span>
                  </>
                ) : (
                  formation.meta
                )}
              </p>
            </div>
          </div>
          <div
            className="formation-card-actions"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {renderActions(formation)}
          </div>
        </div>
        {formation.identitiesToVerify != null && formation.identitiesToVerify > 0 && (
          <div className="formation-identity-banner">
            ⚠ Identités à vérifier : {formation.identitiesToVerify} participants — formation CPF :
            « Cette formation CPF ne peut pas démarrer. Veuillez vérifier l&apos;identité de tous vos
            apprenants. »
          </div>
        )}
      </article>
    );
  };

  const renderList = () => {
    if (filtered.length === 0) {
      return (
        <p className="formations-hub-empty">
          {hasActiveFilters
            ? 'Aucune formation ne correspond à la recherche / aux filtres.'
            : 'Aucune formation dans cet onglet.'}
        </p>
      );
    }

    if (activeTab === 'archived') {
      const years = Array.from(
        new Set(filtered.map((f) => f.archivedYear).filter(Boolean) as number[])
      ).sort((a, b) => b - a);

      return years.map((year) => (
        <div key={year}>
          <div className="formations-hub-year">{year}</div>
          {filtered.filter((f) => f.archivedYear === year).map(renderCard)}
        </div>
      ));
    }

    return (
      <>
        {activeTab === 'in_progress' && overdueCount > 0 && (
          <div className="formations-hub-banner">
            « Vous avez {overdueCount} formation(s) dont la date de fin est dépassée. »
          </div>
        )}
        {activeTab === 'ended' && (
          <div className="formations-hub-ended-actions">
            <span>{selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}</span>
            <div className="formation-card-actions">
              <button type="button" className="formation-btn">Archiver la sélection</button>
              <button type="button" className="formation-btn">Archiver tout 2025</button>
            </div>
          </div>
        )}
        {filtered.map(renderCard)}
      </>
    );
  };

  return (
    <section className="formations-hub" aria-label="Hub Formations">
      <div className="formations-hub-header">
        <div>
          <h1 className="formations-hub-title">Formations</h1>
          <p className="formations-hub-subtitle">
            {MOCK_OF_ORG.name} · {MOCK_OF_ORG.kind}
          </p>
          <p className="formations-hub-qualiopi">
            {MOCK_OF_ORG.qualiopiLabel} · valide jusqu’au {MOCK_OF_ORG.qualiopiValidUntil} ·
            dernière vérification : {MOCK_OF_ORG.lastVerified}
          </p>
        </div>
        {canCreateFormation() && (
          <button type="button" className="formations-hub-create" onClick={openCreateModal}>
            + Créer une formation
          </button>
        )}
        {!canCreateFormation() && canBrowseFormationsReadOnly() && (
          <p className="formations-hub-subtitle">Espace en lecture — la création s’ouvrira à l’activation.</p>
        )}
      </div>

      <div className="formations-hub-shell">
        <div className="formations-hub-toolbar">
          <input
            type="search"
            className="formations-hub-search"
            placeholder="🔍 Rechercher une formation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une formation"
          />
          <select
            className={`formations-hub-filter ${filterYear ? 'active' : ''}`}
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            aria-label="Filtrer par année"
          >
            <option value="">Année</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className={`formations-hub-filter ${filterMonth ? 'active' : ''}`}
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            aria-label="Filtrer par mois"
          >
            <option value="">Mois</option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            className={`formations-hub-filter ${filterFinancement ? 'active' : ''}`}
            value={filterFinancement}
            onChange={(e) => setFilterFinancement(e.target.value)}
            aria-label="Filtrer par financement"
          >
            <option value="">Financement</option>
            {FINANCEMENT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {FINANCEMENT_LABEL[f]}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              className="formations-hub-filter-clear"
              onClick={() => {
                setSearch('');
                setFilterYear('');
                setFilterMonth('');
                setFilterFinancement('');
              }}
            >
              Réinitialiser
            </button>
          )}
        </div>

        <div className="formations-hub-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`formations-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({counts[tab.id]})
            </button>
          ))}
        </div>

        <div className="formations-hub-list" role="tabpanel">
          {renderList()}
        </div>

        <div className="formations-hub-footer">
          Les inscriptions, la gestion et le rapport OF vivent dans la fiche — le hub liste et
          oriente, il ne duplique rien.
        </div>
      </div>

      {isCreateModalOpen && (
        <FormationModal onClose={closeFormationModal} onSave={handleCreateFormation} />
      )}

      {editingFormation && (
        <FormationModal
          isEdit
          status={editingFormation.status}
          onClose={closeFormationModal}
          onSave={handleUpdateFormation}
          initialData={{
            title: editingFormation.title,
            description: editingFormation.description ?? '',
            projectKind: 'formation',
            financement: editingFormation.financement ?? '',
            isEuMcDeclared: editingFormation.isEuMcDeclared ?? false,
            startDate: editingFormation.startDate ?? '',
            endDate: editingFormation.endDate ?? '',
            attendanceSurveyOptIn: editingFormation.attendanceSurveyOptIn ?? false,
            durationHours: editingFormation.durationHours
              ? String(editingFormation.durationHours)
              : '',
            participationMode: editingFormation.participationMode ?? 'presentiel',
            learningOutcomes: editingFormation.learningOutcomes ?? [],
            imageName: editingFormation.imageName ?? '',
          }}
        />
      )}
    </section>
  );
};

export default FormationsHub;
