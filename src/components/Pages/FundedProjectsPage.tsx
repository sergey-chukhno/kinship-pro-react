import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  confirmFundedProject,
  declineFundedProject,
  FundedProjectCard,
  getFundedProjects,
  proposeFunderAttachment,
} from '../../api/Projects';
import { useAppContext } from '../../context/AppContext';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import './FundedProjectsPage.css';

type HubFilter = '' | 'run' | 'watch' | 'ended';

const FundedProjectsPage: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
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

  const refreshCard = (next: FundedProjectCard) => {
    setCards((prev) => prev.map((c) => (c.token === next.token ? next : c)));
  };

  const handleConfirm = async (token: string, propose?: boolean) => {
    if (propose) {
      await proposeFunderAttachment(token, companyId);
      return;
    }
    const next = await confirmFundedProject(token, companyId);
    if (next) refreshCard(next);
  };

  const handleDecline = async (token: string) => {
    await declineFundedProject(token, companyId);
    setCards((prev) => prev.filter((c) => c.token !== token));
  };

  return (
    <div className={`fp-page ${embedded ? 'embedded' : ''}`}>
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
          <div className="fp-empty-title">Aucun projet financé pour l’instant</div>
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
                <FundedCard
                  key={card.token}
                  card={card}
                  onFollow={() => navigate(`/follow/${card.token}`)}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                />
              ))}
            </section>
          )}

          {showLive && filter !== 'watch' && (
            <section>
              <div className="fp-gsec">
                En cours ({(filter === 'run' ? live : live.filter((c) => !c.watch)).length})
              </div>
              {(filter === 'run' ? live : live.filter((c) => !c.watch)).map((card) => (
                <FundedCard
                  key={card.token}
                  card={card}
                  onFollow={() => navigate(`/follow/${card.token}`)}
                  onConfirm={handleConfirm}
                  onDecline={handleDecline}
                />
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
  onConfirm,
  onDecline,
}: {
  card: FundedProjectCard;
  ended?: boolean;
  onFollow: () => void;
  onConfirm?: (token: string, propose?: boolean) => Promise<void>;
  onDecline?: (token: string) => Promise<void>;
}) {
  const [declining, setDeclining] = useState(false);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const pending = Boolean(card.needs_confirmation) && !ended;

  return (
    <article className={`fp-card ${card.watch && !ended ? 'amber' : ''} ${ended ? 'ended' : ''} ${pending ? 'confirm' : ''}`}>
      {pending && (
        <div className="fp-banner confirm">
          ● À confirmer — {card.org || 'Une structure'} vous a désigné financeur de ce projet
        </div>
      )}
      {card.watch && !ended && !pending && card.watch_label && <div className="fp-banner">⚠ {card.watch_label}</div>}
      <div className="fp-row1">
        <div className="fp-card-title">{card.title}</div>
        <span className={`fp-state ${ended ? 'end' : 'run'}`}>{card.status_label}</span>
      </div>
      <div className="fp-meta">
        {[
          card.org,
          card.date_range,
          pending ? 'désignation ponctuelle' : null,
          ended && card.report_transmitted ? 'le rapport transmis' : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </div>
      {declining ? (
        <div className="fp-decline">
          <div className="fp-decline-title">Décliner cette désignation ?</div>
          <p>
            Vous indiquez : « nous ne finançons pas ce projet ». La désignation sera retirée chez {card.org || 'la structure'}, qui en sera notifiée.
          </p>
          <div className="fp-row2">
            <button type="button" className="fp-decline-yes" onClick={() => void onDecline?.(card.token)}>
              Oui, décliner
            </button>
            <button type="button" className="fp-btn-ghost" onClick={() => setDeclining(false)}>
              Revenir
            </button>
          </div>
        </div>
      ) : (
        <div className="fp-row2">
          {pending ? (
            <>
              <button
                type="button"
                className="fp-btn-confirm"
                onClick={() => {
                  void onConfirm?.(card.token).then(() => setJustConfirmed(true));
                }}
              >
                Confirmer
              </button>
              <button type="button" className="fp-btn-ghost" onClick={() => setDeclining(true)}>
                Décliner
              </button>
            </>
          ) : ended ? (
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
      )}
      {justConfirmed && (
        <label className="fp-propose">
          <input type="checkbox" onChange={(e) => {
            if (e.target.checked) void onConfirm?.(card.token, true);
          }} />
          Proposer un rattachement financeur à {card.org || 'cette structure'} ?
        </label>
      )}
    </article>
  );
}

export default FundedProjectsPage;
