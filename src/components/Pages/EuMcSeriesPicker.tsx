import React, { useMemo, useState } from 'react';
import { BadgeAPI } from '../../types';
import {
  EuMcDomain,
  EuMcSeries,
  STATIC_EU_MC_SERIES,
  seriesReferenceLabel,
} from '../../data/euMcCatalog';

interface EuMcSeriesPickerProps {
  badges: BadgeAPI[];
  onCancel: () => void;
  onInsert: (payload: { series: EuMcSeries; referenceLines: string[]; skillLines: string[] }) => void;
}

const PROVENANCE_LABEL: Record<EuMcSeries['provenance'], string> = {
  org: 'Vos séries',
  kinship: 'Catalogue Kinship — référentiels européens',
  authority: 'Distribuées par vos autorités',
};

function badgesToSeries(badges: BadgeAPI[]): EuMcSeries[] {
  const bySeries = new Map<string, BadgeAPI[]>();
  badges.forEach((badge) => {
    const name = badge.series?.trim();
    if (!name) return;
    const list = bySeries.get(name) || [];
    list.push(badge);
    bySeries.set(name, list);
  });

  return Array.from(bySeries.entries()).map(([name, list]) => {
    const lower = name.toLowerCase();
    const provenance: EuMcSeries['provenance'] = /anssi|secnum|rectorat|autorité|authority/.test(lower)
      ? 'authority'
      : /digcomp|entrecomp|lifecomp|cps|toukouleur|parcours|audiovisuelle|métiers de la mer|competences à s'orienter/.test(
          lower
        )
        ? 'kinship'
        : 'org';

    return {
      id: `live-${name}`,
      name,
      provenance,
      domains: list.map((badge) => {
        const domainSkills =
          badge.domains?.length > 0
            ? badge.domains
            : [{ id: badge.id, name: badge.name, category: 'domain' as const }];
        const expertises = badge.expertises || [];
        return {
          id: `badge-${badge.id}`,
          name: badge.name,
          skills: (expertises.length ? expertises : domainSkills).map((skill) => ({
            id: `skill-${skill.id}`,
            name: skill.name,
          })),
        };
      }),
    };
  });
}

