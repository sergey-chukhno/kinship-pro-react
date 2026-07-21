import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FormationCard,
  FormationStatus,
  FinancementType,
  MOCK_OF_ORG,
} from '../../data/mockFormations';
import {
  getFormationById,
  getMockParticipants,
  getFormationSlots,
  ensureBaseFormationSlot,
  getOpenableFormationSlot,
  hasOpenableFormationSlot,
  updateFormationSlot,
  formatSlotDateLabel,
  getSelectedFormationId,
  setSelectedFormationId,
  subscribeFormations,
  subscribeFormationSlots,
  updateFormation,
  slotStatusLabel,
} from '../../utils/formationStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import FormationModal, { FormationFormData } from '../Modals/FormationModal';
import { useToast } from '../../hooks/useToast';
import { FormationSlot } from '../../utils/formationStore';
import './FormationDetail.css';

const STATUS_LABEL: Record<FormationStatus, string> = {
  draft: 'Brouillon',
  coming: 'À venir',
  in_progress: 'En cours',
  ended: 'Terminée',
  archived: 'Archivée',
};

const FINANCEMENT_CLASS: Record<FinancementType, string> = {
  CPF: 'cpf',
  OPCO: 'opco',
  Entreprise: 'entreprise',
  Associative: 'associative',
  Autre: 'autre',
};

