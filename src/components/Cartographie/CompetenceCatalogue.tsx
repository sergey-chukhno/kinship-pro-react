import React, { useEffect, useMemo, useState } from 'react';
import { getBadges } from '../../api/Badges';
import { BadgeAPI } from '../../types';
import { CARTOGRAPHIE_V1_1_SERIES, getCartographieAxesForSeries } from '../../constants/badgeAxes';
import { getAxeColor, displayAxeTitle, displayCompetenceName } from '../../constants/cartographieColors';
import { displaySeries } from '../../utils/badgeMapper';
import { getLocalBadgeImage } from '../../utils/badgeImages';
import CompetenceRing, { RingNiveau } from './CompetenceRing';
import CompetenceDetail from './CompetenceDetail';
import { CompetenceEntry } from './MesCompetences';
import './Cartographie.css';

const LEVEL_ORDER = ['level_1', 'level_2', 'level_3', 'level_4'];

/** Icône spécifique d'une compétence (référentiel réel — badgeImages.ts), basée sur son niveau le plus bas. */
const competenceImage = (c: CompetenceEntry): string | undefined => {
  const row = c.levels[0];
  if (!row) return undefined;
  return row.image_url || getLocalBadgeImage(row.name, row.level, row.series);
};

const buildEntries = (catalogue: BadgeAPI[], series: string): CompetenceEntry[] => {
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
    // Catalogue = le référentiel, pas une progression : tout item est « vide »
    // (jamais lit), donc jamais de fil (une compétence du catalogue n'est
    // jamais « complétée »).
    const niveaux: RingNiveau[] = sorted.map((row) => {
      const items = [...(row.domains || []), ...(row.expertises || [])];
      return { key: row.level, items: items.map((it) => ({ id: String(it.id), name: it.name, lit: false })) };
    });
    const totalCount = niveaux.reduce((s, n) => s + n.items.length, 0);
    entries.push({
      name,
      axeTitle: axeForName(name),
      levels: sorted,
      niveaux,
      litCount: 0,
      totalCount,
      everCompleted: false,
    });
  });
  return entries.sort((a, b) => a.name.localeCompare(b.name));
};

const groupByAxe = (series: string, entries: CompetenceEntry[]) => {
  const axes = getCartographieAxesForSeries(series);
  if (axes.length === 0) return [{ title: null as string | null, items: entries }];
  const buckets = axes.map((a) => ({ title: a.title as string | null, items: [] as CompetenceEntry[] }));
  const unclassed: CompetenceEntry[] = [];
  entries.forEach((c) => {
    const bucket = buckets.find((b) => b.title === c.axeTitle);
    if (bucket) bucket.items.push(c);
    else unclassed.push(c);
  });
  const result = buckets.filter((b) => b.items.length > 0);
  if (unclassed.length > 0) result.push({ title: 'Non classé', items: unclassed });
  return result;
};

/**
 * Écran catalogue — cartographie V1.1 (spec §12). Le référentiel complet
 * (jusqu'à 40 compétences), pas les preuves d'une personne : chaque
 * compétence apparaît en anneau vide, groupée par série puis par axe. Sert à
 * parcourir ce qui existe, pas à suivre une progression — réutilise
 * CompetenceRing/CompetenceDetail avec des niveaux où rien n'est « lit ».
 */
const CompetenceCatalogue: React.FC = () => {
  const [bySeries, setBySeries] = useState<Record<string, BadgeAPI[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCompetence, setOpenCompetence] = useState<{ entry: CompetenceEntry; series: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.all(CARTOGRAPHIE_V1_1_SERIES.map((s) => getBadges({ series: s })));
        if (ignore) return;
        const next: Record<string, BadgeAPI[]> = {};
        CARTOGRAPHIE_V1_1_SERIES.forEach((s, i) => {
          next[s] = Array.isArray(results[i]) ? results[i] : [];
        });
        setBySeries(next);
      } catch (e) {
        console.error('Erreur lors du chargement du catalogue de compétences', e);
        if (!ignore) setError('Impossible de charger le catalogue de compétences pour le moment.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const seriesGroups = useMemo(() => {
    return CARTOGRAPHIE_V1_1_SERIES.map((s) => {
      const entries = buildEntries(bySeries[s] || [], s);
      return { series: s, groups: groupByAxe(s, entries), count: entries.length };
    });
  }, [bySeries]);

  return (
    <div className="carto-catalogue">
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
      {!loading &&
        !error &&
        seriesGroups.map(
          ({ series, groups, count }) =>
            count > 0 && (
              <div key={series} className="carto-catalogue-serie">
                <h2 className="carto-catalogue-serie-title">{displaySeries(series)}</h2>
                {groups.map((group) => (
                  <div key={group.title ?? 'flat'} className="carto-axe-group">
                    {group.title && (
                <h3 className="carto-axe-title">
                  <span className="carto-axe-dot" style={{ backgroundColor: getAxeColor(group.title) }} />
                  {displayAxeTitle(group.title)}
                </h3>
              )}
                    <div className="carto-ring-grid carto-ring-grid-catalogue">
                      {group.items.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          className="carto-ring-tile"
                          onClick={() => setOpenCompetence({ entry: c, series })}
                        >
                          <CompetenceRing
                            niveaux={c.niveaux}
                            axeColor={getAxeColor(c.axeTitle)}
                            size={96}
                            showThread={false}
                            title={displayCompetenceName(c.name)}
                            centerIcon={
                              competenceImage(c) ? (
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
            )
        )}

      {openCompetence && (
        <CompetenceDetail
          competence={openCompetence.entry}
          axeColor={getAxeColor(openCompetence.entry.axeTitle)}
          series={openCompetence.series}
          userBadges={[]}
          onClose={() => setOpenCompetence(null)}
        />
      )}
    </div>
  );
};

export default CompetenceCatalogue;
