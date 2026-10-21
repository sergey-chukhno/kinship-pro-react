import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { syncOrgFormationSessions } from '../../api/FormationSessions';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import type { FormationSession } from '../../types/formationSession';
import {
  formatSessionDateFr,
  getFormationSessions,
  getSessionsNeedingStartDeclaration,
  openSessionAffiche,
  participantCountLabel,
  sessionHeroStatus,
  subscribeFormationSessions,
} from '../../utils/formationSessionStore';
import {
  frenchCountLabel,
  getSelectedOrganizationContext,
  initialsFromOrgName,
} from '../../utils/qualiopiOrg';
import CatalogueSessionTodoTile from './CatalogueSessionTodoTile';
import './CatalogueSessionTodoTile.css';
import './FormationOrgDashboard.css';

function statusChip(session: FormationSession): { label: string; cls: string } {
  const h = sessionHeroStatus(session);
  if (h === 'in_progress') return { label: 'EN COURS', cls: 'run' };
  if (h === 'ended') return { label: 'CLÔTURÉE', cls: 'end' };
  return { label: 'À VENIR', cls: 'come' };
}

/**
 * P4.0 — TB organisme de formation (admins Qualiopi School/Company).
 * Données réelles ; sections vides masquées.
 */
const FormationOrgDashboard: React.FC = () => {
  const { state, setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const contextKey =
    location.search ||
    `${localStorage.getItem('selectedContextType')}-${localStorage.getItem('selectedContextId')}`;

  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType, contextKey]
  );
  const orgCtx = useMemo(
    () => getSelectedOrganizationContext(state.user, state.showingPageType),
    [state.user, state.showingPageType, contextKey]
  );

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!org) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.resolve(syncOrgFormationSessions(org))
      .then(() => {
        if (!cancelled) setTick((n) => n + 1);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [org?.key]);

  const sessions = useMemo(() => {
    void tick;
    return getFormationSessions().filter((s) => sessionHeroStatus(s) !== 'ended');
  }, [tick]);

  const needingStart = useMemo(() => {
    void tick;
    return getSessionsNeedingStartDeclaration();
  }, [tick]);

  const inProgress = sessions.filter((s) => sessionHeroStatus(s) === 'in_progress');
  const coming = sessions.filter((s) => sessionHeroStatus(s) === 'coming');

  const trainerCount = useMemo(() => {
    const ids = new Set<number>();
    sessions.forEach((s) => {
      if (s.formateur.userId != null) ids.add(Number(s.formateur.userId));
    });
    return ids.size;
  }, [sessions]);

  const participantTotal = useMemo(
    () =>
      sessions.reduce(
        (acc, s) => acc + s.people.filter((p) => p.role === 'participant').length,
        0
      ),
    [sessions]
  );

  const orgName = orgCtx?.name || org?.name || 'Organisme';
  const initials = initialsFromOrgName(orgName);
  const firstName = state.user.name.split(' ')[0] || '';

  const openSession = (id: string) => {
    openSessionAffiche(id, 'structure');
    setCurrentPage('formation-affiche');
    navigate(`/formation-affiche/${id}`);
  };

  const kpis: Array<{ value: number; label: string; color: string }> = [];
  if (inProgress.length > 0) {
    kpis.push({
      value: inProgress.length,
      label: frenchCountLabel(inProgress.length, 'session en cours', 'sessions en cours'),
      color: '#115E59',
    });
  }
  if (coming.length > 0) {
    kpis.push({
      value: coming.length,
      label: frenchCountLabel(coming.length, 'session à venir', 'sessions à venir'),
      color: '#1F6FA3',
    });
  }
  if (participantTotal > 0) {
    kpis.push({
      value: participantTotal,
      label: frenchCountLabel(participantTotal, 'participant en formation', 'participants en formation'),
      color: '#5B6FE9',
    });
  }
  if (trainerCount > 0) {
    kpis.push({
      value: trainerCount,
      label: frenchCountLabel(trainerCount, 'formateur', 'formateurs'),
      color: '#5B6FE9',
    });
  }

  return (
    <section className="fod dashboard-main-layout active" aria-label="Tableau de bord formation">
      <div className="fod-head">
        <div className="fod-slogo" aria-hidden>
          {initials}
        </div>
        <div>
          <h1 className="fod-hello">Bonjour {firstName} !</h1>
          <div className="fod-who">
            Tableau de bord de {orgName}
            {orgCtx?.qualiopi ? (
              <span className="fod-trust">✓ Organisme de formation certifié</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="fod-todo-wrap">
        <CatalogueSessionTodoTile />
        {needingStart.length > 0 && (
          <div className="cst-section fod-declare-section" aria-label="Débuts à déclarer">
            <div className="fod-declare-grid">
              {needingStart.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className="cst-card"
                  style={{ ['--c' as string]: '#8A5A00' }}
                  onClick={() => openSession(session.id)}
                >
                  <div className="cst-kicker">
                    Début à déclarer · {session.formateur.name}
                  </div>
                  <div className="cst-title">{session.title}</div>
                  <div className="cst-sub">
                    La date de début, le {formatSessionDateFr(session.startDate)}, est passée ; le
                    début reste à déclarer par {session.formateur.name}, formateur responsable.
                  </div>
                  <div className="cst-cta">Voir la session →</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {kpis.length > 0 && (
        <div className="fod-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="fod-kp" style={{ ['--c' as string]: k.color }}>
              <div className="fod-kp-v">{k.value}</div>
              <div className="fod-kp-l">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div className="fod-box">
          <div className="fod-sec">
            <h2>Sessions en cours et à venir</h2>
          </div>
          {loading && <p className="fod-muted">Chargement…</p>}
          {!loading &&
            sessions.map((session) => {
              const chip = statusChip(session);
              const participants = session.people.filter((p) => p.role === 'participant').length;
              return (
                <button
                  key={session.id}
                  type="button"
                  className="fod-pr"
                  onClick={() => openSession(session.id)}
                >
                  <div className="fod-cov" />
                  <div className="fod-pr-body">
                    <div className="fod-pn">
                      {session.title}
                      <span className={`fod-st ${chip.cls}`}>{chip.label}</span>
                    </div>
                    <div className="fod-pm">
                      {formatSessionDateFr(session.startDate)} →{' '}
                      {formatSessionDateFr(session.endDate)} · {session.formateur.name}
                    </div>
                  </div>
                  <div className="fod-num">
                    {participants > 0 ? participantCountLabel(participants) : 'Voir →'}
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </section>
  );
};

export default FormationOrgDashboard;
