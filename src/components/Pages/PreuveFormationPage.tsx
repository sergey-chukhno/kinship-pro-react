import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { MOCK_OF_ORG } from '../../data/mockFormations';
import { getSelectedFormation } from '../../utils/formationStore';
import './PreuveFormationPage.css';

type TabId = 'participants' | 'cadre' | 'confiance' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'participants', label: 'Participants' },
  { id: 'cadre', label: 'Cadre' },
  { id: 'confiance', label: 'Confiance' },
  { id: 'export', label: 'Export' },
];

const DEFAULT_TITLE = 'Sécurité au travail · Gestes de premiers secours';
const DEFAULT_META = 'mars 2026 · Nice · Alpes-Maritimes · 21h';
const DEFAULT_PROOF = 'PP·2026·FR·X7K2A9M1';

interface ProofItem {
  type: 'pe' | 'pb' | 'pb-valid' | 'absent';
  name: string;
  pill?: string;
  ref?: string;
}

interface MockParticipant {
  id: string;
  initials: string;
  name: string;
  pp: string;
  statsMain: string;
  statsMainWarn?: boolean;
  statsSub: string;
  avatarWarn?: boolean;
  presences: ProofItem[];
  competences: ProofItem[];
}

const MOCK_PARTICIPANTS: MockParticipant[] = [
  {
    id: 'p1',
    initials: 'MD',
    name: 'Michel Dupont',
    pp: 'PP·2026·FR·A1B2C3D4 ↗',
    statsMain: '3 présences · 4 badges',
    statsSub: 'Réussite ✓',
    presences: [
      { type: 'pe', name: 'Jour 1 · 12/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P1 ↗' },
      { type: 'pe', name: 'Jour 2 · 13/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P2 ↗' },
      { type: 'pe', name: 'Jour 3 · 14/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P3 ↗' },
    ],
    competences: [
      { type: 'pb-valid', name: 'Sécurité au travail · EQF 3', pill: 'Jury ✓', ref: 'PB·2026·FR·B1 ↗' },
      { type: 'pb-valid', name: 'Gestes premiers secours · EQF 3', pill: 'Jury ✓', ref: 'PB·2026·FR·B2 ↗' },
      { type: 'pb', name: 'Prévention des risques · EQF 2', ref: 'PB·2026·FR·B3 ↗' },
      { type: 'pb', name: 'Équipements de protection individuelle', ref: 'PB·2026·FR·B4 ↗' },
    ],
  },
  {
    id: 'p2',
    initials: 'SM',
    name: 'Sophie Martin',
    pp: 'PP·2026·FR·E5F6G7H8 ↗',
    statsMain: '2 présences · 3 badges',
    statsSub: 'Réussite ✓',
    presences: [
      { type: 'pe', name: 'Jour 1 · 12/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P4 ↗' },
      { type: 'pe', name: 'Jour 2 · 13/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P5 ↗' },
    ],
    competences: [
      { type: 'pb-valid', name: 'Sécurité au travail · EQF 3', pill: 'Jury ✓', ref: 'PB·2026·FR·B5 ↗' },
      { type: 'pb-valid', name: 'Gestes premiers secours · EQF 3', pill: 'Jury ✓', ref: 'PB·2026·FR·B6 ↗' },
      { type: 'pb', name: 'Prévention des risques · EQF 2', ref: 'PB·2026·FR·B7 ↗' },
    ],
  },
  {
    id: 'p3',
    initials: 'LB',
    name: 'Lucas Bernard',
    pp: 'PP·2026·FR·I9J0K1L2 ↗',
    statsMain: '2/3 présences · 2 badges',
    statsMainWarn: true,
    statsSub: 'Incomplet ⚠',
    avatarWarn: true,
    presences: [
      { type: 'pe', name: 'Jour 1 · 12/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P8 ↗' },
      { type: 'pe', name: 'Jour 2 · 13/03/2026 · 7h', pill: '✓ Présence vérifiée', ref: 'PE·2026·FR·P9 ↗' },
      { type: 'absent', name: 'Jour 3 · 14/03/2026 · absent' },
    ],
    competences: [
      { type: 'pb', name: 'Prévention des risques · EQF 2', ref: 'PB·2026·FR·BA ↗' },
      { type: 'pb', name: 'Équipements de protection individuelle', ref: 'PB·2026·FR·BB ↗' },
    ],
  },
];

function KinshipCheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#115E59" opacity="0.12" />
      <path
        d="M10 16l4 4 8-8"
        stroke="#115E59"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarSealIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16 4l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z"
        fill="#fff"
        opacity="0.9"
      />
    </svg>
  );
}

function FrenchFlag() {
  return (
    <div className="pp-flag" aria-hidden>
      <span />
      <span />
      <span />
    </div>
  );
}

function proofIconClass(type: ProofItem['type']): string {
  if (type === 'pe') return 'proof-icon proof-icon-pe';
  if (type === 'pb-valid') return 'proof-icon proof-icon-pb-valid';
  if (type === 'pb') return 'proof-icon proof-icon-pb';
  return 'proof-icon proof-icon-absent';
}

function proofIconLabel(type: ProofItem['type']): string {
  if (type === 'absent') return '✗';
  return type.startsWith('pb') ? 'PB' : 'PE';
}

function pillClass(type: ProofItem['type']): string {
  if (type === 'pb-valid') return 'proof-pill proof-pill-valid';
  if (type === 'pe') return 'proof-pill proof-pill-pe';
  return 'proof-pill';
}

const PreuveFormationPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage, state } = useAppContext();
  const formation = getSelectedFormation();

  const [activeTab, setActiveTab] = useState<TabId>('participants');
  const [openId, setOpenId] = useState<string | null>(null);
  /** true = pendant période légale (nominatif) · false = après expiration (anonyme) */
  const [retentionActive, setRetentionActive] = useState(true);

  const title = formation?.title ?? DEFAULT_TITLE;
  const proofNumber = formation?.proofNumber ?? DEFAULT_PROOF;
  const orgName = MOCK_OF_ORG.name;
  const meta = (() => {
    if (!formation) return DEFAULT_META;
    return formation.meta
      .split(' · ')
      .filter((part) => !part.includes('PF·') && !part.includes('MC·UE·'))
      .slice(0, 3)
      .join(' · ');
  })();

  const back = () => {
    if (formation) {
      setCurrentPage('formation-detail');
      navigate('/formation-detail');
      return;
    }
    if (state.showingPageType === 'edu' || state.showingPageType === 'pro') {
      setCurrentPage('formations');
      navigate('/formations');
      return;
    }
    setCurrentPage('dashboard');
    navigate('/dashboard');
  };

  const toggleParticipant = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const renderProofRow = (item: ProofItem, key: string) => (
    <div
      key={key}
      className={`proof-row${item.type === 'absent' ? ' absent' : ''}`}
    >
      <div className={proofIconClass(item.type)}>{proofIconLabel(item.type)}</div>
      <span className="proof-name">{item.name}</span>
      {item.pill && retentionActive && (
        <span className={pillClass(item.type)}>{item.pill}</span>
      )}
      {item.ref && (
        <span className={retentionActive ? 'proof-arrow-regl' : 'proof-arrow-anon'}>
          {retentionActive ? item.ref : '— supprimé'}
        </span>
      )}
    </div>
  );

  return (
    <section className="preuve-formation-page" aria-label="Preuve Formation">
      <div className="preuve-formation-toolbar">
        <div className="preuve-formation-header-left">
          <button type="button" className="back-button" onClick={back} title="Retour">
            <i className="fas fa-arrow-left" aria-hidden />
          </button>
          <div className="preuve-formation-toolbar-title">
            <strong>Preuve Formation®</strong>
            {formation && <span>{formation.title}</span>}
          </div>
        </div>
        <div className="pf-retention-toggle" role="group" aria-label="État de rétention">
          <span className="pf-retention-toggle-label">Rétention</span>
          <button
            type="button"
            className={`pf-retention-btn${retentionActive ? ' on' : ''}`}
            onClick={() => setRetentionActive(true)}
          >
            Pendant (nominatif)
          </button>
          <button
            type="button"
            className={`pf-retention-btn${!retentionActive ? ' on' : ''}`}
            onClick={() => setRetentionActive(false)}
          >
            Après (anonyme)
          </button>
        </div>
      </div>

      <div className="pp">
        <div className="pp-card-top">
          <div className="pf-bar-regl">
            <span className="pf-bar-regl-title">Preuve Formation®</span>
            <span className="pf-bar-regl-sub">· Document réglementaire OF</span>
          </div>

          <div className="pp-official">
            <div className="pp-kmark">
              <KinshipCheckIcon />
              <div>
                <div className="pp-kname pp-kname-regl">Kinship</div>
                <div className="pp-ktype">Preuve Formation®</div>
              </div>
            </div>
            <div className="pp-num pp-num-regl">{proofNumber}</div>
          </div>

          <div className="pp-titre-zone pp-titre-zone-regl">
            <div className="pp-sceau pp-sceau-regl">
              <StarSealIcon />
            </div>
            <div className="pp-titre-bloc">
              <div className="pp-titre">{title}</div>
              <div className="pp-meta">{meta}</div>
              <div className="pp-org-line">
                <FrenchFlag />
                <span className="pp-org-name">{orgName}</span>
                <span className="pp-org-trust">· Qualiopi ✓</span>
              </div>
            </div>
          </div>

          <div className="kpis">
            <div className="kpi">
              <div className="kpi-n kpi-n-regl">24</div>
              <div className="kpi-l">Participants</div>
            </div>
            <div className="kpi">
              <div className="kpi-n kpi-n-regl">21h</div>
              <div className="kpi-l">Durée</div>
            </div>
            <div className="kpi">
              <div className="kpi-n kpi-n-regl">87</div>
              <div className="kpi-l">Badges</div>
            </div>
            <div className="kpi">
              <div className="kpi-n kpi-n-regl">22</div>
              <div className="kpi-l">Validations</div>
            </div>
          </div>

          <div className={`pp-status pp-status-regl${retentionActive ? '' : ' expired'}`}>
            <div
              className="pp-dot"
              style={{ background: retentionActive ? '#14B8A6' : '#FB923C' }}
            />
            <span
              className="pp-status-text"
              style={{ color: retentionActive ? '#0F766E' : '#E65100' }}
            >
              {retentionActive
                ? 'Preuve Formation® active · accès nominatif'
                : 'Période légale expirée · données nominatives supprimées'}
            </span>
            <span className="pp-status-date">
              {retentionActive ? "Valide jusqu'au 15/03/2031" : 'Expiré le 15/03/2031'}
            </span>
          </div>

          <div className="pp-hash">
            <span className="pp-hash-str">attestation · a3f9e2…c841 · vérifiable</span>
            <Link to="/verify" className="pp-hash-pill pp-hash-pill-regl">
              Vérifier ↗
            </Link>
          </div>

          <div className="retention-bar retention-bar-regl">
            <span className="retention-icon">{retentionActive ? '🔒' : 'ℹ️'}</span>
            <span className="retention-text retention-text-regl">
              {retentionActive
                ? 'Accès nominatif actif — obligation légale Art. L6353-1 Code du travail'
                : 'Période légale terminée — données nominatives supprimées par Kinship'}
            </span>
            <span className="retention-date">
              {retentionActive ? 'Expire le 15/03/2031' : 'Expiré le 15/03/2031'}
            </span>
          </div>
        </div>

        <nav className="pp-tabs" aria-label="Onglets Preuve Formation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`pp-tab pp-tab-regl${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="pp-body">
          {activeTab === 'participants' && (
            <div className="pf-tab-panel">
              {!retentionActive && (
                <div className="notice-box notice-regl">
                  ⚠️ Période légale terminée le 15/03/2031. Les données nominatives ont été
                  supprimées. La PP collective reste vérifiable à vie.
                </div>
              )}
              <div className="part-sum">
                <span>
                  <span className="part-sum-count">24 participants</span> · {title}
                </span>
                <span
                  className={`part-status${retentionActive ? '' : ' anon'}`}
                >
                  {retentionActive ? '● Nominatif actif' : '○ Anonymisé'}
                </span>
              </div>

              {MOCK_PARTICIPANTS.map((p) => {
                const isOpen = openId === p.id;
                return (
                  <div key={p.id} className="participant">
                    <button
                      type="button"
                      className="part-header"
                      onClick={() => toggleParticipant(p.id)}
                      aria-expanded={isOpen}
                    >
                      <div
                        className={`part-avatar${
                          retentionActive
                            ? p.avatarWarn
                              ? ' part-avatar-warn'
                              : ' part-avatar-regl'
                            : ' part-avatar-anon'
                        }`}
                      >
                        {retentionActive ? p.initials : '?'}
                      </div>
                      <div className="part-info">
                        <div
                          className={`part-name${retentionActive ? '' : ' part-name-anon'}`}
                        >
                          {retentionActive ? p.name : 'Données supprimées'}
                        </div>
                        <div className="part-pp-wrap">
                          <span
                            className={`part-pp${
                              retentionActive ? ' part-pp-regl' : ' part-pp-anon'
                            }`}
                          >
                            {retentionActive ? p.pp : '— lien supprimé'}
                          </span>
                        </div>
                      </div>
                      <div className="part-stats">
                        <div
                          className={`part-stats-main${p.statsMainWarn && retentionActive ? ' warn' : ''}`}
                        >
                          {p.statsMain}
                        </div>
                        <div className="part-stats-sub">{p.statsSub}</div>
                      </div>
                      <div className={`part-chev${isOpen ? ' open' : ''}`}>▶</div>
                    </button>
                    <div className={`part-body${isOpen ? ' open' : ''}`}>
                      <div className="part-section-label">Présences vérifiées</div>
                      {p.presences.map((item, i) =>
                        renderProofRow(item, `${p.id}-pe-${i}`)
                      )}
                      <div className="part-section-label spaced">
                        {p.id === 'p3' ? 'Compétences' : 'Compétences validées'}
                      </div>
                      {p.competences.map((item, i) =>
                        renderProofRow(item, `${p.id}-pb-${i}`)
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="part-more">21 participants supplémentaires ▾</div>
            </div>
          )}

          {activeTab === 'cadre' && (
            <div className="pf-tab-panel">
              <div className="sec-label">Formation</div>
              <div className="cadre-desc">
                Formation réglementaire Sécurité au travail et Gestes de Premiers Secours
                (SST). Habilitation INRS. Co-attestée par l&apos;entreprise cliente et
                l&apos;organisme de formation.
              </div>
              <div className="kpis kpis-rounded">
                <div className="kpi">
                  <div className="kpi-n kpi-n-regl">3</div>
                  <div className="kpi-l">Jours</div>
                </div>
                <div className="kpi">
                  <div className="kpi-n kpi-n-regl">21h</div>
                  <div className="kpi-l">Durée</div>
                </div>
                <div className="kpi">
                  <div className="kpi-n kpi-n-regl">EQF 3</div>
                  <div className="kpi-l">Niveau</div>
                </div>
                <div className="kpi">
                  <div className="kpi-n kpi-n-regl">RS</div>
                  <div className="kpi-l">Répertoire</div>
                </div>
              </div>

              <div className="sec-label">Co-attestants</div>
              <div className="org-row">
                <div className="org-avatar" style={{ background: '#115E59' }}>
                  CSP
                </div>
                <div className="org-info">
                  <div className="org-name">Centre de Formation Sécurité Pro</div>
                  <div className="org-role org-role-regl">
                    Partenaire Stratégique · Qualiopi
                  </div>
                </div>
                <div className="org-tag">Émetteur principal</div>
              </div>
              <div className="org-row">
                <div className="org-avatar" style={{ background: '#1565C0' }}>
                  MAT
                </div>
                <div className="org-info">
                  <div className="org-name">Industrie Maritima SAS</div>
                  <div className="org-role org-role-blue">Bleu Vérifié · Co-responsable</div>
                </div>
                <div className="org-tag">OPCO co-financeur</div>
              </div>

              <div className="sec-label sec-label-spaced">Référentiels utilisés</div>
              <div className="ref-row">
                <div className="ref-badge" style={{ background: '#115E59' }}>
                  EQF 3
                </div>
                <div className="ref-info">
                  <div className="ref-name">Sécurité au travail</div>
                  <div className="ref-sub">
                    Série : Sécurité professionnelle · INRS · authority_validated
                  </div>
                </div>
                <span className="ref-pill" style={{ background: '#E6F4F3', color: '#115E59' }}>
                  EQF 3
                </span>
              </div>
              <div className="ref-row">
                <div className="ref-badge" style={{ background: '#115E59' }}>
                  EQF 3
                </div>
                <div className="ref-info">
                  <div className="ref-name">Gestes de premiers secours</div>
                  <div className="ref-sub">
                    Série : SST · Croix Rouge Française · authority_validated
                  </div>
                </div>
                <span className="ref-pill" style={{ background: '#E6F4F3', color: '#115E59' }}>
                  EQF 3
                </span>
              </div>
              <div className="ref-row">
                <div className="ref-badge" style={{ background: '#4A6A8F' }}>
                  EQF 2
                </div>
                <div className="ref-info">
                  <div className="ref-name">Prévention des risques professionnels</div>
                  <div className="ref-sub">
                    Série : Sécurité professionnelle · INRS · institutional
                  </div>
                </div>
                <span className="ref-pill" style={{ background: '#E3F2FD', color: '#1565C0' }}>
                  EQF 2
                </span>
              </div>
              <div className="ref-row">
                <div className="ref-badge" style={{ background: '#9ca3af' }}>
                  —
                </div>
                <div className="ref-info">
                  <div className="ref-name">Équipements de protection individuelle</div>
                  <div className="ref-sub">
                    Série : Sécurité professionnelle · INRS · institutional
                  </div>
                </div>
                <span className="ref-pill" style={{ background: '#f0f0f0', color: '#6b7280' }}>
                  N/A
                </span>
              </div>
            </div>
          )}

          {activeTab === 'confiance' && (
            <div className="pf-tab-panel">
              <div className="conf-bloc">
                <div className="conf-titre">Intégrité de la preuve</div>
                <div className="conf-row">
                  <span className="conf-key">Numéro PP</span>
                  <span className="conf-val">{proofNumber}</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Hash attestation</span>
                  <span className="conf-val">a3f9e2…c841</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Algorithme</span>
                  <span className="conf-val">SHA-256 · sha256-v1</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Clôture</span>
                  <span className="conf-val">15/03/2026 · 23:59 UTC</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Statut</span>
                  <span className="conf-val conf-verified-regl">✓ Vérifiée</span>
                </div>
              </div>
              <div className="conf-bloc">
                <div className="conf-titre">Conservation légale</div>
                <div className="conf-row">
                  <span className="conf-key">Base légale</span>
                  <span className="conf-val">art. 6(1)(c) RGPD</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Texte</span>
                  <span className="conf-val">Art. L6353-1 Code du travail</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Durée</span>
                  <span className="conf-val">5 ans</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">Expiration nominatif</span>
                  <span className="conf-val">15/03/2031</span>
                </div>
                <div className="conf-row">
                  <span className="conf-key">PP collective après</span>
                  <span className="conf-val conf-verified-regl">Vérifiable à vie</span>
                </div>
              </div>
              <Link to="/verify" className="pp-hash-pill pp-hash-pill-regl verify-full">
                Vérifier l&apos;authenticité ↗
              </Link>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="pf-tab-panel">
              <div className="export-bloc">
                <div className="export-titre">📄 Export PDF Qualiopi</div>
                <div className="export-desc">
                  Rapport nominatif complet — présences vérifiées + compétences + réussites.
                  Horodaté et signé par Kinship SAS.
                </div>
                <button type="button" className="export-btn export-btn-pdf-regl">
                  {retentionActive ? 'Exporter PDF nominatif' : 'Exporter PDF anonyme'}
                </button>
                <div className="export-note">
                  {retentionActive
                    ? "Disponible jusqu'au 15/03/2031 · inclut les noms des participants"
                    : 'Export nominatif expiré — export anonyme disponible'}
                </div>
              </div>
              <div className="export-bloc">
                <div className="export-titre">🔗 Partager avec un contrôleur DGEFP</div>
                <div className="export-desc">
                  Génère un lien temporaire donnant accès à cette Preuve Formation®
                  nominative. Expire automatiquement à la fin de votre période légale.
                </div>
                <button type="button" className="export-btn export-btn-share-regl">
                  Générer un lien de partage
                </button>
                <div className="export-note-plain">
                  Accès révocable à tout moment · Expire au 15/03/2031
                </div>
              </div>
              <div className="export-bloc">
                <div className="export-titre">✓ Vérification publique permanente</div>
                <div className="export-desc">
                  La PP collective {proofNumber} reste vérifiable à vie sans compte Kinship.
                </div>
                <Link to="/verify" className="export-btn export-btn-share-regl">
                  Ouvrir /verify ↗
                </Link>
              </div>
              <div className="legal-footer">
                <strong>Transfert de responsabilité :</strong> À compter du{' '}
                <strong>15/03/2031</strong>, les données nominatives sont supprimées des
                serveurs Kinship SAS. L&apos;organisme de formation est seul responsable de la
                conservation du présent document (Art. L6353-1 Code du travail). La PP
                collective reste vérifiable à vie via kinship.io/verify.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PreuveFormationPage;