const EuMcSeriesPicker: React.FC<EuMcSeriesPickerProps> = ({ badges, onCancel, onInsert }) => {
  const catalog = useMemo(() => {
    const live = badgesToSeries(badges);
    const liveNames = new Set(live.map((s) => s.name.toLowerCase()));
    const staticExtra = STATIC_EU_MC_SERIES.filter((s) => !liveNames.has(s.name.toLowerCase()));
    return [...staticExtra, ...live];
  }, [badges]);

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wholeSeries, setWholeSeries] = useState(false);
  const [domainIds, setDomainIds] = useState<Set<string>>(new Set());
  const [skillIds, setSkillIds] = useState<Set<string>>(new Set());
  const [openDomainId, setOpenDomainId] = useState<string | null>(null);

  const filtered = catalog.filter((series) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      series.name.toLowerCase().includes(q) ||
      (series.subtitle || '').toLowerCase().includes(q) ||
      series.domains.some((d) => d.name.toLowerCase().includes(q))
    );
  });

  const selected = catalog.find((s) => s.id === selectedId) || null;

  const grouped = (['org', 'kinship', 'authority'] as const)
    .map((provenance) => ({
      provenance,
      series: filtered.filter((s) => s.provenance === provenance),
    }))
    .filter((g) => g.series.length > 0);

  const toggleDomain = (domain: EuMcDomain) => {
    setWholeSeries(false);
    setDomainIds((prev) => {
      const next = new Set(prev);
      if (next.has(domain.id)) {
        next.delete(domain.id);
        setSkillIds((skills) => {
          const cleared = new Set(skills);
          domain.skills.forEach((s) => cleared.delete(s.id));
          return cleared;
        });
      } else {
        next.add(domain.id);
        setSkillIds((skills) => {
          const cleared = new Set(skills);
          domain.skills.forEach((s) => cleared.delete(s.id));
          return cleared;
        });
      }
      return next;
    });
  };

  const toggleSkill = (domain: EuMcDomain, skillId: string) => {
    setWholeSeries(false);
    setDomainIds((prev) => {
      const next = new Set(prev);
      next.delete(domain.id);
      return next;
    });
    setSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  };

  const canInsert = Boolean(
    selected && (wholeSeries || domainIds.size > 0 || skillIds.size > 0)
  );

  const insert = () => {
    if (!selected) return;
    const referenceLines: string[] = [];
    const skillLines: string[] = [];

    if (wholeSeries) {
      referenceLines.push(seriesReferenceLabel(selected));
    } else {
      selected.domains.forEach((domain) => {
        if (domainIds.has(domain.id)) {
          referenceLines.push(seriesReferenceLabel(selected, domain));
        }
        domain.skills.forEach((skill) => {
          if (skillIds.has(skill.id)) skillLines.push(skill.name);
        });
      });
    }

    onInsert({ series: selected, referenceLines, skillLines });
  };

  return (
    <div className="cp-picker">
      {!selected ? (
        <>
          <input
            type="search"
            className="cp-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 Rechercher une série — dès la première lettre…"
            autoFocus
          />
          {grouped.map((group) => (
            <div key={group.provenance} className="cp-picker-group">
              <div className="cp-picker-kicker">{PROVENANCE_LABEL[group.provenance]}</div>
              {group.series.map((series) => {
                const skillCount = series.domains.reduce((sum, d) => sum + d.skills.length, 0);
                return (
                  <button
                    key={series.id}
                    type="button"
                    className="cp-pick"
                    onClick={() => {
                      setSelectedId(series.id);
                      setWholeSeries(false);
                      setDomainIds(new Set());
                      setSkillIds(new Set());
                      setOpenDomainId(null);
                    }}
                  >
                    <span>
                      {series.provenance === 'kinship' ? '🇪🇺 ' : series.provenance === 'authority' ? '🏛 ' : '📚 '}
                      {series.name}
                    </span>
                    <small>
                      {series.subtitle || `${series.domains.length} domaines · ${skillCount} compétences`}
                      {series.eqfLevel ? ` · EQF ${series.eqfLevel}` : ''}
                    </small>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && <p className="cp-picker-empty">Aucune série ne correspond.</p>}
          <p className="cp-picker-note">
            La liste = les séries auxquelles votre organisation a accès. L’écriture libre reste possible à tout
            moment.
          </p>
          <div className="cp-picker-actions">
            <button type="button" className="cp-btn ghost" onClick={onCancel}>
              Annuler
            </button>
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            className="cp-card-link"
            onClick={() => setSelectedId(null)}
          >
            ← Changer de série
          </button>
          <label className="cp-field">
            <span>La série</span>
            <div className="cp-in-static">
              {selected.provenance === 'kinship' ? '🇪🇺 ' : '📚 '}
              {selected.name}
              {selected.subtitle ? ` — ${selected.subtitle}` : ''}
            </div>
          </label>
          <p className="cp-picker-kicker">
            Choisissez au niveau que vous voulez — chaque objet entier s’insère comme une référence
          </p>
          <button
            type="button"
            className={`cp-pick-level ${wholeSeries ? 'sel' : ''}`}
            onClick={() => {
              setWholeSeries(true);
              setDomainIds(new Set());
              setSkillIds(new Set());
            }}
          >
            {wholeSeries ? '☑' : '☐'} <b>Toute la série</b>
            <small>
              · {selected.domains.length} domaines ·{' '}
              {selected.domains.reduce((sum, d) => sum + d.skills.length, 0)} compétences
            </small>
          </button>
          {selected.domains.map((domain) => {
            const domainOn = domainIds.has(domain.id);
            const opened = openDomainId === domain.id;
            return (
              <div key={domain.id} className={`cp-pick-level ${domainOn ? 'sel' : ''}`}>
                <div className="cp-pick-level-row">
                  <button type="button" onClick={() => toggleDomain(domain)}>
                    {domainOn ? '☑' : '☐'} <b>{domain.name}</b>
                    <small> · {domain.skills.length} compétence{domain.skills.length > 1 ? 's' : ''}</small>
                  </button>
                  <button
                    type="button"
                    className="cp-card-link"
                    onClick={() => setOpenDomainId(opened ? null : domain.id)}
                  >
                    {opened ? 'masquer les compétences' : 'ou choisir les compétences ▾'}
                  </button>
                </div>
                {opened && (
                  <div className="cp-pick-skills">
                    {domain.skills.map((skill) => (
                      <label key={skill.id}>
                        <input
                          type="checkbox"
                          checked={skillIds.has(skill.id)}
                          onChange={() => toggleSkill(domain, skill.id)}
                        />
                        {skill.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="cp-picker-actions">
            <button type="button" className="cp-btn ghost" onClick={onCancel}>
              Annuler
            </button>
            <button type="button" className="cp-btn primary" disabled={!canInsert} onClick={insert}>
              Insérer
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EuMcSeriesPicker;
