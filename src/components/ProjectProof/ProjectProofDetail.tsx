import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProjectProofData } from '../../types/projectProof';
import { getProjectProofLevelStyle } from '../../utils/projectProofLevel';
import ProjectProofHeader from './ProjectProofHeader';
import ProjectProofConstellation from './ProjectProofConstellation';
import './ProjectProof.css';

const TABS = ['cadre', 'acteurs', 'etapes', 'badges', 'confiance'] as const;
type TabId = (typeof TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  cadre: 'Cadre',
  acteurs: 'Acteurs',
  etapes: 'Étapes',
  badges: 'Badges',
  confiance: 'Confiance',
};

interface ProjectProofDetailProps {
  proof: ProjectProofData;
  showPorteurBar?: boolean;
  showRightsLink?: boolean;
}

const BadgeHex: React.FC<{ color: string }> = ({ color }) => (
  <svg className="badge-hex" width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
    <polygon
      points="20,2 36,11 36,29 20,38 4,29 4,11"
      fill={`${color}14`}
      stroke={color}
      strokeWidth="1"
    />
    <path d="M14 20l4 4 8-8" stroke={color} strokeWidth="1.5" fill="none" />
  </svg>
);

const TruncatableText: React.FC<{ text: string; id: string }> = ({ text, id }) => {
  const [open, setOpen] = useState(false);
  const needsTruncate = text.length > 180;

  return (
    <>
      <div className={`truncable ${open ? 'open' : ''}`} id={id}>
        {text}
      </div>
      {needsTruncate && (
        <button type="button" className="desc-more" onClick={() => setOpen(!open)}>
          {open ? 'Réduire ▴' : 'Lire la suite ▾'}
        </button>
      )}
    </>
  );
};

