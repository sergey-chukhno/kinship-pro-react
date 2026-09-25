import React, { useEffect, useMemo, useState } from 'react';
import { getBadges, getUserBadges } from '../../api/Badges';
import { BadgeAPI } from '../../types';
import {
  CARTOGRAPHIE_V1_1_SERIES,
  getCartographieAxesForSeries,
} from '../../constants/badgeAxes';
import { getAxeColor, displayAxeTitle, displayCompetenceName } from '../../constants/cartographieColors';
import { displaySeries } from '../../utils/badgeMapper';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import CompetenceRing, { RingNiveau } from './CompetenceRing';
import CompetenceIcon, { hasCompetenceIcon } from './CompetenceIcon';
import CompetenceDetail from './CompetenceDetail';
import './Cartographie.css';

const LEVEL_ORDER = ['level_1', 'level_2', 'level_3', 'level_4'];

/** Icône spécifique d'une compétence (référentiel réel — badgeImages.ts), basée sur son niveau le plus bas. */
const competenceImage = (c: CompetenceEntry): string | undefined => {
  const row = c.levels[0];
  if (!row) return undefined;
  return row.image_url || getLocalBadgeImage(row.name, row.level, row.series);
};

export interface CompetenceEntry {
  name: string;
  axeTitle: string | null;
  levels: BadgeAPI[];
  niveaux: RingNiveau[];
  litCount: number;
  totalCount: number;
  everCompleted: boolean;
}

/**
 * Écran "Mes compétences" — cartographie V1.1 (spec §3/§8).
 * Bandeau de séries en haut, compétences groupées par axe en dessous (à plat
 * pour une série sans axe). Chaque compétence = un CompetenceRing construit à
 * partir de vraies données (catalogue via getBadges + preuves via getUserBadges),
 * jamais de données statiques.
 */
const MesCompetences: React.FC = () => {
  const [series, setSeries] = useState<string>(CARTOGRAPHIE_V1_1_SERIES[0]);
  const [catalogue, setCatalogue] = useState<BadgeAPI[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCompetence, setOpenCompetence] = useState<CompetenceEntry | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cat, mine] = await Promise.all([
          getBadges({ series }),
          getUserBadges(1, 500, { series }),
        ]);
        if (ignore) return;
        setCatalogue(Array.isArray(cat) ? cat : []);
        setUserBadges(Array.isArray(mine.data) ? mine.data : []);
      } catch (e) {
        console.error('Erreur lors du chargement de la cartographie de compétences', e);
        if (!ignore) setError('Impossible de charger ta cartographie de compétences pour le moment.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [series]);

  const competences = useMemo<CompetenceEntry[]>(() => {
    const byName = new Map<string, BadgeAPI[]>();
    catalogue.forEach((b) => {
      if (!byName.has(b.name)) byName.set(b.name, []);
      byName.get(b.name)!.push(b);
    });
    const axes = getCartographieAxesForSeries(series);
    const axeForName = (name: string): string | null => {
      const found = axes.find((a) => a.badgeNames.includes(name));
      return found ? found.title : null;
    };
    const entries: CompetenceEntry[] = [];
    byName.forEach((rows, name) => {
      const sorted = [...rows].sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level));
      const niveaux: RingNiveau[] = sorted.map((row) => {
        const items = [...(row.domains || []), ...(row.expertises || [])];
        const myRecordsForRow = userBadges.filter((ub: any) => ub?.badge?.id === row.id);
        const litNames = new Set<string>();
        myRecordsForRow.forEach((ub: any) => (ub.skills_indicated || []).forEach((n: string) => litNames.add(n)));
        return {
          key: row.level,
          items: items.map((it) => ({ id: String(it.id), name: it.name, lit: litNames.has(it.name) })),
        };
      });
      const totalCount = niveaux.reduce((s, n) => s + n.items.length, 0);
      const litCount = niveaux.reduce((s, n) => s + n.items.filter((i) => i.lit).length, 0);
      entries.push({
        name,
        axeTitle: axeForName(name),
        levels: sorted,
        niveaux,
        litCount,
        totalCount,
        everCompleted: totalCount > 0 && litCount === totalCount,
      });
    });
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [catalogue, userBadges, series]);

  const grouped = useMemo(() => {
    const axes = getCartographieAxesForSeries(series);
    if (axes.length === 0) {
      return [{ title: null as string | null, items: competences }];
    }
    const buckets = axes.map((a) => ({ title: a.title as string | null, items: [] as CompetenceEntry[] }));
    const unclassed: CompetenceEntry[] = [];
    competences.forEach((c) => {
      const bucket = buckets.find((b) => b.title === c.axeTitle);
      if (bucket) bucket.items.push(c);
      else unclassed.push(c);
    });
    const result = buckets.filter((b) => b.items.length > 0);
    if (unclassed.length > 0) result.push({ title: 'Non classé', items: unclassed });
    return result;
  }, [competences, series]);

  return (
    <div className="carto-mes-competences">
      <div className="carto-series-tabs">
        {CARTOGRAPHIE_V1_1_SERIES.map((s) => (
          <button
            key={s}
            type="button"
            className={`carto-series-tab ${series === s ? 'active' : ''}`}
            onClick={() => setSeries(s)}
          >
            {displaySeries(s)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="badges-loading">
          <i className="fas fa-spinner fa-spin"></i> Chargement…
        </div>
      )}
      {error && (
        <div className="badges-error">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="carto-groups">
          {competences.length === 0 && (
            <div className="badges-empty">
              <i className="fas fa-award"></i>
              <h4>Aucune compétence dans cette série pour le moment.</h4>
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.title ?? 'flat'} className="carto-axe-group">
              {group.title && (
                <h3 className="carto-axe-title">
                  <span className="carto-axe-dot" style={{ backgroundColor: getAxeColor(group.title) }} />
                  {displayAxeTitle(group.title)}
                </h3>
              )}
              <div className="carto-ring-grid">
                {group.items.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className="carto-ring-tile"
                    onClick={() => setOpenCompetence(c)}
                  >
                    <CompetenceRing
                      niveaux={c.niveaux}
                      axeColor={getAxeColor(c.axeTitle)}
                      size={120}
                      showThread={c.everCompleted}
                      title={displayCompetenceName(c.name)}
                      centerIcon={
                        hasCompetenceIcon(displayCompetenceName(c.name)) ? (
                          <CompetenceIcon name={displayCompetenceName(c.name)} />
                        ) : competenceImage(c) ? (
                          <img src={competenceImage(c)} alt="" className="carto-ring-center-image" />
                        ) : undefined
                      }
                    />
                    <span className="carto-ring-tile-name">{displayCompetenceName(c.name)}</span>
                    {c.totalCount > 0 && (
                      <>
                        <hr className="carto-ring-tile-divider" />
                        <span className="carto-ring-tile-caption">
                          {c.litCount > 0
                            ? `${c.litCount} sur ${c.totalCount}`
                            : `${c.totalCount} item${c.totalCount > 1 ? 's' : ''}`}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {openCompetence && (
        <CompetenceDetail
          competence={openCompetence}
          axeColor={getAxeColor(openCompetence.axeTitle)}
          series={series}
          userBadges={userBadges}
          onClose={() => setOpenCompetence(null)}
        />
      )}
    </div>
  );
};

export default MesCompetences;
