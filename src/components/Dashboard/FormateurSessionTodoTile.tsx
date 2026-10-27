import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syncOrgFormationSessions } from '../../api/FormationSessions';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import {
  formatSessionDateFr,
  getFormationSessions,
  getSessionsNeedingStartDeclaration,
  openSessionAffiche,
  participantCountLabel,
  subscribeFormationSessions,
} from '../../utils/formationSessionStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import './CatalogueSessionTodoTile.css';
import './FormateurSessionTodoTile.css';

function formatParticipantLine(count: number, title: string): string {
  return `${title} · ${participantCountLabel(count)}`;
}

/** TB formateur P4.9 — sessions API syncées ; présence/clôture si Présences = Oui. */
const FormateurSessionTodoTile: React.FC = () => {
  const { state, setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );
  const currentUserId = state.user?.id != null ? Number(state.user.id) : null;

  useEffect(() => subscribeFormationSessions(() => setTick((n) => n + 1)), []);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    Promise.resolve(syncOrgFormationSessions(org))
      .then(() => {
        if (!cancelled) setTick((n) => n + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [org?.key]);

  const mine = useMemo(() => {
    void tick;
    const all = getFormationSessions();
    if (currentUserId == null) return all;
    return all.filter(
      (s) => s.formateur.userId == null || Number(s.formateur.userId) === currentUserId
    );
  }, [tick, currentUserId]);

  const needingStart = useMemo(() => {
    void tick;
    const ids = new Set(mine.map((s) => s.id));
    return getSessionsNeedingStartDeclaration().filter((s) => ids.has(s.id));
  }, [tick, mine]);

  const upcoming = useMemo(() => {
    return mine
      .filter((s) => !s.startDeclared && !needingStart.some((n) => n.id === s.id))
      .slice(0, 1);
  }, [mine, needingStart]);

  const cards = useMemo(() => {
    const list: Array<{
      id: string;
      accent: string;
      kicker: string;
      title: string;
      sub: string;
      cta: string;
      amber?: boolean;
      onClick: () => void;
    }> = [];

    needingStart.forEach((session, idx) => {
      list.push({
        id: `start-${session.id}`,
        accent: '#8A5A00',
        kicker: `Début prévu le ${formatSessionDateFr(session.startDate)} — passé`,
        title: session.title,
        sub: "La session n'a pas commencé : son début est à déclarer. Les inscriptions restent ouvertes.",
        cta: 'Déclarer le début de la session →',
        amber: idx === 0,
        onClick: () => {
          openSessionAffiche(session.id, 'formateur');
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${session.id}`);
        },
      });
    });

    const presenceSession = mine.find(
      (s) => s.startDeclared && s.attendanceSurveyOptIn && s.status !== 'ended'
    );
    if (presenceSession) {
      const seance = presenceSession.seances[0];
      const pCount = presenceSession.people.filter((p) => p.role === 'participant').length;
      list.push({
        id: `pres-${presenceSession.id}`,
        accent: '#115E59',
        kicker: seance
          ? `Aujourd'hui · ${seance.timeRange.split('—')[0]?.trim() || '9h00'}${seance.place ? ` — ${seance.place}` : ''}`
          : "Aujourd'hui",
        title: seance ? seance.label : 'Séance du jour',
        sub: formatParticipantLine(pCount, presenceSession.title),
        cta: 'Ouvrir la session de présence →',
        amber: list.every((c) => !c.amber),
        onClick: () => {
          openPresenceSession({
            formationId: presenceSession.id,
            slotId: seance?.id || 'slot-demo',
            formationTitle: presenceSession.title,
            slotLabel: seance?.label || 'Séance',
            sessionDateLabel: formatSessionDateFr(seance?.dateIso || presenceSession.startDate),
            confirmed: 0,
            total: Math.max(1, pCount),
          });
          openSessionAffiche(presenceSession.id, 'formateur');
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${presenceSession.id}`);
        },
      });
      list.push({
        id: `close-${presenceSession.id}`,
        accent: '#B8432A',
        kicker: 'À la fin de la séance',
        title: 'Clôturer la séance',
        sub: 'Les présences se figent à la clôture de la séance.',
        cta: 'Clôturer la séance →',
        onClick: () => {
          openSessionAffiche(presenceSession.id, 'formateur');
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${presenceSession.id}`);
        },
      });
    }

    upcoming.forEach((session) => {
      const pCount = session.people.filter((p) => p.role === 'participant').length;
      list.push({
        id: `up-${session.id}`,
        accent: '#1F6FA3',
        kicker: `Début prévu le ${formatSessionDateFr(session.startDate)}`,
        title: session.title,
        sub: `${participantCountLabel(pCount)} · ${session.seances.length} séance${session.seances.length > 1 ? 's' : ''} planifiée${session.seances.length > 1 ? 's' : ''}`,
        cta: "Voir l'affiche →",
        onClick: () => {
          openSessionAffiche(session.id, 'formateur');
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${session.id}`);
        },
      });
    });

    return list.slice(0, 3);
  }, [needingStart, upcoming, mine, navigate, setCurrentPage]);

  const showPresenceQuick = mine.some(
    (s) => s.startDeclared && s.attendanceSurveyOptIn && s.status !== 'ended'
  );

  if (cards.length === 0) return null;

  return (
    <section className="fst-section" aria-label="À faire formateur">
      <h3 className="cst-heading">À faire</h3>
      <div className="fst-grid">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="cst-card"
            style={{ ['--c' as string]: card.accent }}
            onClick={card.onClick}
          >
            <div className="cst-kicker">{card.kicker}</div>
            <div className="cst-title">{card.title}</div>
            <div className="cst-sub">{card.sub}</div>
            <div className={`cst-cta ${card.amber ? 'amber' : ''}`}>{card.cta}</div>
          </button>
        ))}
      </div>
      {showPresenceQuick && (
        <div className="fst-quick">
          <div className="fst-quick-label">Actions rapides</div>
          <button
            type="button"
            className="fst-btn"
            onClick={() => {
              const s = mine.find((x) => x.startDeclared && x.attendanceSurveyOptIn);
              if (!s) return;
              openSessionAffiche(s.id, 'formateur');
              setCurrentPage('formation-affiche');
              navigate(`/formation-affiche/${s.id}`);
            }}
          >
            ＋ Ouvrir la session de présence
          </button>
          <button
            type="button"
            className="fst-btn"
            onClick={() => {
              const s = mine.find((x) => x.startDeclared && x.attendanceSurveyOptIn);
              if (!s) return;
              openSessionAffiche(s.id, 'formateur');
              setCurrentPage('formation-affiche');
              navigate(`/formation-affiche/${s.id}`);
            }}
          >
            ＋ Clôturer la séance
          </button>
        </div>
      )}
    </section>
  );
};

export default FormateurSessionTodoTile;
