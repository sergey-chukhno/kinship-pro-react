import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ParcoursProofData } from '../../types/parcoursProof';
import {
  getParcoursTrustStyle,
  PARCOURS_GOLD,
} from '../../utils/parcoursProofStyle';
import ParcoursProofSeal from './ParcoursProofSeal';
import ParcoursProofFrise from './ParcoursProofFrise';
import './ParcoursProof.css';

type TabWithDiploma = 'diplome' | 'cadre' | 'parcours' | 'badges' | 'confiance';
type TabWithoutDiploma = 'cadre' | 'parcours' | 'projets' | 'badges' | 'confiance';
type TabId = TabWithDiploma | TabWithoutDiploma;

interface TabDef {
  id: TabId;
  label: string;
  gold?: boolean;
}

interface ParcoursProofDetailProps {
  proof: ParcoursProofData;
  showPorteurBar?: boolean;
  showRightsLink?: boolean;
}

const ShareIcon: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const props = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (type) {
    case 'link':
      return (
        <svg {...props}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    case 'pdf':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="12" x2="12" y2="18" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    case 'qr':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="3" height="3" />
        </svg>
      );
    case 'li':
      return (
        <svg {...props}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'profil':
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'kdip':
      return (
        <svg {...props}>
          <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
  }
};

const ParcoursProofDetail: React.FC<ParcoursProofDetailProps> = ({
  proof,
  showPorteurBar = true,
  showRightsLink = true,
}) => {
  const trust = getParcoursTrustStyle(proof.trustLevel);
  const hasDiploma = proof.hasDiploma;

  const tabs: TabDef[] = useMemo(
    () =>
      hasDiploma
        ? [
            { id: 'diplome', label: 'Diplôme ✦', gold: true },
            { id: 'cadre', label: 'Cadre' },
            { id: 'parcours', label: 'Parcours' },
            { id: 'badges', label: 'Badges' },
            { id: 'confiance', label: 'Confiance' },
          ]
        : [
            { id: 'cadre', label: 'Cadre' },
            { id: 'parcours', label: 'Parcours' },
            { id: 'projets', label: 'Projets' },
            { id: 'badges', label: 'Badges' },
            { id: 'confiance', label: 'Confiance' },
          ],
    [hasDiploma]
  );

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);
  const [nominatif, setNominatif] = useState(true);
  const [openSeries, setOpenSeries] = useState<Record<number, boolean>>({});
  const [shareMode, setShareMode] = useState<'dip' | 'par'>('dip');

  const anonymous = !nominatif;
  const holderLabel = anonymous ? 'Identité non divulguée' : proof.holderName;
  const trustColor = trust.color;

  const toggleSeries = (idx: number) => {
    setOpenSeries((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const renderCoAttestants = () =>
    proof.coAttestants.map((co) => (
      <div key={co.name} className="coatt">
        <div
          className="coatt-av"
          style={{ background: `${co.color}22`, color: co.color }}
        >
          {co.initials}
        </div>
        <div>
          <div className="coatt-name">{co.name}</div>
          <div className="coatt-sub">{co.subtitle}</div>
        </div>
        <span className="coatt-pill" style={{ color: co.color }}>
          {co.pill}
        </span>
      </div>
    ));

  const renderCadre = () => (
    <div className={`tab-pane ${activeTab === 'cadre' ? 'active' : ''}`} role="tabpanel" aria-label="Cadre">
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-n" style={{ color: trustColor }}>
            {proof.kpis.projects}
          </div>
          <div className="kpi-l">projets</div>
        </div>
        <div className="kpi">
          <div className="kpi-n" style={{ color: trustColor }}>
            {proof.kpis.stages}
          </div>
          <div className="kpi-l">stages</div>
        </div>
        <div className="kpi">
          <div className="kpi-n" style={{ color: trustColor }}>
            {proof.kpis.badges}
          </div>
          <div className="kpi-l">badges</div>
        </div>
        {proof.kpis.fourthGold ? (
          <div className="kpi kpi-g">
            <div className="kpi-n">{proof.kpis.fourthValue}</div>
            <div className="kpi-l">{proof.kpis.fourthLabel}</div>
          </div>
        ) : (
          <div className="kpi">
            <div className="kpi-n" style={{ color: trustColor }}>
              {proof.kpis.fourthValue}
            </div>
            <div className="kpi-l">{proof.kpis.fourthLabel}</div>
          </div>
        )}
      </div>
      <div className="sec-lbl">Organisations co-attestantes</div>
      {renderCoAttestants()}
    </div>
  );

  const renderChrono = (withLinks: boolean) => (
    <>
      <div className="sec-lbl" style={{ marginTop: 0 }}>
        {withLinks ? 'Chronologie & preuves' : 'Chronologie'}
      </div>
      {proof.chronoItems.map((item) => (
        <div key={item.title} className="ch-card">
          <div className="ch-top">
            <span className={`ch-pill ${item.type === 'PP' ? 'ch-pp' : 'ch-ps'}`}>{item.type}</span>
            <span className="ch-titre">{item.title}</span>
            <span className="ch-date">{item.date}</span>
          </div>
          <div className="ch-org">{item.org}</div>
          <div className="ch-bot">
            <span className="ch-period">{item.period}</span>
            <span className="ch-badges" style={{ color: trustColor }}>
              {item.badges} badges
            </span>
            {withLinks && (
              <span className="ch-link" style={{ color: trustColor }}>
                Voir la preuve →
              </span>
            )}
          </div>
        </div>
      ))}
    </>
  );

  const renderParcours = () => (
    <div className={`tab-pane ${activeTab === 'parcours' ? 'active' : ''}`} role="tabpanel" aria-label="Parcours">
      {renderChrono(hasDiploma)}
    </div>
  );

  const renderProjets = () => (
    <div className={`tab-pane ${activeTab === 'projets' ? 'active' : ''}`} role="tabpanel" aria-label="Projets">
      {proof.projectRows.map((row) => (
        <div key={row.title} className="proj-row">
          <span className={`ch-pill ${row.type === 'PP' ? 'ch-pp' : 'ch-ps'}`}>{row.type}</span>
          <div className="proj-info">
            <div className="proj-titre">{row.title}</div>
            <div className="proj-org">{row.org}</div>
          </div>
          <span className="proj-arrow" style={{ color: trustColor }}>
            Voir ↗
          </span>
        </div>
      ))}
    </div>
  );

  const renderBadges = () => (
    <div className={`tab-pane ${activeTab === 'badges' ? 'active' : ''}`} role="tabpanel" aria-label="Badges">
      {proof.badgeSeries.map((serie, idx) => (
        <div key={serie.name}>
          <button type="button" className="serie-hd" onClick={() => toggleSeries(idx)}>
            <span className="serie-dot" style={{ background: serie.color }} />
            <span className="serie-name">{serie.name}</span>
            <span className="serie-count">{serie.count} badges</span>
            <span className={`serie-chev ${openSeries[idx] ? 'open' : ''}`}>▶</span>
          </button>
          <div className={`serie-body ${openSeries[idx] ? 'open' : ''}`}>
            {serie.badges.map((badge) => (
              <div key={badge} className="badge-row">
                <span className="badge-dot" style={{ background: serie.color }} />
                <span className="badge-name">{badge}</span>
                <span className="badge-lien">PB ↗</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderConfiance = () => (
    <div className={`tab-pane ${activeTab === 'confiance' ? 'active' : ''}`} role="tabpanel" aria-label="Confiance">
      <div className="conf-bloc">
        <div className="conf-titre">Intégrité du parcours</div>
        <div className="conf-row">
          <span className="conf-key">Hash PA</span>
          <span className="conf-val">{proof.hashShort} · vérifiable</span>
        </div>
        <div className="conf-row">
          <span className="conf-key">Généré le</span>
          <span className="conf-val">{proof.calculatedDate}</span>
        </div>
        <div className="conf-row">
          <span className="conf-key">Éléments</span>
          <span className="conf-val">
            {proof.kpis.projects + proof.kpis.stages} PP/PS agrégés
          </span>
        </div>
        <div className="conf-note">
          Ce hash agrège cryptographiquement l&apos;ensemble des preuves constitutives de ce parcours.
        </div>
      </div>
      <div className="sec-lbl">Co-attestants consolidés</div>
      {renderCoAttestants()}
      {showRightsLink && showPorteurBar && (
        <div className="droits-bloc">
          <div className="droits-titre">Vos droits sur ce parcours</div>
          <div className="droits-text">
            Conservation à vie · Droit d&apos;accès, rectification et portabilité · Possibilité de
            masquer l&apos;identité dans les vues partagées.
          </div>
          <Link to="/droits" className="btn-droits" style={{ background: trustColor }}>
            Exercer mes droits →
          </Link>
        </div>
      )}
    </div>
  );

  const renderDiplome = () => {
    if (!proof.diploma) return null;
    const dip = proof.diploma;
    return (
      <div className={`tab-pane ${activeTab === 'diplome' ? 'active' : ''}`} role="tabpanel" aria-label="Diplôme">
        <div className="dip-card">
          <ParcoursProofSeal hasDiploma size={60} />
          <div className="dip-titre">{dip.title}</div>
          <div className="dip-emit">
            <span className="dip-emit-dot" style={{ background: trustColor }} />
            <span className="dip-emit-name">{dip.emitters}</span>
            <span className="dip-emit-lvl">{dip.emitterLevel}</span>
          </div>
          <div className="dip-grid">
            <div className="dip-cell">
              <div className="dip-cell-k">Titulaire</div>
              <div className="dip-cell-v">{dip.holderName}</div>
            </div>
            <div className="dip-cell">
              <div className="dip-cell-k">Code diplôme</div>
              <div className="dip-cell-v">{dip.code}</div>
            </div>
            <div className="dip-cell">
              <div className="dip-cell-k">RNCP</div>
              <div className="dip-cell-v">{dip.rncp}</div>
            </div>
            <div className="dip-cell">
              <div className="dip-cell-k">Session</div>
              <div className="dip-cell-v">{dip.session}</div>
            </div>
          </div>
          <div className="dip-hash">{dip.hashShort} · vérifiable</div>
          <button type="button" className="dip-btn">
            Voir le diplôme ↗
          </button>
        </div>
        <div className="dip-note">
          Ce diplôme est cryptographiquement lié au parcours — vérifiable indépendamment.
        </div>
      </div>
    );
  };

  const renderShareButtons = () => (
    <div className="s-grid-6">
      {(['Copier le lien', 'PDF + QR', 'QR Code', 'LinkedIn'] as const).map((label) => (
        <button key={label} type="button" className="s-btn">
          <ShareIcon
            type={label === 'Copier le lien' ? 'link' : label === 'PDF + QR' ? 'pdf' : label === 'QR Code' ? 'qr' : 'li'}
            color={trustColor}
          />
          <div className="s-lbl" style={{ color: trustColor }}>
            {label}
          </div>
        </button>
      ))}
      {(['Europass', 'EUDI'] as const).map((label) => (
        <button key={label} type="button" className="s-btn dis" disabled>
          <ShareIcon type="eudi" color="#9ca3af" />
          <div className="s-lbl grey">{label}</div>
        </button>
      ))}
    </div>
  );

  const renderShare = () => {
    if (hasDiploma && proof.diploma) {
      return (
        <div className="share-sec">
          <div className="share-tabs">
            <button
              type="button"
              className={`share-tab ${shareMode === 'dip' ? 'act' : ''}`}
              onClick={() => setShareMode('dip')}
            >
              <span className="tab-dot" />
              Diplôme
            </button>
            <button
              type="button"
              className={`share-tab ${shareMode === 'par' ? 'act-blue' : ''}`}
              style={shareMode === 'par' ? { color: trustColor, borderBottomColor: trustColor } : undefined}
              onClick={() => setShareMode('par')}
            >
              Parcours
            </button>
          </div>
          {shareMode === 'dip' ? (
            <div className="s-grid-3">
              <button type="button" className="s-btn-g">
                <ShareIcon type="kdip" color={PARCOURS_GOLD} />
                <div className="s-lbl-g">Voir le diplôme</div>
                <div className="s-sub-g">{proof.diploma.code} ↗</div>
              </button>
              <button type="button" className="s-btn-g">
                <ShareIcon type="pdf" color={PARCOURS_GOLD} />
                <div className="s-lbl-g">Télécharger</div>
                <div className="s-sub-g">PDF avec QR code</div>
              </button>
              <button type="button" className="s-btn-g">
                <ShareIcon type="profil" color={PARCOURS_GOLD} />
                <div className="s-lbl-g">Au profil</div>
                <div className="s-sub-g">LinkedIn · Parcoursup</div>
              </button>
            </div>
          ) : (
            renderShareButtons()
          )}
        </div>
      );
    }

    return (
      <div className="share-sec">
        <div className="share-lbl">Partager le parcours</div>
        {renderShareButtons()}
      </div>
    );
  };

  return (
    <article className="pa">
      <div
        className={`pa-header ${hasDiploma ? 'pa-header-gold' : ''}`}
        style={{ background: trustColor }}
      >
        <div className="pa-top">
          <div className="pa-kmark">
            <div className="pa-kname" style={hasDiploma ? { color: PARCOURS_GOLD } : undefined}>
              Kinship
            </div>
            <div className="pa-ktype">
              {hasDiploma ? 'Parcours + Diplôme' : 'Preuve Parcours'}
            </div>
          </div>
          <div className="pa-num" style={hasDiploma ? { color: PARCOURS_GOLD } : undefined}>
            {proof.proofNumber}
          </div>
        </div>
        <div className="pa-sceau-row">
          <ParcoursProofSeal hasDiploma={hasDiploma} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pa-titre">{proof.parcoursTitle}</div>
            <div className="pa-sous">{proof.subtitle}</div>
          </div>
        </div>
      </div>

      {hasDiploma && proof.diploma && (
        <div className="pa-dip-bar">
          <span className="pa-dip-text">Diplôme inclus —</span>
          <span className="pa-dip-name">{proof.diploma.barLabel}</span>
        </div>
      )}

      <div
        className="pa-id"
        style={{ background: trust.dark }}
      >
        <span
          className={`pa-id-name ${anonymous ? 'pa-id-name-anon' : hasDiploma ? 'pa-id-name-gold' : ''}`}
          style={!anonymous && !hasDiploma ? { color: '#fff' } : undefined}
        >
          {holderLabel}
        </span>
      </div>

      <div className="pa-status">
        <div className="pa-dot" />
        <span className="pa-status-txt">{proof.statusText}</span>
        <span className="pa-status-dt">{proof.calculatedDate}</span>
      </div>

      <div className="pa-hash">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ flexShrink: 0 }} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="pa-hash-str">attestation · {proof.hashShort} · vérifiable</span>
        <button type="button" className="pa-hash-btn" style={{ background: trustColor }} aria-label="Vérifier l'authenticité de ce parcours">
          Vérifier ↗
        </button>
      </div>

      {showPorteurBar && (
        <div className="pa-porteur on">
          <span className="pa-porteur-lbl" style={{ color: trustColor }}>
            Vous consultez votre Preuve Parcours
          </span>
          <div className="pa-toggle-wrap">
            <span>Anonyme</span>
            <button
              type="button"
              className={`pa-toggle ${nominatif ? 'on' : ''}`}
              onClick={() => setNominatif(!nominatif)}
              role="switch"
              aria-checked={nominatif}
              aria-label="Afficher l'identité nominative"
            />
            <span>Nominatif</span>
          </div>
          {showRightsLink && (
            <Link
              to="/droits"
              className="btn-droits-sm"
              style={{ borderColor: trustColor, color: trustColor }}
            >
              Mes droits →
            </Link>
          )}
        </div>
      )}

      <nav className="pa-nav" role="tablist" aria-label="Sections de la Preuve Parcours">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={`pa-nav-btn ${tab.gold ? 'gold-tab' : ''} ${activeTab === tab.id ? 'active' : ''}`}
            aria-selected={activeTab === tab.id}
            style={
              !tab.gold && activeTab === tab.id
                ? { color: trustColor, borderBottomColor: trustColor }
                : undefined
            }
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="pa-dots">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`pa-dot-nav ${activeTab === tab.id ? 'on' : ''} ${tab.gold && activeTab === tab.id ? 'gold' : ''}`}
            style={
              !tab.gold && activeTab === tab.id ? { background: trustColor } : undefined
            }
          />
        ))}
      </div>

      <ParcoursProofFrise
        jalons={proof.friseJalons}
        start={proof.friseStart}
        end={proof.friseEnd}
        hasDiploma={hasDiploma}
      />

      <div className="pa-body">
        {renderDiplome()}
        {renderCadre()}
        {renderParcours()}
        {renderProjets()}
        {renderBadges()}
        {renderConfiance()}
      </div>

      {renderShare()}

      <footer className="pa-footer">
        Conservée à vie · Vérifiable sans compte Kinship · © 2026 Kinship SAS
        <div className="pa-footer-sep">
          <a href="https://kinship.fr" target="_blank" rel="noopener noreferrer">
            Découvrir Kinship →
          </a>
        </div>
      </footer>
    </article>
  );
};

export default ParcoursProofDetail;
