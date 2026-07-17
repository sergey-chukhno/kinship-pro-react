import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  ActivePresenceSession,
  closePresenceSession,
  formatCodeDisplay,
  generateCode,
  getPresenceSession,
  openPresenceSession,
  subscribePresenceSession,
  updatePresenceSession,
} from '../../utils/presenceSessionStore';
import './PresenceSessionPage.css';

type ViewMode = 'live' | 'relaunch' | 'confirm-close' | 'closed';

const CODE_PERIOD_S = 30;

const PresenceSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const [session, setSession] = useState<ActivePresenceSession>(() => {
    const existing = getPresenceSession();
    if (existing.status === 'open' || existing.status === 'closed') return existing;
    return openPresenceSession();
  });
  const [view, setView] = useState<ViewMode>(() =>
    getPresenceSession().status === 'closed' ? 'closed' : 'live'
  );
  const [secondsLeft, setSecondsLeft] = useState(CODE_PERIOD_S);
  const [relaunchMotif, setRelaunchMotif] = useState('');

  useEffect(() => subscribePresenceSession(setSession), []);

  const rotateCode = useCallback(() => {
    const next = generateCode();
    setSession(updatePresenceSession({ code: next }));
    setSecondsLeft(CODE_PERIOD_S);
  }, []);

  useEffect(() => {
    if (view !== 'live' || session.status !== 'open') return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          rotateCode();
          return CODE_PERIOD_S;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [view, session.status, rotateCode]);

  const handleRelaunch = () => {
    // Événement non terminal : compteur repart, présences acquises restent ; motif facultatif
    void relaunchMotif;
    setSession(updatePresenceSession({ code: generateCode() }));
    setSecondsLeft(CODE_PERIOD_S);
    setRelaunchMotif('');
    setView('live');
  };

  const handleClose = () => {
    setSession(closePresenceSession());
    setView('closed');
  };

  const backToHub = () => {
    setCurrentPage('dashboard');
    navigate('/dashboard');
  };

  const withoutInput = Math.max(0, session.total - session.confirmed);
  const timerPct = (secondsLeft / CODE_PERIOD_S) * 100;

  return (
    <section className="presence-session-page" aria-label="Session de présence">
      <div className="presence-session-card">
        <header className="presence-session-header">
          <div>
            <h1>Session de présence — {session.slotLabel}</h1>
            <p>
              {session.formationTitle} · Session du {session.sessionDateLabel}
            </p>
          </div>
          <div className="presence-session-badge">
            {view === 'closed' || session.status === 'closed' ? '○ CLÔTURÉE' : '● EN COURS'}
          </div>
        </header>

        {view === 'live' && (
          <>
            <div className="presence-session-body">
              <div className="presence-session-hint">Saisissez ce code depuis votre compte</div>
              <div className="presence-session-code" aria-live="polite">
                {formatCodeDisplay(session.code)}
              </div>
              <div className="presence-session-timer">
                <div className="presence-session-timer-bar" aria-hidden="true">
                  <div className="presence-session-timer-fill" style={{ width: `${timerPct}%` }} />
                </div>
                Nouveau code dans {secondsLeft} s
              </div>
              <div className="presence-session-counter">
                <span className="n">{session.confirmed}</span>
                <span className="label"> / {session.total} présences confirmées</span>
              </div>
            </div>
            <footer className="presence-session-footer">
              <button type="button" className="presence-btn" onClick={() => setView('relaunch')}>
                ↻ Relancer la session
              </button>
              <button type="button" className="presence-btn primary" onClick={() => setView('confirm-close')}>
                Clôturer la session
              </button>
            </footer>
          </>
        )}

        {view === 'relaunch' && (
          <div className="presence-panel">
            <div className="presence-panel-title">Relancer la session ?</div>
            <input
              className="presence-panel-input"
              placeholder="Motif (facultatif) — champ libre"
              value={relaunchMotif}
              onChange={(e) => setRelaunchMotif(e.target.value)}
              aria-label="Motif de relance (facultatif)"
            />
            <div className="presence-panel-actions">
              <button type="button" className="presence-btn primary" onClick={handleRelaunch}>
                ↻ Relancer
              </button>
              <button type="button" className="presence-btn ghost" onClick={() => setView('live')}>
                Retour
              </button>
            </div>
          </div>
        )}

        {view === 'confirm-close' && (
          <div className="presence-panel">
            <div className="presence-close-warning">
              Clôturer la session ? Le compteur est à {session.confirmed} / {session.total}. Les
              présences confirmées seront figées et les preuves de présence générées. La session ne
              pourra pas être rouverte.
            </div>
            <div className="presence-panel-actions">
              <button type="button" className="presence-btn primary" onClick={handleClose}>
                Clôturer la session
              </button>
              <button type="button" className="presence-btn ghost" onClick={() => setView('live')}>
                Retour
              </button>
            </div>
          </div>
        )}

        {view === 'closed' && (
          <div className="presence-panel">
            <div className="presence-closed-ok">✓ Session clôturée — les présences sont figées</div>
            <div className="presence-closed-counts">
              <span className="n">{session.confirmed}</span>
              <span className="label"> présences confirmées · </span>
              <span className="m">{withoutInput}</span>
              <span className="label"> sans saisie</span>
            </div>
            <div className="presence-panel-actions">
              <button type="button" className="presence-btn ghost" onClick={backToHub}>
                Retour au tableau de bord
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default PresenceSessionPage;
