import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  declareSessionStart,
  formatSessionDateFr,
  getSessionsNeedingStartDeclaration,
  openSessionAffiche,
  subscribeFormationSessions,
} from '../../utils/formationSessionStore';
import { openPresenceSession } from '../../utils/presenceSessionStore';
import { useToast } from '../../hooks/useToast';
import './CatalogueSessionTodoTile.css';
import './FormateurSessionTodoTile.css';

/** TB formateur P4.9 — À faire + actions rapides (mock School/Company). */
const FormateurSessionTodoTile: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [sessions, setSessions] = useState(() => getSessionsNeedingStartDeclaration());

  useEffect(
    () => subscribeFormationSessions(() => setSessions(getSessionsNeedingStartDeclaration())),
    []
  );

  if (sessions.length === 0) return null;

  const session = sessions[0];

  const goAffiche = () => {
    openSessionAffiche(session.id);
    setCurrentPage('formation-affiche');
    navigate(`/formation-affiche/${session.id}`);
  };

  const declareStart = () => {
    declareSessionStart(session.id);
    showSuccess('Début de session déclaré');
    goAffiche();
  };

  const openPresence = () => {
    const seance = session.seances[0];
    openPresenceSession({
      formationId: session.id,
      slotId: seance?.id || 'slot-demo',
      formationTitle: session.title,
      slotLabel: seance?.label || 'Séance',
      sessionDateLabel: formatSessionDateFr(seance?.dateIso || session.startDate),
      confirmed: 0,
      total: Math.max(1, session.people.filter((p) => p.role === 'participant').length),
    });
    goAffiche();
  };

  return (
    <section className="fst-section" aria-label="À faire formateur">
      <h3 className="cst-heading">À faire · Formateur</h3>
      <button type="button" className="cst-card fst-card" onClick={declareStart}>
        <div className="cst-kicker">Session</div>
        <div className="cst-title">{session.title}</div>
        <div className="cst-sub">
          Début prévu le {formatSessionDateFr(session.startDate)} — déclarer le début pour ouvrir
          les séances.
        </div>
        <div className="cst-cta">Déclarer le début de la session →</div>
      </button>
      <div className="fst-actions">
        <button type="button" className="fst-btn" onClick={openPresence}>
          Ouvrir session de présence
        </button>
        <button type="button" className="fst-btn" onClick={goAffiche}>
          Clôturer la séance →
        </button>
      </div>
    </section>
  );
};

export default FormateurSessionTodoTile;
