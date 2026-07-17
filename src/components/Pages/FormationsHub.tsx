import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FormationCard,
  FormationStatus,
  FinancementType,
  MOCK_FORMATIONS,
  MOCK_OF_ORG,
} from '../../data/mockFormations';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import FormationModal, { FormationFormData } from '../Modals/FormationModal';
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
  Associative: 'associative',
  Autre: 'autre',
};

function formatFrDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const FormationsHub: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setCurrentPage } = useAppContext();
  const { showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<FormationStatus>('in_progress');
  const [search, setSearch] = useState('');
  const [formations, setFormations] = useState<FormationCard[]>(() => [...MOCK_FORMATIONS]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(MOCK_FORMATIONS.filter((f) => f.selected).map((f) => f.id))
  );

  useEffect(() => {
    if (searchParams.get('open') === 'create') {
      setIsCreateModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openCreateModal = () => setIsCreateModalOpen(true);

  const closeCreateModal = () => setIsCreateModalOpen(false);

  const handleCreateFormation = (data: FormationFormData) => {
    const today = new Date();
    const createdLabel = today.toLocaleDateString('fr-FR');
    let meta = `créée le ${createdLabel} · jamais activée · visible par vous seul`;
    if (data.startDate && data.endDate) {
      meta = `créée le ${createdLabel} · prévue du ${formatFrDate(data.startDate)} au ${formatFrDate(data.endDate)} · jamais activée · visible par vous seul`;
    }

    const card: FormationCard = {
      id: `f-${Date.now()}`,
      title: data.title,
      status: 'draft',
      financement: data.financement || undefined,
      isEuMcDeclared: data.isEuMcDeclared || undefined,
      meta,
    };

    setFormations((prev) => [card, ...prev]);
    setActiveTab('draft');
    setIsCreateModalOpen(false);
    showSuccess('Formation enregistrée en brouillon');
  };

  const openSession = (formation: FormationCard) => {
    openPresenceSession({
      formationTitle: formation.title.replace(/\s*—.*$/, '').trim() || formation.title,
      slotLabel: 'Matinée',
      sessionDateLabel: '15 septembre 2026',
      confirmed: 12,
      total: 17,
    });
    setCurrentPage('presence-session');
    navigate('/presence-session');
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
      map[f.status] += 1;
    });
    return map;
  }, [formations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return formations.filter((f) => {
      if (f.status !== activeTab) return false;
      if (!q) return true;
      return f.title.toLowerCase().includes(q) || f.meta.toLowerCase().includes(q);
    });
  }, [activeTab, search, formations]);

  const overdueCount = formations.filter(
    (f) => f.status === 'in_progress' && f.endDateOverdue
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
          {formation.financement}
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
            <button type="button" className="formation-btn primary">Modifier</button>
            <button type="button" className="formation-btn">Supprimer</button>
          </>
        );
      case 'coming':
        return (
          <>
            <button type="button" className="formation-btn">Voir la formation</button>
            <button type="button" className="formation-btn">Modifier</button>
          </>
        );
      case 'in_progress':
        return (
          <>
            <button
              type="button"
              className="formation-btn primary"
              onClick={() => openSession(formation)}
            >
              Ouvrir la session de présence
            </button>
            <button type="button" className="formation-btn">Voir la formation</button>
          </>
        );
      case 'ended':
        if (formation.hasProof) {
          return (
            <>
              <button type="button" className="formation-btn primary">Consulter la PF</button>
              <button type="button" className="formation-btn">Partager la PF</button>
            </>
          );
        }
        return <button type="button" className="formation-btn">Voir la formation</button>;
      case 'archived':
        return (
          <>
            <button type="button" className="formation-btn">Voir la formation</button>
            {formation.hasProof && (
              <>
                <button type="button" className="formation-btn">Consulter la PF</button>
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
      <article key={formation.id} className="formation-card">
        <div className="formation-card-row">
          <div className="formation-card-title-row">
            {showCheckbox && (
              <button
                type="button"
                className={`formation-card-check ${isSelected ? 'checked' : 'unchecked'}`}
                onClick={() => toggleSelect(formation.id)}
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
          <div className="formation-card-actions">{renderActions(formation)}</div>
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
      return <p className="formations-hub-empty">Aucune formation dans cet onglet.</p>;
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
            « Vous avez {overdueCount} projet(s) dont la date de fin est dépassée. Souhaitez-vous les
            clôturer ? »
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
            {MOCK_OF_ORG.name} · espace organisme de formation
          </p>
          <p className="formations-hub-qualiopi">
            ✓ Qualiopi · valide jusqu’au {MOCK_OF_ORG.qualiopiValidUntil} · vérifié via CARIF-OREF ·
            dernière vérification : {MOCK_OF_ORG.lastVerified}
          </p>
        </div>
        <button type="button" className="formations-hub-create" onClick={openCreateModal}>
          + Créer une formation
        </button>
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
          <button type="button" className="formations-hub-filter">Année ▾</button>
          <button type="button" className="formations-hub-filter">Mois ▾</button>
          <button type="button" className="formations-hub-filter">Financement ▾</button>
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
          Les partages en cours, la clôture et le suivi réglementaire vivent dans la fiche formation —
          le hub liste et oriente, il ne duplique rien.
        </div>
      </div>

      {isCreateModalOpen && (
        <FormationModal onClose={closeCreateModal} onSave={handleCreateFormation} />
      )}
    </section>
  );
};

export default FormationsHub;
