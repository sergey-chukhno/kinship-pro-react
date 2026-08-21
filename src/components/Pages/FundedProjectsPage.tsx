import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FundedProjectCard, getFundedProjects } from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import './FundedProjectsPage.css';

type HubFilter = '' | 'run' | 'watch' | 'ended';

const FundedProjectsPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [cards, setCards] = useState<FundedProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<HubFilter>('');
  const [openYear, setOpenYear] = useState<number | null>(null);

  const companyId = getSelectedOrganizationId(state.user, state.showingPageType);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getFundedProjects(companyId);
        if (!cancelled) setCards(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const currentYear = new Date().getFullYear();
  const live = cards.filter((c) => c.status !== 'ended');
  const watch = live.filter((c) => c.watch);
  const endedThisYear = cards.filter((c) => c.status === 'ended' && (c.closed_year || currentYear) === currentYear);
  const archives = cards.filter((c) => c.status === 'ended' && (c.closed_year || 0) < currentYear);
  const archiveYears = Array.from(new Set(archives.map((c) => c.closed_year || currentYear))).sort((a, b) => b - a);

  const showLive = filter === '' || filter === 'run' || filter === 'watch';
  const showEnded = filter === '' || filter === 'ended';

  const toggle = (next: HubFilter) => setFilter((prev) => (prev === next ? '' : next));

  const counts = useMemo(
    () => ({
      run: live.length,
      watch: watch.length,
      ended: endedThisYear.length + archives.length,
    }),
    [live.length, watch.length, endedThisYear.length, archives.length]
  );

  return (
    <div className="fp-page">
      <h1 className="fp-title">{loading ? 'Je finance' : `Je finance (${cards.length})`}</h1>
      <p className="fp-sub">
        Les projets où une structure vous a désigné financeur — vous suivez, sans jamais y agir. Vos propres projets n’apparaissent pas ici.
      </p>

      <div className="fp-tiles">
        <button type="button" className={`fp-tile ${filter === 'run' ? 'on' : ''}`} onClick={() => toggle('run')}>
          <b>{counts.run}</b>
          <span>En cours</span>
        </button>
        <button type="button" className={`fp-tile amber ${filter === 'watch' ? 'on' : ''}`} onClick={() => toggle('watch')}>
          <b>{counts.watch}</b>
          <span>À regarder</span>
        </button>
        <button type="button" className={`fp-tile ${filter === 'ended' ? 'on' : ''}`} onClick={() => toggle('ended')}>
          <b>{counts.ended}</b>
          <span>Terminés</span>
        </button>
      </div>

      {loading ? (
        <p className="fp-empty-sub">Chargement…</p>
      ) : cards.length === 0 ? (
        <div className="fp-empty">
          <div className="fp-empty-title">Aucune désignation pour l’instant</div>
          <p className="fp-empty-sub">
            Dès qu’une structure vous désigne financeur d’un projet, il apparaît ici — rattachement ou pas.
          </p>
        </div>
      ) : (
        <>
          {showLive && filter !== 'run' && watch.length > 0 && (
            <section>
              <div className="fp-gsec">À regarder ({watch.length})</div>
              {watch.map((card) => (
                <FundedCard key={card.token} card={card} onFollow={() => navigate(`/follow/${card.token}`)} />
              ))}
            </section>
          )}

          {showLive && filter !== 'watch' && (
            <section>
              <div className="fp-gsec">
                En cours ({(filter === 'run' ? live : live.filter((c) => !c.watch)).length})
              </div>
              {(filter === 'run' ? live : live.filter((c) => !c.watch)).map((card) => (
                <FundedCard key={card.token} card={card} onFollow={() => navigate(`/follow/${card.token}`)} />
              ))}
            </section>
          )}

          {showEnded && (
            <section>
              <div className="fp-gsec">Terminés ({endedThisYear.length})</div>
              {endedThisYear.map((card) => (
                <FundedCard key={card.token} card={card} ended onFollow={() => navigate(`/follow/${card.token}`)} />
              ))}
              {archiveYears.map((year) => {
                const items = archives.filter((c) => c.closed_year === year);
                const open = openYear === year;
                return (
                  <div key={year}>
                    <button type="button" className="fp-arch" onClick={() => setOpenYear(open ? null : year)}>
                      {open ? '▾' : '▸'} Archives {year} ({items.length})
                    </button>
                    {open &&
                      items.map((card) => (
                        <FundedCard key={card.token} card={card} ended onFollow={() => navigate(`/follow/${card.token}`)} />
                      ))}
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
};

function FundedCard({
  card,
  ended,
  onFollow,
}: {
  card: FundedProjectCard;
  ended?: boolean;
  onFollow: () => void;
}) {
  return (
    <article className={`fp-card ${card.watch && !ended ? 'amber' : ''} ${ended ? 'ended' : ''}`}>
      {card.watch && !ended && card.watch_label && <div className="fp-banner">⚠ {card.watch_label}</div>}
      <div className="fp-row1">
        <div className="fp-card-title">{card.title}</div>
        <span className={`fp-state ${ended ? 'end' : 'run'}`}>{card.status_label}</span>
      </div>
      <div className="fp-meta">
        {[card.org, card.date_range, ended && card.report_transmitted ? 'le rapport transmis' : null]
          .filter(Boolean)
          .join(' · ')}
      </div>
      <div className="fp-row2">
        {ended ? (
          <span className="fp-sig ok">Preuve Projet générée</span>
        ) : card.watch ? (
          <span className="fp-sig warn">À regarder</span>
        ) : (
          <span className="fp-sig ok">● Rien à signaler</span>
        )}
        <button type="button" className={`fp-follow ${ended ? 'ghost' : ''}`} onClick={onFollow}>
          {ended ? 'Le rapport →' : 'Suivre →'}
        </button>
      </div>
    </article>
  );
}

export default FundedProjectsPage;
