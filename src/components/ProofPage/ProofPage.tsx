import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProofPageResponse } from '../../types/proofPage';
import { formatProofDateRange, formatRetentionDate, getFamilyChrome } from './proofPageFamily';
import ProofPageSeal from './ProofPageSeal';
import ProofTrustPill from './ProofTrustPill';
import './ProofPage.css';

type TabId = 'cadre' | 'acteurs' | 'etapes' | 'preuves' | 'confiance';

const TAB_LABELS: Record<TabId, string> = {
  cadre: 'Cadre',
  acteurs: 'Acteurs',
  etapes: 'Étapes',
  preuves: 'Preuves',
  confiance: 'Confiance',
};

function holderInitials(display: string, state: string): string {
  if (state === 'masked' || state === 'erased') return '?';
  const parts = display.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (state === 'initial') return parts[0].slice(0, 1).toUpperCase();
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function verifyUrl(proofNumber: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify/${encodeURIComponent(proofNumber)}`;
}

function qrSrc(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(url)}`;
}

interface ProofPageProps {
  data: ProofPageResponse;
  /** Optional override for « ‹ Mes preuves » target */
  backToMesPreuvesHref?: string;
}

const ProofPage: React.FC<ProofPageProps> = ({ data, backToMesPreuvesHref = '/pik' }) => {
  const { proof, view } = data;
  const isHolder = view === 'holder';
  const chrome = getFamilyChrome(proof.family);
  const showPreuvesTab = !proof.proofs.empty;
  const tabs = useMemo(() => {
    const all: TabId[] = ['cadre', 'acteurs', 'etapes', 'preuves', 'confiance'];
    return showPreuvesTab ? all : all.filter((t) => t !== 'preuves');
  }, [showPreuvesTab]);
  const [tab, setTab] = useState<TabId>('cadre');
  const activeTab = tabs.includes(tab) ? tab : 'cadre';

  const showExportStar =
    data.european_export_ui_enabled && proof.exportable;
  const showVerifyCta = data.proof_verify_api_enabled;
  const showEuropass = data.european_export_ui_enabled;
  const showPdf = data.proof_pdf_enabled;
  const showRights = data.rights_page_enabled;

  const sharingClosed = Boolean(isHolder && data.holder_zone?.sharing_closed);
  const linksCount = data.holder_zone?.links_count ?? 0;
  const linksMax = data.holder_zone?.links_max ?? 5;
  const retention = formatRetentionDate(proof.trust.retention_expiry_at);
  const vUrl = verifyUrl(proof.proof_number);

  const bandStyle: React.CSSProperties = chrome.cssVarMid
    ? {
        background: `linear-gradient(135deg, ${chrome.cssVarFrom}, ${chrome.cssVarMid} 50%, ${chrome.cssVarTo})`,
        color: chrome.cssVarInk,
      }
    : {
        background: `linear-gradient(135deg, ${chrome.cssVarFrom}, ${chrome.cssVarTo})`,
        color: chrome.cssVarInk,
      };

  const org = proof.organizations.find((o) => o.ref === proof.act.organization_ref) ?? proof.organizations[0];

  return (
    <div className="ppg-page">
      <article className="ppg-shell" aria-label="Page de la preuve">
        {isHolder && (
          <Link className="ppg-back" to={backToMesPreuvesHref}>
            ‹ Mes preuves
          </Link>
        )}

        {/* ① Bande */}
        <div className="ppg-band" style={bandStyle}>
          <span className="ppg-band-text">
            {chrome.bandLabel}
            {chrome.bandSub ? <span className="ppg-band-sub">{chrome.bandSub}</span> : null}
          </span>
        </div>

        {showExportStar && (
          <div className="ppg-export">
            <span aria-hidden>★</span> Exportable au format européen
          </div>
        )}

        {/* ② Grand bandeau */}
        <div className="ppg-head">
          <ProofPageSeal ink={chrome.cssVarInk} />
          <div>
            <h1>{proof.title}</h1>
            <div className="ppg-head-sub">
              {formatProofDateRange(proof.start_date, proof.end_date)}
              {' · '}
              {chrome.dateLine(proof.ended_at)}
            </div>
          </div>
        </div>

        {/* ③ Titulaire */}
        <div className="ppg-holder">
          <div className={`ppg-av ${proof.holder_state}`}>
            {holderInitials(proof.holder_display, proof.holder_state)}
          </div>
          <div>
            <div className="ppg-holder-lab">Titulaire</div>
            <div className="ppg-holder-nm">{proof.holder_display}</div>
          </div>
        </div>

        {/* ④ Repères — server list only (2 or 3) */}
        {proof.markers.length >= 2 && (
          <div className="ppg-markers">
            {proof.markers.map((m) => (
              <div key={`${m.label}-${m.value}`} className="ppg-marker">
                <b>{m.value}</b>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ⑤ Vérification */}
        <div className="ppg-verify">
          <a href={vUrl} aria-label="Ouvrir la page de vérification">
            <img className="ppg-qr" src={qrSrc(vUrl)} alt="" width={88} height={88} />
          </a>
          <div>
            <div className="ppg-num-lab">Numéro</div>
            <div className="ppg-num">{proof.proof_number}</div>
            {showVerifyCta && (
              <div className="ppg-verify-hint">
                {isHolder ? 'Cliquer sur le QR code.' : 'Vérifiable sans compte.'}
              </div>
            )}
          </div>
          {showVerifyCta && (
            <button type="button" className="ppg-vbtn" onClick={() => { window.location.href = vUrl; }}>
              Vérifier cette preuve ↗
            </button>
          )}
        </div>

        {/* ⑧ Zone titulaire — layout only (gestures → étape 4) */}
        {isHolder && data.holder_zone && (
          <section className="ppg-holder-zone" aria-label="Zone de la titulaire">
            <div className="ppg-hz-row">
              <button type="button" className="ppg-hz-btn" disabled={sharingClosed}>
                Partager
              </button>
              <button type="button" className="ppg-hz-btn ghost" disabled={sharingClosed}>
                Montrer
              </button>
            </div>
            {!sharingClosed && (
              <div className="ppg-hz-links">
                Vos liens · {linksCount} sur {linksMax}
              </div>
            )}
            <div className="ppg-hz-pills">
              <button type="button" className="ppg-hz-pill" disabled={sharingClosed}>
                Ajouter à un profil · LinkedIn
              </button>
              {showEuropass && (
                <button type="button" className="ppg-hz-pill" disabled={sharingClosed}>
                  Exporter vers Europass
                </button>
              )}
              {showPdf && (
                <button type="button" className="ppg-hz-pill" disabled={sharingClosed}>
                  Télécharger le PDF
                </button>
              )}
            </div>
            {sharingClosed && (
              <p className="ppg-hz-hint">
                Pour cela, votre compte a besoin d’une adresse email vérifiée.
              </p>
            )}
          </section>
        )}

        {/* ⑥ Onglets — barre + contenus structurels (famille riche = étapes 2–6) */}
        <div className="ppg-tabs" role="tablist">
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={`ppg-tab${activeTab === id ? ' on' : ''}`}
              onClick={() => setTab(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        <div className="ppg-panel" role="tabpanel">
          {activeTab === 'cadre' && (
            <>
              <h3>Description</h3>
              <p>{proof.description || '—'}</p>
              {org && (
                <>
                  <h3>La structure</h3>
                  <p>
                    <strong>{org.name}</strong>
                    {org.role_label ? ` · ${org.role_label}` : ''}
                  </p>
                  <ProofTrustPill label={org.trust_label} countryCode={org.country_code} />
                  {(org.sector || org.territory) && (
                    <p style={{ marginTop: 10 }}>
                      {org.sector ? `Secteur · ${org.sector}` : ''}
                      {org.sector && org.territory ? ' · ' : ''}
                      {org.territory ? `Territoire · ${org.territory}` : ''}
                    </p>
                  )}
                </>
              )}
            </>
          )}
          {activeTab === 'acteurs' && (
            <>
              <h3>Qui a attesté</h3>
              <p>
                {proof.actors.participants_count} participant
                {proof.actors.participants_count === 1 ? '' : 's'}, jamais nommés
              </p>
              <p>Contenu détaillé Acteurs — étapes Formation / Projet / Stage.</p>
            </>
          )}
          {activeTab === 'etapes' && (
            <>
              <h3>Étapes</h3>
              <p>
                Ouverture · {proof.timeline.opening.date}
                {proof.timeline.sessions
                  ? ` · Présence : ${proof.timeline.sessions.attended} séances sur ${proof.timeline.sessions.total}`
                  : ''}
              </p>
              <p>Contenu détaillé Étapes — étapes suivantes.</p>
            </>
          )}
          {activeTab === 'preuves' && (
            <>
              <h3>Preuves</h3>
              {proof.proofs.validation && <p>{proof.proofs.validation.label}</p>}
              <p>{proof.proofs.program.length} compétence(s) au programme (détail étape 2).</p>
            </>
          )}
          {activeTab === 'confiance' && (
            <>
              <h3>Confiance</h3>
              {showVerifyCta && <p>Vérifiable sans compte par son numéro</p>}
              {retention && (
                <>
                  <p className="ppg-retention">
                    Données de formation conservées par l’émetteur jusqu’au {retention} (obligation
                    légale)
                  </p>
                  <p className="ppg-retention-note">
                    La date limite concerne la durée de conservation du dossier de formation par
                    l’émetteur. La preuve reste authentique et vérifiable — sans limite.
                  </p>
                </>
              )}
            </>
          )}
        </div>

        {/* ⑨ Pied */}
        <footer className="ppg-footer">
          {isHolder ? (
            showRights ? (
              <button type="button" className="ppg-footer-rights">
                Exercer mes droits
              </button>
            ) : null
          ) : (
            <p>Cette page est partagée par la personne concernée.</p>
          )}
          <p>
            <a href="https://kinshipedu.fr" target="_blank" rel="noopener noreferrer">
              Découvrir Kinship et créer votre espace — kinshipedu.fr ↗
            </a>
          </p>
          <p>© 2026 Kinship SAS</p>
        </footer>
      </article>
    </div>
  );
};

export default ProofPage;