const ProjectProofDetail: React.FC<ProjectProofDetailProps> = ({
  proof,
  showPorteurBar = true,
  showRightsLink = true,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('cadre');
  const [nominatif, setNominatif] = useState(true);
  const [openSeries, setOpenSeries] = useState<Record<number, boolean>>({ 0: true });
  const levelStyle = getProjectProofLevelStyle(proof.level);
  const anonymous = !nominatif;
  const holderLabel = anonymous ? 'Identité non divulguée' : proof.holderName;

  const toggleSeries = (idx: number) => {
    setOpenSeries((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <article
      className="pp"
      style={levelStyle.cardBorder ? { border: levelStyle.cardBorder } : undefined}
    >
      <ProjectProofHeader
        proof={proof}
        anonymous={anonymous}
        showPorteurBar={showPorteurBar}
        nominatif={nominatif}
        onToggleIdentity={() => setNominatif(!nominatif)}
        showRightsLink={showRightsLink}
      />

      <nav className="pp-tabs" role="tablist" aria-label="Sections de la Preuve Projet">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={`pp-tab ${activeTab === tab ? 'active' : ''}`}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </nav>

      <div className="pp-dots">
        {TABS.map((tab) => (
          <div key={tab} className={`pp-dot-nav ${activeTab === tab ? 'on' : ''}`} />
        ))}
      </div>

      <div className="pp-body">
        {/* CADRE */}
        <div
          className={`tab-content ${activeTab === 'cadre' ? 'active' : ''}`}
          role="tabpanel"
          aria-label="Cadre"
        >
          <div className="sec-label">Description</div>
          <div className="cadre-desc">
            <TruncatableText text={proof.description} id="descText" />
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="kpi-n">{proof.kpis.participants}</div>
              <div className="kpi-l">Participants</div>
            </div>
            <div className="kpi">
              <div className="kpi-n">{proof.kpis.coAttestants}</div>
              <div className="kpi-l">Co-attestants</div>
            </div>
            <div className="kpi">
              <div className="kpi-n">{proof.kpis.badges}</div>
              <div className="kpi-l">Badges distribués</div>
            </div>
            <div className="kpi kpi-gold">
              <div className="kpi-n">{proof.kpis.hours}</div>
              <div className="kpi-l">Charge · 4 ECTS</div>
            </div>
            <div className="kpi kpi-gold">
              <div className="kpi-n">{proof.kpis.eqf}</div>
              <div className="kpi-l">Niveau</div>
            </div>
          </div>

          <div className="sec-label">Organisations co-attestantes</div>
          {proof.coAttestants.map((co) => (
            <div key={co.name} className="coatt">
              <div
                className="coatt-av"
                style={{ background: co.avatarBg, color: co.avatarColor }}
              >
                {co.initials}
              </div>
              <div className="coatt-info">
                <div className="coatt-name">{co.name}</div>
                <div className="coatt-desc">{co.description}</div>
              </div>
              <span
                className="coatt-pill"
                style={{ border: `1.5px solid ${co.pillBorder}`, color: co.pillColor }}
              >
                {co.pillLabel}
              </span>
            </div>
          ))}

          <div className="info-row">
            <div className="info-cell">
              <div className="info-k">Secteur</div>
              <div className="info-v">{proof.sector}</div>
            </div>
            <div className="info-cell">
              <div className="info-k">Territoire</div>
              <div className="info-v">{proof.territory}</div>
            </div>
          </div>
          <div className="info-row">
            <div className="info-cell info-cell-gold">
              <div className="info-k">Participation · Annexe I</div>
              <div className="info-v">{proof.participation}</div>
            </div>
            <div className="info-cell info-cell-gold">
              <div className="info-k">Langue · Annexe I</div>
              <div className="info-v">{proof.language}</div>
            </div>
          </div>
        </div>

        {/* ACTEURS */}
        <div
          className={`tab-content ${activeTab === 'acteurs' ? 'active' : ''}`}
          role="tabpanel"
          aria-label="Acteurs"
        >
          <ProjectProofConstellation proof={proof} />
          <div className="rgpd-note">
            {proof.kpis.participants} participants · non affichés (RGPD) · seuls les émetteurs de
            badges apparaissent
          </div>
        </div>

        {/* ÉTAPES */}
        <div
          className={`tab-content ${activeTab === 'etapes' ? 'active' : ''}`}
          role="tabpanel"
          aria-label="Étapes"
        >
          <div className="acquis-block">
            <div className="acquis-title">Acquis d&apos;apprentissage · Annexe I</div>
            <div className="acquis-text">
              <TruncatableText text={proof.learningOutcomes} id="acquisText" />
            </div>
          </div>
          <div className="pills-row">
            <div className="pill-gold">{proof.kpis.hours} · 4 ECTS</div>
            <div className="pill-gold">Évaluation : {proof.evaluationType}</div>
          </div>
          <div className="sec-label">Chronologie</div>
          <div className="chrono">
            {proof.timeline.map((ev, i) => (
              <div key={i} className="chrono-ev">
                <div className="chrono-dot" style={{ background: ev.dateColor }} />
                <div className="chrono-date" style={{ color: ev.dateColor }}>
                  {ev.date}
                </div>
                <div className="chrono-title">{ev.title}</div>
                {ev.description && <div className="chrono-desc">{ev.description}</div>}
                {(ev.pills || ev.presence) && (
                  <div className="chrono-pills">
                    <span>
                      {ev.pills?.map((p) => (
                        <span
                          key={p.label}
                          className="chrono-pill"
                          style={{ background: p.bg, color: p.color }}
                        >
                          {p.label}
                        </span>
                      ))}
                    </span>
                    {ev.presence && <span className="pill-presence">✓ Présence vérifiée</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* BADGES */}
        <div
          className={`tab-content ${activeTab === 'badges' ? 'active' : ''}`}
          role="tabpanel"
          aria-label="Badges"
        >
          <div className="badges-sum">
            {proof.badgesReceived} badges reçus par {holderLabel} · {proof.badgeSeriesCount}{' '}
            séries
          </div>
          <div className="prereq-block">
            <div className="prereq-label">Annexe I · optionnel</div>
            <div className="prereq-title">Prérequis</div>
            <div className="prereq-text">{proof.prerequisites}</div>
          </div>
          {proof.badgeSeries.map((serie, idx) => (
            <div key={serie.name} className="serie">
              <button type="button" className="serie-hd" onClick={() => toggleSeries(idx)}>
                <span className={`serie-chev ${openSeries[idx] ? 'open' : ''}`}>▸</span>
                <span className="serie-nm">{serie.name}</span>
                <span className="serie-ct">· {serie.count}</span>
                <span
                  className="serie-pill"
                  style={{ background: serie.orgPill.bg, color: serie.orgPill.color }}
                >
                  {serie.orgPill.label}
                </span>
              </button>
              <div className={`serie-body ${openSeries[idx] ? 'open' : ''}`}>
                {serie.badges.map((badge) => (
                  <div key={badge.name} className="badge-row">
                    <BadgeHex color={badge.orgColor} />
                    <span className="badge-name">{badge.name}</span>
                    <span className="badge-arrow">PB ↗</span>
                  </div>
                ))}
                {serie.extraCount && (
                  <div className="badge-extra">{serie.extraCount} badges supplémentaires ▾</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CONFIANCE */}
        <div
          className={`tab-content ${activeTab === 'confiance' ? 'active' : ''}`}
          role="tabpanel"
          aria-label="Confiance"
        >
          <div className="conf-pills">
            <span className="conf-pill">Vérifiable</span>
            <span className="conf-pill">Portable</span>
            <span className="conf-pill">Conservée à vie</span>
            <span className="conf-pill">Zéro donnée perso</span>
          </div>
          <div className="comp-title">Conformité — approche européenne</div>
          <div className="comp-sub">
            Rec. 2022/C 243/02 · Annexe I · 16 renseignés · 11 obligatoires
          </div>
          <div className="el-list">
            {proof.conformityElements.map((el) => (
              <div key={el.num} className={`el-row ${el.optional ? 'el-opt' : ''}`}>
                <span className={`el-bar ${el.optional ? 'el-bar-d' : 'el-bar-s'}`} />
                <span className="el-n">{el.num}</span>
                <span className="el-nm">{el.name}</span>
                <span className="el-src">{el.source}</span>
                <span className="el-ok">✓</span>
              </div>
            ))}
          </div>
          <div className="comp-legend">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="el-bar el-bar-s" style={{ width: 3, height: 12, display: 'inline-block' }} />
              Obligatoire (11)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 3, height: 12, borderLeft: '2px dashed #D4960A' }} />
              Optionnel / Kinship (5)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="el-ok">✓</span> Renseigné
            </div>
          </div>
          <div className="integrity">
            <div className="integrity-t">Intégrité de l&apos;attestation</div>
            <div className="integrity-d">
              {proof.kpis.coAttestants} organisations co-attestantes · empreintes agrégées ·
              manifeste figé à la clôture · hash inchangé en cas d&apos;effacement civil
              (CIVIL_DATA_ERASED)
            </div>
          </div>
          {showRightsLink && (
            <div className="droits">
              <div className="droits-t">Vos droits sur cette preuve</div>
              <div className="droits-d">
                Portabilité, anonymisation, effacement civil — exercer vos droits RGPD.
              </div>
              <div className="droits-note">Disponible uniquement pour le porteur de la preuve.</div>
              <Link to="/pik/droits" className="btn-droits">
                Mes droits →
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="share-zone">
        <div className="share-title">Partager et exporter</div>
        <div className="share-grid">
          <button type="button" className="s-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003189" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <div className="s-label">Copier le lien</div>
          </button>
          <button type="button" className="s-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003189" strokeWidth="2" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="s-label">PDF + QR</div>
          </button>
          <button type="button" className="s-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003189" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="3" height="3" />
            </svg>
            <div className="s-label">QR Code</div>
          </button>
          <button type="button" className="s-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003189" strokeWidth="2" aria-hidden="true">
              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
              <rect x="2" y="9" width="4" height="12" />
              <circle cx="4" cy="4" r="2" />
            </svg>
            <div className="s-label">LinkedIn</div>
          </button>
          <button type="button" className="s-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003189" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <div className="s-label">Europass</div>
          </button>
          <button type="button" className="s-btn disabled" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <div className="s-label grey">EUDI</div>
          </button>
        </div>
      </div>

      <footer className="pp-footer">
        Conservée à vie · Vérifiable sans compte Kinship
        <br />
        © 2026 Kinship SAS
        <div className="pp-footer-divider">
          <a href="https://kinship.fr" target="_blank" rel="noopener noreferrer">
            Découvrir Kinship →
          </a>
        </div>
      </footer>
    </article>
  );
};

export default ProjectProofDetail;
