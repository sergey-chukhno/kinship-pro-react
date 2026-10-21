import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { declareFormationSessionStart, getFormationSession } from '../../api/FormationSessions';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import {
  addSessionSeance,
  cacheFormationSession,
  formatSessionDateFr,
  getSelectedSessionId,
  getSessionById,
  getSessionViewerRole,
  openSessionSpace,
  participantCountLabel,
  sessionHeroStatus,
  subscribeFormationSessions,
} from '../../utils/formationSessionStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import { useToast } from '../../hooks/useToast';
import './FormationAffiche.css';
import './FormationSessionAffichePage.css';

type AfficheTab = 'overview' | 'seances' | 'participants' | 'equipe';

const TABS: { id: AfficheTab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'seances', label: 'Séances' },
  { id: 'participants', label: 'Participants' },
  { id: 'equipe', label: 'Équipe' },
];

function afficheIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/formation-affiche\/([^/]+)\/?$/);
  return m?.[1] ?? null;
}

const FormationSessionAffichePage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state, setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const pathId = afficheIdFromPath(pathname);
  const sessionId = pathId || getSelectedSessionId();
  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<AfficheTab>('seances');
  const [declareOpen, setDeclareOpen] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [seanceLabel, setSeanceLabel] = useState('');
  const [seanceDate, setSeanceDate] = useState('');

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    getFormationSession(sessionId, org?.name || '')
      .then((s) => {
        if (cancelled || !s) return;
        const prev = getSessionById(s.id);
        cacheFormationSession({
          ...s,
          attendanceSurveyOptIn: prev?.attendanceSurveyOptIn ?? s.attendanceSurveyOptIn,
          seances: prev?.seances?.length ? prev.seances : s.seances,
          people: prev?.people?.length ? prev.people : s.people,
        });
        setTick((n) => n + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, org?.name]);

  const session = useMemo(
    () => (sessionId ? getSessionById(sessionId) : undefined),
    [sessionId, tick]
  );
  const viewerRole = getSessionViewerRole();
  const currentUserId = state.user?.id != null ? Number(state.user.id) : null;
  const isResponsibleTrainer =
    session?.formateur.userId != null &&
    currentUserId != null &&
    Number(session.formateur.userId) === currentUserId;

  const back = () => {
    if (!sessionId) {
      setCurrentPage('catalogue-formations');
      navigate('/catalogue-formations');
      return;
    }
    openSessionSpace(sessionId, 'gestion');
    setCurrentPage('formation-session-space');
    navigate(`/formation-session-space/${sessionId}`);
  };

  const onDeclare = async () => {
    if (!session) return;
    setDeclaring(true);
    try {
      const updated = await declareFormationSessionStart(session.id);
      cacheFormationSession({
        ...updated,
        attendanceSurveyOptIn: session.attendanceSurveyOptIn,
        seances: session.seances,
        people: session.people,
      });
      setDeclareOpen(false);
      showSuccess('Début de session déclaré');
      setTick((n) => n + 1);
    } catch (e: any) {
      showError(e?.message || 'Déclaration impossible.');
    } finally {
      setDeclaring(false);
    }
  };

  const onCreateSeance = () => {
    if (!session || !seanceLabel.trim() || !seanceDate) return;
    addSessionSeance(session.id, {
      label: seanceLabel.trim(),
      dateIso: seanceDate,
    });
    setCreateOpen(false);
    setSeanceLabel('');
    setSeanceDate('');
    showSuccess('Séance créée');
  };

  const openPresence = () => {
    if (!session) return;
    const seance = session.seances[0];
    const pCount = session.people.filter((p) => p.role === 'participant').length;
    openPresenceSession({
      formationId: session.id,
      slotId: seance?.id || 'slot-demo',
      formationTitle: session.title,
      slotLabel: seance?.label || 'Séance',
      sessionDateLabel: formatSessionDateFr(seance?.dateIso || session.startDate),
      confirmed: 0,
      total: Math.max(1, pCount),
    });
    showSuccess('Session de présence ouverte (mock)');
  };

  if (!session) {
    return (
      <section className="fa-page fa-session fsa-page">
        <button type="button" className="fa-back" onClick={back}>
          ←
        </button>
        <p>Session introuvable.</p>
      </section>
    );
  }

  const hero = sessionHeroStatus(session);
  const statusChip =
    hero === 'in_progress' ? 'EN COURS' : hero === 'ended' ? 'TERMINÉE' : 'À VENIR';
  const participants = session.people.filter((p) => p.role === 'participant');
  const team = session.people.filter((p) => p.role === 'formateur' || p.role === 'intervenant');
  const modalityLabel =
    session.modality === 'presentiel'
      ? 'Présentiel'
      : session.modality === 'distanciel'
        ? 'Distanciel'
        : session.modality === 'hybride'
          ? 'Hybride'
          : session.modality || '';

  const showDeclareCta =
    (viewerRole === 'formateur' || isResponsibleTrainer) && !session.startDeclared;
  const showPresenceCta =
    (viewerRole === 'formateur' || isResponsibleTrainer) &&
    session.startDeclared &&
    session.attendanceSurveyOptIn;
  const showCreateSeanceCta = viewerRole === 'structure' && !isResponsibleTrainer;

  const primaryCta = showDeclareCta
    ? {
        label: 'Déclarer le début de la session',
        amber: true,
        onClick: () => setDeclareOpen(true),
      }
    : showPresenceCta
      ? {
          label: 'Ouvrir la session de présence',
          amber: false,
          onClick: openPresence,
        }
      : showCreateSeanceCta
        ? {
            label: '+ Créer une séance',
            amber: false,
            onClick: () => {
              setSeanceDate(session.startDate);
              setCreateOpen(true);
            },
          }
        : null;

  return (
    <section className="fa-page fa-session fsa-page" aria-label="Affiche de la session">
      <div className="fa-head">
        <button type="button" className="fa-back" onClick={back} aria-label="Retour">
          ←
        </button>
        <h1>Affiche de la session</h1>
        <div className="fa-actions">
          {primaryCta && (
            <button
              type="button"
              className={`fa-btn ${primaryCta.amber ? 'amber' : 'primary'}`}
              onClick={primaryCta.onClick}
            >
              {primaryCta.label}
            </button>
          )}
        </div>
      </div>

      <header className="fa-hero fa-hero-session">
        <div className="fa-hbody">
          <div className="fa-staterow">
            <span className={`fa-chip ${statusChip === 'EN COURS' ? 'run' : 'come'}`}>
              {statusChip}
            </span>
            <span className="fa-chip date">
              {formatSessionDateFr(session.startDate)} → {formatSessionDateFr(session.endDate)}
            </span>
          </div>
          <h2 className="fa-title">{session.title}</h2>
          {(session.orgName || org?.name || modalityLabel || session.financement) && (
            <p className="fa-org">
              {[session.orgName || org?.name, session.financement, modalityLabel]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {session.description ? <p className="fa-desc">{session.description}</p> : null}
          <p className="fa-meta fsa-meta-line">
            <span>Formateur responsable {session.formateur.name}</span>
            <span aria-hidden="true"> · </span>
            <span>{participantCountLabel(participants.length)}</span>
            <span aria-hidden="true"> · </span>
            <span>
              {session.seances.length} séance{session.seances.length > 1 ? 's' : ''}
            </span>
          </p>
        </div>
      </header>

      {!session.startDeclared && (
        <div className="fsa-note">
          Début à déclarer par {session.formateur.name}, formateur responsable. Les inscriptions
          restent ouvertes.
        </div>
      )}

      <nav className="fa-tabs" aria-label="Onglets affiche">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'on' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="fa-panel fsa-panel">
        {tab === 'overview' && (
          <>
            <h3 className="fsa-h">La session</h3>
            <dl className="fsa-dl">
              <div>
                <dt>Dates</dt>
                <dd>
                  {formatSessionDateFr(session.startDate)} →{' '}
                  {formatSessionDateFr(session.endDate)}
                </dd>
              </div>
              <div>
                <dt>Formateur responsable</dt>
                <dd>{session.formateur.name}</dd>
              </div>
              {modalityLabel ? (
                <div>
                  <dt>Modalité</dt>
                  <dd>{modalityLabel}</dd>
                </div>
              ) : null}
              {session.financement ? (
                <div>
                  <dt>Financement</dt>
                  <dd>{session.financement}</dd>
                </div>
              ) : null}
              {session.practicalInfo ? (
                <div>
                  <dt>Informations pratiques</dt>
                  <dd>{session.practicalInfo}</dd>
                </div>
              ) : null}
              <div>
                <dt>Présences suivies</dt>
                <dd>{session.attendanceSurveyOptIn ? 'Oui' : 'Non'}</dd>
              </div>
            </dl>
          </>
        )}

        {tab === 'seances' && (
          <>
            <div className="fsa-rowhead">
              <h3 className="fsa-h">Séances ({session.seances.length})</h3>
              {viewerRole === 'structure' && (
                <button
                  type="button"
                  className="fa-btn ghost"
                  onClick={() => {
                    setSeanceDate(session.startDate);
                    setCreateOpen(true);
                  }}
                >
                  + Créer une séance
                </button>
              )}
            </div>
            {session.seances.length === 0 ? null : (
              <ul className="fsa-list">
                {session.seances.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.label}</strong>
                      <div className="fa-sub">
                        {[
                          formatSessionDateFr(s.dateIso),
                          s.timeRange,
                          s.place,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    <span className="fsa-st">{s.status === 'planned' ? 'planifiée' : s.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'participants' && (
          <>
            <h3 className="fsa-h">Participants ({participants.length})</h3>
            {participants.length > 0 && (
              <ul className="fsa-list">
                {participants.map((p) => (
                  <li key={p.id}>
                    <strong>{p.name}</strong>
                    <span className="fsa-st">{p.pending ? 'en attente' : 'inscrit'}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'equipe' && (
          <>
            <h3 className="fsa-h">Équipe ({team.length})</h3>
            <ul className="fsa-list">
              {team.map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  <span className="fsa-st">
                    {p.role === 'formateur' ? 'formateur responsable' : 'intervenant'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {declareOpen && (
        <div
          className="fa-modal-backdrop"
          role="presentation"
          onClick={() => setDeclareOpen(false)}
        >
          <div
            className="fa-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fsa-declare-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fsa-declare-title">Déclarer le début de la session ?</h2>
            <p>
              {session.title} — {participantCountLabel(participants.length)} · du{' '}
              {formatSessionDateFr(session.startDate)} au {formatSessionDateFr(session.endDate)}.
            </p>
            <div className="fa-fige">
              Les participants sont informés. Le financeur associé est informé du début. Les dates ne
              se modifient plus.
            </div>
            <div className="fa-dialog-actions">
              <button type="button" className="fa-btn ghost" onClick={() => setDeclareOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="fa-btn amber"
                disabled={declaring}
                onClick={() => void onDeclare()}
              >
                {declaring ? 'Déclaration…' : 'Déclarer le début'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div
          className="fa-modal-backdrop"
          role="presentation"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="fa-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Créer une séance</h2>
            <label className="fsa-field">
              Intitulé
              <input
                value={seanceLabel}
                onChange={(e) => setSeanceLabel(e.target.value)}
                placeholder="Séance 2"
              />
            </label>
            <label className="fsa-field">
              Date
              <input
                type="date"
                value={seanceDate}
                onChange={(e) => setSeanceDate(e.target.value)}
              />
            </label>
            <div className="fa-dialog-actions">
              <button type="button" className="fa-btn ghost" onClick={() => setCreateOpen(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="fa-btn primary"
                disabled={!seanceLabel.trim() || !seanceDate}
                onClick={onCreateSeance}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FormationSessionAffichePage;
