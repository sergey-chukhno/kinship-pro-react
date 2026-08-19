import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MOCK_FUNDER_ARCHIVES,
  MOCK_FUNDER_HUB_CARDS,
  FunderHubCard,
} from '../../data/mockFunderView';
import './FunderView.css';

type HubFilter = '' | 'ec' | 'reg' | 'ter';

function signalLine(card: FunderHubCard): string | null {
  if (!card.signal) return null;
  if (card.signal.kind === 'manual') return '● À regarder — ✍ Présences attestées à la main';
  if (card.signal.kind === 'dates') return `● À regarder — 📅 ${card.signal.label} le 02/02`;
  if (card.signal.kind === 'gap') return '● À regarder — ⚠ Constat d’écart';
  return `● À regarder — ${card.signal.label}`;
}

const FunderHub: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<HubFilter>('');
  const [openYear, setOpenYear] = useState<number | null>(null);

  const inProgress = MOCK_FUNDER_HUB_CARDS.filter((c) => c.status === 'en_cours');
  const watch = inProgress.filter((c) => c.signal);
  const ended = MOCK_FUNDER_HUB_CARDS.filter((c) => c.status === 'terminee' && c.closedYear === 2027);

  const showInProgress = filter === '' || filter === 'ec' || filter === 'reg';
  const showEnded = filter === '' || filter === 'ter';
  const visibleInProgress = filter === 'reg' ? watch : inProgress;

  const toggle = (next: HubFilter) => setFilter((prev) => (prev === next ? '' : next));

  const counts = useMemo(
    () => ({
      ec: inProgress.length,
      reg: watch.length,
    }),
    [inProgress.length, watch.length]
  );

  return (
    <div className="fv-hub">
      <header className="fv-hub-head">
        <div>
          <h1>Formations suivies</h1>
          <p>OPCO Atlas — les formations que vous financez</p>
        </div>
        <div className="fv-hub-tiles">
          <button
            type="button"
            className={`fv-tile ${filter === 'ec' ? 'on' : ''}`}
            onClick={() => toggle('ec')}
          >
            <b>{counts.ec}</b>
            <span>En cours</span>
          </button>
          <button
            type="button"
            className={`fv-tile amber ${filter === 'reg' ? 'on' : ''}`}
            onClick={() => toggle('reg')}
          >
            <b>{counts.reg}</b>
            <span>À regarder</span>
          </button>
          <button
            type="button"
            className={`fv-tile ${filter === 'ter' ? 'on' : ''}`}
            onClick={() => toggle('ter')}
          >
            <b>7</b>
            <span>Terminées</span>
          </button>
        </div>
      </header>

      {showInProgress && (
        <section>
          <h2>En cours ({visibleInProgress.length})</h2>
          {visibleInProgress.map((card) => {
            const line = signalLine(card);
            return (
              <article key={card.token} className={`fv-card ${line ? 'watch' : ''}`}>
                <div className="fv-card-top">
                  <h3>{card.title}</h3>
                  <span className="fv-chip status">EN COURS</span>
                </div>
                <p className="fv-card-meta">
                  {card.org} · {card.meta}
                </p>
                <div className="fv-card-progress">
                  <div className="fv-bar mini">
                    <div style={{ width: `${card.progressPercent}%` }} />
                  </div>
                  <span>{card.progressLabel}</span>
                  <button
                    type="button"
                    className="fv-link"
                    onClick={() => navigate(`/follow/${card.token}`)}
                  >
                    Suivre →
                  </button>
                </div>
                {line ? (
                  <div className="fv-card-band">{line}</div>
                ) : (
                  <div className="fv-card-ok">
                    <span className="fv-dot ok" /> Rien à signaler
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {showEnded && (
        <section>
          <h2>Terminées (7)</h2>
          {ended.map((card) => (
            <article key={card.token} className="fv-card ended">
              <div className="fv-card-top">
                <h3>{card.title}</h3>
                <span className="fv-chip ended">TERMINÉE</span>
              </div>
              <p className="fv-card-meta">
                {card.org} · {card.meta}
              </p>
              <div className="fv-card-progress">
                <span className="ok">✓ Rapport reçu le {card.reportReceived}</span>
                <button
                  type="button"
                  className="fv-link"
                  onClick={() => navigate(`/follow/${card.token}`)}
                >
                  Ouvrir le rapport →
                </button>
              </div>
            </article>
          ))}

          {Object.entries(MOCK_FUNDER_ARCHIVES).map(([year, items]) => {
            const y = Number(year);
            const count = y === 2026 ? 4 : 2;
            const open = openYear === y;
            return (
              <div key={y}>
                <button
                  type="button"
                  className="fv-arch"
                  onClick={() => setOpenYear(open ? null : y)}
                >
                  <span>
                    <b>{open ? '▾' : '▸'}</b> Archives {y} <span className="muted">({count})</span>
                  </span>
                  <span className="muted">
                    {y === 2026 ? "l'année close, rangée — déplier" : 'déplier'}
                  </span>
                </button>
                {open && (
                  <div className="fv-arch-list">
                    {items.map((item) => (
                      <div key={item.title} className="fv-arch-item">
                        <span>
                          {item.title} · {item.meta}
                        </span>
                        <button
                          type="button"
                          className="fv-link"
                          onClick={() => navigate(`/follow/${item.token}`)}
                        >
                          Rapport →
                        </button>
                      </div>
                    ))}
                    {y === 2026 && items.length < 4 && (
                      <div className="fv-arch-item muted">et 2 autres formations 2026…</div>
                    )}
                    {y === 2025 && (
                      <div className="fv-arch-item muted">2 formations 2025…</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default FunderHub;