function formatFrDate(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function isIsoDateToday(iso: string): boolean {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return iso === today;
}

type DetailTab = 'overview' | 'participants' | 'sessions';

const FormationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage, state } = useAppContext();
  const { showSuccess, showError } = useToast();
  const [formationId, setFormationId] = useState(() => getSelectedFormationId() || '');

  const [formation, setFormation] = useState<FormationCard | null>(
    () => getFormationById(formationId) ?? null
  );
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [participants, setParticipants] = useState(() =>
    getMockParticipants(formationId)
  );
  const [slots, setSlots] = useState<FormationSlot[]>(() => getFormationSlots(formationId));

  useEffect(() => {
    const id = getSelectedFormationId() || '';
    setFormationId(id);
    const f = getFormationById(id) ?? null;
    setFormation(f);
    setParticipants(getMockParticipants(id));
    if (id && f && (f.status === 'in_progress' || f.status === 'coming')) {
      const dateLabel = f.startDate
        ? formatSlotDateLabel(new Date(`${f.startDate}T12:00:00`))
        : formatSlotDateLabel();
      ensureBaseFormationSlot(id, {
        dateLabel,
        participantsCount: getMockParticipants(id).length,
      });
    }
    setSlots(getFormationSlots(id));
  }, []);

  useEffect(() => {
    return subscribeFormations(() => {
      const id = getSelectedFormationId() || '';
      setFormation(getFormationById(id) ?? null);
    });
  }, []);

  useEffect(() => {
    return subscribeFormationSlots(() => {
      const id = getSelectedFormationId() || formationId;
      if (id) setSlots(getFormationSlots(id));
    });
  }, [formationId]);

  const unverifiedCount = participants.filter((p) => !p.identityVerified).length;
  const isCpf = formation?.financement === 'CPF';
  const canEdit = formation?.status === 'draft' || formation?.status === 'coming';
  const canPublish = formation?.status === 'draft';
  const canOpenSession =
    formation?.status === 'in_progress' && hasOpenableFormationSlot(formation.id);
  const canClose = formation?.status === 'in_progress';
  const canSeePf =
    (formation?.status === 'ended' || formation?.status === 'archived') &&
    formation.hasProof;

  const backToHub = () => {
    if (state.showingPageType === 'edu' || state.showingPageType === 'pro') {
      setCurrentPage('formations');
      navigate('/formations');
      return;
    }
    setCurrentPage('dashboard');
    navigate('/dashboard');
  };

  const handlePublish = () => {
    if (!formation || formation.status !== 'draft') return;
    if (!formation.startDate || !formation.endDate) {
      showError('Renseignez les dates de début et de fin avant de publier (modifier).');
      return;
    }
    const startsToday = isIsoDateToday(formation.startDate);
    const status: FormationStatus = startsToday ? 'in_progress' : 'coming';
    const meta = startsToday
      ? `du ${formatFrDate(formation.startDate)} au ${formatFrDate(formation.endDate)} · en cours`
      : `du ${formatFrDate(formation.startDate)} au ${formatFrDate(formation.endDate)} · démarrage automatique le ${formatFrDate(formation.startDate)}`;
    const updated = updateFormation(formation.id, {
      status,
      meta,
    });
    if (updated) setFormation(updated);
    const dateLabel = formatSlotDateLabel(new Date(`${formation.startDate}T12:00:00`));
    ensureBaseFormationSlot(formation.id, {
      dateLabel,
      participantsCount: participants.length,
    });
    setSlots(getFormationSlots(formation.id));
    showSuccess(
      startsToday
        ? 'Formation publiée — elle apparaît dans En cours'
        : 'Formation publiée — elle apparaît dans À venir'
    );
  };

  const openSession = (opts?: { slot?: FormationSlot }) => {
    if (!formation) return;
    const participantsCount = participants.length || 0;

    const dateLabel = formation.startDate
      ? formatSlotDateLabel(new Date(`${formation.startDate}T12:00:00`))
      : formatSlotDateLabel();
    ensureBaseFormationSlot(formation.id, {
      dateLabel,
      participantsCount,
    });

    const slot = opts?.slot ?? getOpenableFormationSlot(formation.id);
    if (!slot || slot.status === 'closed') {
      showError('Cette session est clôturée et ne peut plus être rouverte.');
      setSlots(getFormationSlots(formation.id));
      return;
    }

    updateFormationSlot(formation.id, slot.id, { status: 'open', participantsCount });
    setSlots(getFormationSlots(formation.id));
    setActiveTab('sessions');

    openPresenceSession({
      formationId: formation.id,
      slotId: slot.id,
      formationTitle: formation.title,
      slotLabel: slot.label,
      sessionDateLabel: slot.dateLabel,
      confirmed: 0,
      total: participantsCount || 17,
    });
    setCurrentPage('presence-session');
    navigate('/presence-session');
  };

  const toggleIdentity = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId ? { ...p, identityVerified: !p.identityVerified } : p
      )
    );
  };

  const handleUpdate = (data: FormationFormData) => {
    if (!formation) return;
    const updated = updateFormation(formation.id, {
      title: data.title,
      description: data.description || undefined,
      financement: data.financement || undefined,
      isEuMcDeclared: data.isEuMcDeclared || undefined,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      attendanceSurveyOptIn: data.attendanceSurveyOptIn || undefined,
    });
    if (updated) setFormation(updated);
    setIsEditOpen(false);
    showSuccess('Formation mise à jour');
  };

  const handleCloseFormation = () => {
    if (!formation) return;
    if (isCpf && unverifiedCount > 0) {
      showError(
        "L'OF ne peut pas clore une formation CPF si des apprenants n'ont pas d'identité vérifiée."
      );
      return;
    }
    const proofNumber = formation.isEuMcDeclared
      ? `MC·UE·2026·FR·${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      : `PF·2026·FR·${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const updated = updateFormation(formation.id, {
      status: 'ended',
      hasProof: true,
      proofNumber,
      meta: `clôturée le ${new Date().toLocaleDateString('fr-FR')} · ${participants.length} participants · ${proofNumber}`,
      endDateOverdue: false,
    });
    if (updated) setFormation(updated);
    setShowCloseConfirm(false);
    showSuccess('Formation clôturée — les preuves de présence sont figées');
  };

  if (!formation) {
    return (
      <section className="formation-detail">
        <div className="formation-detail-top">
          <div className="formation-detail-header-left">
            <button
              type="button"
              className="back-button"
              onClick={backToHub}
              title="Retour aux formations"
            >
              <i className="fas fa-arrow-left" aria-hidden />
            </button>
            <h1>Formation</h1>
          </div>
        </div>
        <p className="formation-detail-empty">Formation introuvable.</p>
      </section>
    );
  }

  return (
    <section className="formation-detail" aria-label="Fiche formation">
      <div className="formation-detail-top">
        <div className="formation-detail-header-left">
          <button
            type="button"
            className="back-button"
            onClick={backToHub}
            title="Retour aux formations"
          >
            <i className="fas fa-arrow-left" aria-hidden />
          </button>
        </div>
        <div className="formation-detail-actions">
          {canPublish && (
            <button type="button" className="fd-btn primary" onClick={handlePublish}>
              Publier
            </button>
          )}
          {canEdit && (
            <button type="button" className="fd-btn" onClick={() => setIsEditOpen(true)}>
              Modifier
            </button>
          )}
          {canOpenSession && (
            <button type="button" className="fd-btn primary" onClick={() => openSession()}>
              Ouvrir la session de présence
            </button>
          )}
          {canClose && (
            <button
              type="button"
              className="fd-btn accent"
              onClick={() => setShowCloseConfirm(true)}
            >
              Clôturer la formation
            </button>
          )}
          {canSeePf && (
            <>
              <button
                type="button"
                className="fd-btn primary"
                onClick={() => {
                  setSelectedFormationId(formation.id);
                  setCurrentPage('preuve-formation');
                  navigate('/preuve-formation');
                }}
              >
                Consulter la PF
              </button>
              <button type="button" className="fd-btn">
                Partager la PF
              </button>
            </>
          )}
        </div>
      </div>

      <header className="formation-detail-hero">
        <div className="formation-detail-hero-row">
          <div>
            <h1>{formation.title}</h1>
            <p className="formation-detail-hero-meta">
              {MOCK_OF_ORG.name} · {formation.meta}
            </p>
          </div>
          <span className="formation-detail-status">
            ● {STATUS_LABEL[formation.status].toUpperCase()}
          </span>
        </div>
        <div className="formation-detail-badges">
          {formation.financement && (
            <span className={`fd-badge light ${FINANCEMENT_CLASS[formation.financement]}`}>
              {formation.financement}
            </span>
          )}
          {formation.isEuMcDeclared && (
            <span className="fd-badge light">MC UE déclarée</span>
          )}
          {formation.proofNumber && (
            <span className="fd-badge">{formation.proofNumber}</span>
          )}
        </div>
      </header>

      {formation.endDateOverdue && formation.status === 'in_progress' && (
        <div className="formation-detail-banner warn">
          Date de fin dépassée — clôturez la formation depuis cette fiche (jamais depuis le hub).
        </div>
      )}

      {isCpf &&
        unverifiedCount > 0 &&
        (formation.status === 'coming' || formation.status === 'in_progress') && (
          <div className="formation-detail-banner warn">
            ⚠ Identités à vérifier : {unverifiedCount} participant
            {unverifiedCount > 1 ? 's' : ''} — formation CPF : « Cette formation CPF ne peut pas
            démarrer. Veuillez vérifier l&apos;identité de tous vos apprenants. »
          </div>
        )}

      <div className="formation-detail-tabs" role="tablist">
        {(
          [
            { id: 'overview', label: 'Vue d’ensemble' },
            { id: 'participants', label: `Participants (${participants.length})` },
            { id: 'sessions', label: `Sessions (${slots.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`formation-detail-tab ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="formation-detail-grid">
          <div className="formation-detail-card">
            <h2>Informations</h2>
            <dl className="fd-info-list">
              <div className="fd-info-row">
                <dt>Type</dt>
                <dd>Formation</dd>
              </div>
              <div className="fd-info-row">
                <dt>Statut</dt>
                <dd>{STATUS_LABEL[formation.status]}</dd>
              </div>
              <div className="fd-info-row">
                <dt>Début</dt>
                <dd>{formatFrDate(formation.startDate)}</dd>
              </div>
              <div className="fd-info-row">
                <dt>Fin</dt>
                <dd>{formatFrDate(formation.endDate)}</dd>
              </div>
              <div className="fd-info-row">
                <dt>Financement</dt>
                <dd>{formation.financement || 'Non déclaré'}</dd>
              </div>
              <div className="fd-info-row">
                <dt>MC UE</dt>
                <dd>{formation.isEuMcDeclared ? 'Déclarée' : 'Non'}</dd>
              </div>
              {formation.proofNumber && (
                <div className="fd-info-row">
                  <dt>Preuve</dt>
                  <dd className="formation-detail-proof">{formation.proofNumber}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="formation-detail-card">
            <h2>Description</h2>
            <p className="formation-detail-desc">
              {formation.description ||
                'Aucune description renseignée pour cette formation.'}
            </p>

            {showCloseConfirm && canClose && (
              <div className="fd-close-box">
                Clôturer la formation ? Les présences confirmées seront figées et les preuves
                générées. La formation passera en Terminées. Cette action ne pourra pas être
                annulée.
                <div className="fd-close-actions">
                  <button type="button" className="fd-btn primary" onClick={handleCloseFormation}>
                    Clôturer la formation
                  </button>
                  <button
                    type="button"
                    className="fd-btn"
                    onClick={() => setShowCloseConfirm(false)}
                  >
                    Retour
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="formation-detail-card">
          <h2>Participants</h2>
          <p className="formation-detail-desc" style={{ marginBottom: 12 }}>
            Contrôle d&apos;identité par formation (la 26) : le formateur coche — Kinship ne demande
            ni ne stocke jamais la pièce. ✓ vert = vérifié · ⚠ orange = à vérifier.
          </p>
          {participants.length === 0 ? (
            <p className="formation-detail-empty">Aucun participant.</p>
          ) : (
            participants.map((p) => (
              <div key={p.id} className="fd-participant">
                <span className="fd-participant-name">{p.name}</span>
                <span className={`fd-identity ${p.identityVerified ? 'ok' : 'warn'}`}>
                  {p.identityVerified ? '✓ Identité vérifiée' : '⚠ À vérifier'}
                  {(formation.status === 'coming' || formation.status === 'in_progress') && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        className="fd-identity-btn"
                        onClick={() => toggleIdentity(p.id)}
                      >
                        {p.identityVerified ? 'Recocher' : 'Marquer vérifié'}
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="formation-detail-card">
          <div className="fd-sessions-header">
            <h2>Sessions de présence</h2>
          </div>
          {slots.length === 0 ? (
            <p className="formation-detail-empty">
              Aucun créneau pour l’instant.
            </p>
          ) : (
            slots.map((slot) => (
              <div key={slot.id} className="fd-slot">
                <div>
                  <div className="fd-slot-title">
                    {slot.label} · {slot.dateLabel}
                  </div>
                  <div className="fd-slot-meta">
                    {slot.timeRange} · {slot.participantsCount} participants ·{' '}
                    <span className={`fd-slot-status ${slot.status}`}>
                      {slotStatusLabel(slot.status)}
                    </span>
                  </div>
                </div>
                {canOpenSession && slot.status !== 'closed' && (
                  <button
                    type="button"
                    className="fd-btn primary"
                    onClick={() => openSession({ slot })}
                  >
                    {slot.status === 'open' ? 'Reprendre la session' : 'Ouvrir la session de présence'}
                  </button>
                )}
                {slot.status === 'closed' && (
                  <span className="fd-slot-closed-note">Session clôturée — non rouvrable</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <p className="formation-detail-footer-note">
        Les partages, la clôture et le suivi réglementaire vivent dans la fiche — le hub liste et
        oriente, il ne duplique rien.
      </p>

      {isEditOpen && (
        <FormationModal
          isEdit
          status={formation.status}
          onClose={() => setIsEditOpen(false)}
          onSave={handleUpdate}
          initialData={{
            title: formation.title,
            description: formation.description ?? '',
            projectKind: 'formation',
            financement: formation.financement ?? '',
            isEuMcDeclared: formation.isEuMcDeclared ?? false,
            startDate: formation.startDate ?? '',
            endDate: formation.endDate ?? '',
            attendanceSurveyOptIn: formation.attendanceSurveyOptIn ?? false,
          }}
        />
      )}
    </section>
  );
};

export default FormationDetail;
