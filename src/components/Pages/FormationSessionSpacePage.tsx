import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { FormationSessionPerson } from '../../types/formationSession';
import {
  formatSessionDateFr,
  getSelectedSessionId,
  getSessionById,
  openSessionAffiche,
  sessionStatusLabel,
  subscribeFormationSessions,
  updateFormationSession,
} from '../../utils/formationSessionStore';
import { useToast } from '../../hooks/useToast';
import './FormationSessionSpacePage.css';

type SpaceTab = 'informations' | 'gestion';
type Visibility = 'structure' | 'financeur';

function sessionIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/formation-session-space\/([^/]+)\/?$/);
  return m?.[1] ?? getSelectedSessionId();
}

const FormationSessionSpacePage: React.FC = () => {
  const { pathname } = useLocation();
  const sessionId = sessionIdFromPath(pathname);
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess } = useToast();
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<SpaceTab>('gestion');
  const [visibility, setVisibility] = useState<Visibility>('structure');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'structure' | 'email'>('structure');
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

  const session = useMemo(
    () => (sessionId ? getSessionById(sessionId) : undefined),
    [sessionId, tick]
  );

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const goAffiche = () => {
    if (!session) return;
    openSessionAffiche(session.id);
    setCurrentPage('formation-affiche');
    navigate(`/formation-affiche/${session.id}`);
  };

  const toggleAttendance = () => {
    if (!session) return;
    updateFormationSession(session.id, {
      attendanceSurveyOptIn: !session.attendanceSurveyOptIn,
    });
    showSuccess(
      !session.attendanceSurveyOptIn
        ? 'Relevé de présence activé'
        : 'Relevé de présence désactivé'
    );
  };

  const addPerson = () => {
    if (!session || !inviteName.trim()) return;
    const person: FormationSessionPerson = {
      id: `p-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteMode === 'email' ? inviteEmail.trim() : undefined,
      role: 'intervenant',
      pending: inviteMode === 'email',
    };
    updateFormationSession(session.id, {
      people: [...session.people, person],
    });
    setInviteName('');
    setInviteEmail('');
    setInviteOpen(false);
    showSuccess('Personne ajoutée (mock)');
  };

  if (!session) {
    return (
      <div className="fss">
        <div className="fss-err">Session introuvable.</div>
        <button type="button" className="fss-btn s" onClick={goCatalogue}>
          Retour au catalogue
        </button>
      </div>
    );
  }

  const participants = session.people.filter((p) => p.role === 'participant');
  const team = session.people.filter((p) => p.role !== 'participant');
  const jury = session.people.filter((p) => p.role === 'jury');

  return (
    <div className="fss">
      <div className="fss-crumb">
        <button type="button" onClick={goCatalogue}>
          Catalogue
        </button>
        <span>›</span>
        <span>Espace session</span>
      </div>

      <header className="fss-hero">
        <div>
          <div className="fss-status">{sessionStatusLabel(session.status)}</div>
          <h1>{session.title}</h1>
          <p className="fss-meta">
            {formatSessionDateFr(session.startDate)} → {formatSessionDateFr(session.endDate)}
            {' · '}
            {session.formateur.name}
            {session.euMc ? ' · MC UE' : ''}
          </p>
        </div>
        <button type="button" className="fss-btn p" onClick={goAffiche}>
          Voir l’affiche →
        </button>
      </header>

      <div className="fss-vis">
        <button
          type="button"
          className={visibility === 'structure' ? 'on' : ''}
          onClick={() => setVisibility('structure')}
        >
          Structure
        </button>
        <button
          type="button"
          className={visibility === 'financeur' ? 'on' : ''}
          onClick={() => setVisibility('financeur')}
        >
          Financeur
        </button>
      </div>

      {visibility === 'financeur' && (
        <div className="fss-banner">
          Vue financeur (mock) — suivi allégé de la session, sans actions de gestion.
        </div>
      )}

      <div className="fss-tabs">
        <button
          type="button"
          className={tab === 'informations' ? 'on' : ''}
          onClick={() => setTab('informations')}
        >
          Informations
        </button>
        <button
          type="button"
          className={tab === 'gestion' ? 'on' : ''}
          onClick={() => setTab('gestion')}
          disabled={visibility === 'financeur'}
        >
          Gestion
        </button>
      </div>

      {tab === 'informations' && (
        <section className="fss-panel">
          <h2>Informations</h2>
          <dl className="fss-dl">
            <div>
              <dt>Organisme</dt>
              <dd>{session.orgName}</dd>
            </div>
            <div>
              <dt>Modalité</dt>
              <dd>{session.modality || '—'}</dd>
            </div>
            <div>
              <dt>Financement</dt>
              <dd>{session.financement || '—'}</dd>
            </div>
            <div>
              <dt>Durée fiche</dt>
              <dd>{session.durationHours ? `${session.durationHours} h` : '—'}</dd>
            </div>
            <div>
              <dt>Infos pratiques</dt>
              <dd>{session.practicalInfo || '—'}</dd>
            </div>
          </dl>
          {session.description && <p className="fss-desc">{session.description}</p>}
        </section>
      )}

      {tab === 'gestion' && visibility === 'structure' && (
        <section className="fss-panel">
          <div className="fss-block">
            <div className="fss-block-head">
              <h2>Participants</h2>
              <span className="fss-count">{participants.length}</span>
            </div>
            {participants.length === 0 ? (
              <p className="fss-muted">Aucun participant pour l’instant (import hors scope UI mock).</p>
            ) : (
              <ul className="fss-list">
                {participants.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    {p.email ? <span>{p.email}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="fss-block">
            <div className="fss-block-head">
              <h2>Formateurs & intervenants</h2>
              <button type="button" className="fss-btn s sm" onClick={() => setInviteOpen(true)}>
                Ajouter
              </button>
            </div>
            <ul className="fss-list">
              {team.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  <span>
                    {p.role}
                    {p.pending ? ' · invitation' : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fss-block">
            <div className="fss-block-head">
              <h2>Séances</h2>
              <button type="button" className="fss-link" onClick={goAffiche}>
                Gérer sur l’affiche →
              </button>
            </div>
            <ul className="fss-list">
              {session.seances.map((s) => (
                <li key={s.id}>
                  <strong>{s.label}</strong>
                  <span>
                    {formatSessionDateFr(s.dateIso)} · {s.timeRange}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="fss-block">
            <div className="fss-block-head">
              <h2>Présence</h2>
              <button type="button" className="fss-btn s sm" onClick={toggleAttendance}>
                {session.attendanceSurveyOptIn ? 'Oui' : 'Non'}
              </button>
            </div>
            <p className="fss-muted">
              {session.attendanceSurveyOptIn
                ? 'Relevé de présence activé — conformité Qualiopi (mock).'
                : 'Relevé de présence désactivé.'}
            </p>
          </div>

          <div className="fss-block">
            <h2>Jury</h2>
            {jury.length === 0 ? (
              <p className="fss-muted">Aucun membre du jury renseigné.</p>
            ) : (
              <ul className="fss-list">
                {jury.map((j) => (
                  <li key={j.id}>
                    <strong>{j.name}</strong>
                    <span>{j.functionLabel || 'Jury'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="fss-block">
            <h2>Documents</h2>
            <p className="fss-muted">Zone documents stub — à brancher API plus tard.</p>
          </div>
        </section>
      )}

      {inviteOpen && (
        <div className="fss-modal-backdrop" onClick={() => setInviteOpen(false)} role="presentation">
          <div className="fss-modal" onClick={(e) => e.stopPropagation()} role="dialog">
            <h2>Ajouter un intervenant</h2>
            <div className="fss-tabs sm">
              <button
                type="button"
                className={inviteMode === 'structure' ? 'on' : ''}
                onClick={() => setInviteMode('structure')}
              >
                Structure
              </button>
              <button
                type="button"
                className={inviteMode === 'email' ? 'on' : ''}
                onClick={() => setInviteMode('email')}
              >
                E-mail
              </button>
            </div>
            <label>
              Nom
              <input value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </label>
            {inviteMode === 'email' && (
              <label>
                E-mail
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </label>
            )}
            <div className="fss-actions">
              <button type="button" className="fss-btn s" onClick={() => setInviteOpen(false)}>
                Annuler
              </button>
              <button type="button" className="fss-btn p" onClick={addPerson}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationSessionSpacePage;
