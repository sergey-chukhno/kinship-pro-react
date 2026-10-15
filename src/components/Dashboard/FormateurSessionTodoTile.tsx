import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  declareSessionStart,
  formatSessionDateFr,
  getFormationSessions,
  getSessionsNeedingStartDeclaration,
  openSessionAffiche,
  subscribeFormationSessions,
} from '../../utils/formationSessionStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import { useToast } from '../../hooks/useToast';
import './CatalogueSessionTodoTile.css';
import './FormateurSessionTodoTile.css';

/** TB formateur P4.9 — À faire (pattern School/Company). */
const FormateurSessionTodoTile: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [tick, setTick] = useState(0);

  useEffect(
    () => subscribeFormationSessions(() => setTick((n) => n + 1)),
    []
  );

  const needingStart = useMemo(() => {
    void tick;
    return getSessionsNeedingStartDeclaration();
  }, [tick]);

  const upcoming = useMemo(() => {
    void tick;
    return getFormationSessions()
      .filter((s) => s.status === 'coming' && !needingStart.some((n) => n.id === s.id))
      .slice(0, 1);
  }, [tick, needingStart]);

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
          declareSessionStart(session.id);
          showSuccess('Début de session déclaré');
          openSessionAffiche(session.id);
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${session.id}`);
        },
      });
    });

    const presenceSession = getFormationSessions().find(
      (s) => s.status === 'in_progress' || (s.startDeclared && s.status !== 'ended')
    );
    if (presenceSession) {
      const seance = presenceSession.seances[0];
      list.push({
        id: `pres-${presenceSession.id}`,
        accent: '#115E59',
        kicker: seance
          ? `Aujourd'hui · ${seance.timeRange.split('—')[0]?.trim() || '9h00'} — ${seance.place || 'Salle'}`
          : "Aujourd'hui",
        title: seance ? `${seance.label}` : 'Séance du jour',
        sub: `${presenceSession.title} · ${Math.max(1, presenceSession.people.filter((p) => p.role === 'participant').length)} participants`,
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
            total: Math.max(
              1,
              presenceSession.people.filter((p) => p.role === 'participant').length
            ),
          });
          openSessionAffiche(presenceSession.id);
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
          openSessionAffiche(presenceSession.id);
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${presenceSession.id}`);
        },
      });
    }

    upcoming.forEach((session) => {
      list.push({
        id: `up-${session.id}`,
        accent: '#1F6FA3',
        kicker: `Début prévu le ${formatSessionDateFr(session.startDate)}`,
        title: session.title,
        sub: `${session.people.filter((p) => p.role === 'participant').length || 0} participants inscrits · ${session.seances.length} séance${session.seances.length > 1 ? 's' : ''} planifiée${session.seances.length > 1 ? 's' : ''}`,
        cta: "Voir l'affiche →",
        onClick: () => {
          openSessionAffiche(session.id);
          setCurrentPage('formation-affiche');
          navigate(`/formation-affiche/${session.id}`);
        },
      });
    });

    return list.slice(0, 3);
  }, [needingStart, upcoming, navigate, setCurrentPage, showSuccess]);

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
      <div className="fst-quick">
        <div className="fst-quick-label">Actions rapides</div>
        <button
          type="button"
          className="fst-btn"
          onClick={() => {
            const s = getFormationSessions()[0];
            if (!s) return;
            openSessionAffiche(s.id);
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
            const s = getFormationSessions()[0];
            if (!s) return;
            openSessionAffiche(s.id);
            setCurrentPage('formation-affiche');
            navigate(`/formation-affiche/${s.id}`);
          }}
        >
          ＋ Clôturer la séance
        </button>
      </div>
    </section>
  );
};

export default FormateurSessionTodoTile;
