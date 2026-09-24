import React, { useMemo, useState } from 'react';
import CompetenceRing from './CompetenceRing';
import { CompetenceEntry } from './MesCompetences';
import { displayCompetenceName } from '../../constants/cartographieColors';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import { getNiveauWordForSeries } from '../../constants/badgeAxes';
import { getLevelLabel } from '../../utils/badgeLevelLabels';
import './Cartographie.css';

interface HistoryConstat {
  date: string;
  comment: string | null;
}

interface HistoryEntry {
  projectTitle: string;
  senderName: string;
  constats: HistoryConstat[];
}

interface Props {
  competence: CompetenceEntry;
  axeColor: string;
  series: string;
  userBadges: any[];
  onClose: () => void;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch {
    return iso;
  }
};

/**
 * Compétence ouverte — spec §4/§5/§7. Grand anneau + items listés par niveau
 * (ou CPS spécifique). Cliquer un item déjà constaté ouvre son historique de
 * constats (projet / adulte / date), à partir des vraies preuves de l'utilisateur
 * — jamais de note ou de moyenne, chaque constat reste une preuve individuelle.
 */
const CompetenceDetail: React.FC<Props> = ({ competence, axeColor, series, userBadges, onClose }) => {
  const [openItem, setOpenItem] = useState<{ id: string; name: string } | null>(null);
  const niveauWord = getNiveauWordForSeries(series);
  const competenceImage = useMemo(() => {
    const row = competence.levels[0];
    if (!row) return undefined;
    return row.image_url || getLocalBadgeImage(row.name, row.level, row.series);
  }, [competence]);

  const historyForItem = useMemo(() => {
    if (!openItem) return [] as HistoryEntry[];
    const rowIds = new Set(competence.levels.map((l) => l.id));
    const matches = userBadges.filter(
      (ub: any) => rowIds.has(ub?.badge?.id) && (ub.skills_indicated || []).includes(openItem.name)
    );
    const byProject = new Map<string, HistoryEntry>();
    matches.forEach((ub: any) => {
      const key = ub.project?.title || 'Sans projet';
      if (!byProject.has(key)) {
        byProject.set(key, { projectTitle: key, senderName: ub.sender?.full_name || '—', constats: [] });
      }
      const comment = typeof ub.comment === 'string' ? ub.comment.trim() : '';
      byProject.get(key)!.constats.push({ date: formatDate(ub.created_at), comment: comment || null });
    });
    return Array.from(byProject.values());
  }, [openItem, competence, userBadges]);

  return (
    <div className="carto-detail-overlay" onClick={onClose}>
      <div className="carto-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="carto-detail-close" onClick={onClose} aria-label="Fermer">
          <i className="fas fa-times"></i>
        </button>
        <div className="carto-detail-head">
          <CompetenceRing
            niveaux={competence.niveaux}
            axeColor={axeColor}
            size={230}
            showThread={competence.everCompleted}
            title={displayCompetenceName(competence.name)}
            centerIcon={
              competenceImage ? <img src={competenceImage} alt="" className="carto-ring-center-image" /> : undefined
            }
          />
          <h2>{displayCompetenceName(competence.name)}</h2>
          <p className="carto-detail-sub">
            {competence.litCount}/{competence.totalCount} constatés
          </p>
        </div>
        <div className="carto-detail-body">
          {competence.niveaux.map((niveau, idx) => (
            <div key={niveau.key} className="carto-detail-niveau">
              <h4>
                {niveauWord} {idx + 1}
                {competence.levels[idx] ? ` — ${getLevelLabel(series, String(idx + 1))}` : ''}
              </h4>
              <ul className="carto-detail-items">
                {niveau.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`carto-detail-item ${item.lit ? 'lit' : ''}`}
                      onClick={() => item.lit && setOpenItem({ id: item.id, name: item.name })}
                      disabled={!item.lit}
                    >
                      <span className="carto-detail-item-dot" style={{ background: item.lit ? axeColor : undefined }} />
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {openItem && (
          <div className="carto-history-overlay" onClick={() => setOpenItem(null)}>
            <div className="carto-history-panel" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="carto-detail-close" onClick={() => setOpenItem(null)} aria-label="Fermer">
                <i className="fas fa-times"></i>
              </button>
              <h3>{openItem.name}</h3>
              {historyForItem.length === 0 ? (
                <p>Aucune preuve de compétences trouvée pour cet item.</p>
              ) : (
                <ul className="carto-history-list">
                  {historyForItem.map((h) => (
                    <li key={h.projectTitle}>
                      <div className="carto-history-project">{h.projectTitle}</div>
                      <div className="carto-history-meta">par {h.senderName}</div>
                      <ul className="carto-history-constats">
                        {h.constats.map((c, i) => (
                          <li key={i} className="carto-history-constat">
                            <span className="carto-history-date">{c.date}</span>
                            {c.comment && <p className="carto-history-comment">« {c.comment} »</p>}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              <p className="carto-history-note">
                Chaque constat est une preuve de compétences — elle est dans « Mes preuves ».
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetenceDetail;
