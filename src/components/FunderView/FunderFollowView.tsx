import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunderFollowData, FunderSignal } from '../../data/mockFunderView';
import './FunderView.css';
import '../Pages/FundedProjectsPage.css';

function KinshipMark({ muted = false }: { muted?: boolean }) {
  const fill = muted ? 'none' : '#003189';
  const stroke = muted ? '#9ca3af' : 'none';
  const text = muted ? '#9ca3af' : '#fff';
  return (
    <svg width="30" height="30" viewBox="0 0 52 52" aria-hidden>
      <polygon
        points="26,2 50,14 50,38 26,50 2,38 2,14"
        fill={fill}
        stroke={stroke}
        strokeWidth={muted ? 2 : 0}
      />
      <text
        x="26"
        y="32"
        textAnchor="middle"
        fontSize="15"
        fontWeight="500"
        fill={text}
      >
        K
      </text>
    </svg>
  );
}

function strongestSignal(signals: FunderSignal[]): FunderSignal | undefined {
  return (
    signals.find((s) => s.kind === 'gap') ??
    signals.find((s) => s.kind === 'manual') ??
    signals.find((s) => s.kind === 'dates') ??
    signals[0]
  );
}

interface FunderFollowViewProps {
  data: FunderFollowData;
  preview?: boolean;
  onConfirmToken?: () => Promise<void>;
  onDeclineToken?: () => Promise<void>;
}

const FunderFollowView: React.FC<FunderFollowViewProps> = ({ data, preview, onConfirmToken, onDeclineToken }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'seances' | 'programme'>('seances');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  if (data.declined) {
    return (
      <div className={`fv-ended ${preview ? 'preview' : ''}`}>
        <KinshipMark muted />
        <p className="fv-ended-title">Ce lien de suivi a pris fin.</p>
        <p className="fv-ended-sub">
          Votre organisation a décliné cette désignation{data.declinedOn ? ` le ${data.declinedOn}` : ''}.
        </p>
      </div>
    );
  }

  if (data.closed && data.kind === 'project' && data.report) {
    return <ProjectFunderReport data={data} preview={preview} />;
  }

  if (data.closed) {
    return (
      <div className={`fv-ended ${preview ? 'preview' : ''}`}>
        <KinshipMark muted />
        <p className="fv-ended-title">
          {data.kind === 'project' ? 'Ce projet est clôturé le' : 'Cette formation est clôturée le'} {data.closedOn ?? '—'}.
        </p>
        <p className="fv-ended-sub">Le rapport vous a été transmis par email.</p>
      </div>
    );
  }

  if (data.kind === 'project') {
    return (
      <ProjectFunderFollow
        data={data}
        preview={preview}
        onConfirmToken={onConfirmToken}
        onDeclineToken={onDeclineToken}
      />
    );
  }

  const gap = data.signals.find((s) => s.kind === 'gap');
  const watch = data.signals.filter((s) => s.kind !== 'gap');
  const top = strongestSignal(data.signals);

  return (
    <div className={`fv-follow ${preview ? 'preview' : ''}`}>
      <header className="fv-top">
        <div className="fv-brand">
          <KinshipMark />
          <div>
            <div className="fv-brand-name">Kinship</div>
            <div className="fv-brand-sub">Suivi financeur</div>
          </div>
        </div>
        {data.financement && <span className="fv-chip cpf">{data.financement}</span>}
      </header>

      <h1 className="fv-title">{data.title}</h1>
      <p className="fv-org">
        {data.org} · {data.dateRange}
      </p>
      <div className="fv-chips">
        <span className="fv-chip status">{data.statusLabel}</span>
        {data.qualiopi && <span className="fv-chip trust">◆ Qualiopi</span>}
        {data.attendanceSurvey && (
          <span className="fv-chip survey">🛡 Vérification d&apos;assiduité active</span>
        )}
      </div>

      {!top && (
        <div className="fv-state ok">
          <span className="fv-dot ok" />
          <b>Rien à signaler</b>
          <span>— aucun report, aucune annulation, aucun constat d&apos;écart</span>
        </div>
      )}

      {watch.length > 0 && (
        <div className="fv-state watch">
          <div className="fv-state-head">
            <span className="fv-dot watch" />
            <b>À regarder</b>
            <span>— un ou plusieurs constats</span>
          </div>
          <ul>
            {watch.map((s) => (
              <li key={s.kind}>
                {s.kind === 'dates' && '📅 '}
                {s.kind === 'cancelled' && '✕ '}
                {s.kind === 'manual' && '✍ '}
                <b>{s.label}</b> — {s.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gap && (
        <div className="fv-state gap">
          <div className="fv-state-head">
            <span className="fv-dot gap" />
            <b>⚠ Constat d&apos;écart — vérification d&apos;assiduité</b>
          </div>
          <p>{gap.detail}</p>
          <p className="fv-state-note">
            Kinship constate, n&apos;interprète pas. Les suites appartiennent au financeur.
            L&apos;identité des répondants n&apos;est jamais révélée — à personne.
          </p>
        </div>
      )}

      <div className="fv-kpis">
        <div className="fv-kpi">
          <b>
            {data.hoursDone}
            <small> /{data.hoursTotal}</small>
          </b>
          <span>Heures réalisées</span>
        </div>
        <div className="fv-kpi">
          <b className="ok">{data.attendanceRate}</b>
          <span>Assiduité</span>
        </div>
        <div className="fv-kpi">
          <b>
            {data.sessionsDone}
            <small>/{data.sessionsTotal}</small>
          </b>
          <span>Séances</span>
        </div>
        {data.showIdentities && (
          <div className="fv-kpi">
            <b className="ok">
              {data.identitiesDone}
              <small>/{data.identitiesTotal}</small>
            </b>
            <span>Identités vérifiées</span>
          </div>
        )}
      </div>
      <div className="fv-bar">
        <div style={{ width: `${Math.min(100, data.hoursPercent)}%` }} />
      </div>

      <div className="fv-stepper">
        <span className={data.informedOn ? 'done' : 'todo'}>
          {data.informedOn ? `✓ Informé du démarrage ${data.informedOn}` : '○ Informé du démarrage'}
        </span>
        {data.informedOn && <span className="fv-legal">art. L. 6353-10</span>}
        <span className="sep">·</span>
        <span className={data.phase === 'live' ? 'live' : 'todo'}>
          {data.phase === 'live' ? '● Suivi en direct' : '○ Suivi en direct'}
        </span>
        <span className="sep">·</span>
        <span className="todo">
          ○ Rapport à la clôture
          {data.reportDue ? ` — prévue le ${data.reportDue}` : ''}
        </span>
      </div>

      <div className="fv-tabs" role="tablist">
        <button
          type="button"
          className={tab === 'seances' ? 'on' : ''}
          onClick={() => setTab('seances')}
        >
          Séances
        </button>
        <button
          type="button"
          className={tab === 'programme' ? 'on' : ''}
          onClick={() => setTab('programme')}
        >
          Le programme
        </button>
      </div>

      {tab === 'seances' && (
        <div>
          {data.sessions.length === 0 && (
            <p className="fv-empty">Aucune séance tenue pour l&apos;instant.</p>
          )}
          {data.sessions.map((s) => (
            <div key={s.id} className={`fv-session ${s.kind}`}>
              {s.kind === 'group' ? (
                <button
                  type="button"
                  className="fv-group"
                  onClick={() => setOpenGroup((id) => (id === s.id ? null : s.id))}
                >
                  {s.title} · {s.meta}
                </button>
              ) : (
                <div>
                  <b>{s.title}</b>
                  {s.meta ? ` · ${s.meta}` : ''}
                  {s.duration && <span className="muted"> ({s.duration})</span>}
                  {s.kind === 'next' && s.recap && (
                    <span className="muted"> {s.recap}</span>
                  )}
                </div>
              )}
              {s.kind === 'done' && s.recap && <div className="fv-recap">{s.recap}</div>}
              {s.kind === 'group' && openGroup === s.id && s.collapsedDetail && (
                <div className="fv-recap">{s.collapsedDetail}</div>
              )}
            </div>
          ))}
          <p className="fv-footnote">
            Des agrégats par séance — jamais de donnée nominative sur cette vue. Le détail
            nominatif relève du rapport de clôture, selon le partage choisi par l&apos;organisme.
          </p>
        </div>
      )}

      {tab === 'programme' && (
        <div>
          <p className="fv-desc">{data.description}</p>
          <div className="fv-chips">
            <span className="fv-chip plain">{data.location}</span>
            <span className="fv-chip plain">{data.level}</span>
            <span className="fv-chip plain">{data.language}</span>
            <span className="fv-chip plain">{data.hoursTotal}</span>
          </div>
          <h2 className="fv-h">Les acquis visés — le programme</h2>
          <ul className="fv-outcomes">
            {data.outcomes.map((o) => (
              <li key={o.text}>
                {o.source === 'DigComp' ? '📚 ' : ''}
                {o.text} <span className="muted">— {o.source}</span>
              </li>
            ))}
          </ul>
          <p className="fv-footnote">
            Le cadre annoncé à l&apos;inscription — figé à la création de la formation{' '}
            <span className="fv-legal">(art. L. 6353-8 C. trav.)</span>. Ce que vous financez ne
            change pas en route.
          </p>
        </div>
      )}

      {!preview && (
        <>
          <div className="fv-invite">
            <div className="fv-invite-title">Retrouvez toutes vos formations au même endroit</div>
            <p>
              Créez l&apos;espace de votre organisation sur Kinship — chaque formation que vous
              financez vous y attend, en direct.
            </p>
            <button type="button" className="fv-cta" onClick={() => navigate('/financeur')}>
              Créer l&apos;espace de mon organisation
            </button>
          </div>
          <p className="fv-journal">
            Lien fourni par l&apos;organisme de formation · consultation journalisée ·
            l&apos;organisme peut le révoquer
          </p>
        </>
      )}
    </div>
  );
};

function ProjectFunderFollow({
  data,
  preview,
  onConfirmToken,
  onDeclineToken,
}: {
  data: FunderFollowData;
  preview?: boolean;
  onConfirmToken?: () => Promise<void>;
  onDeclineToken?: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'avancement' | 'cadre'>('avancement');
  const [declining, setDeclining] = useState(false);
  const [confirmed, setConfirmed] = useState(!data.needsConfirmation);
  const watch = data.signals.filter((s) => s.kind === 'dates' || s.kind === 'manual');
  const weekPct = data.weekTotal ? Math.min(100, Math.round(((data.weekCurrent || 0) / data.weekTotal) * 100)) : 0;

  return (
    <div className={`fv-follow ${preview ? 'preview' : ''}`}>
      {data.needsConfirmation && !confirmed && (
        <div className="fp-card confirm" style={{ marginBottom: 12 }}>
          <div className="fp-banner confirm" style={{ margin: '-10px -12px 8px' }}>
            ● À confirmer — {data.org} vous a désigné financeur de ce projet
          </div>
          <p style={{ fontSize: 12, color: '#4c6a5f', margin: '0 0 10px' }}>
            Le suivi marche dès aujourd’hui — rien n’attend votre clic. Confirmer dit simplement « c’est bien nous ». Décliner dit « nous ne finançons pas ce projet ».
          </p>
          {declining ? (
            <div className="fp-decline">
              <div className="fp-decline-title">Décliner cette désignation ?</div>
              <p>Vous indiquez : « nous ne finançons pas ce projet ». La désignation sera retirée chez {data.org}, qui en sera notifiée. Ce lien de suivi prendra fin.</p>
              <div className="fp-row2">
                <button type="button" className="fp-decline-yes" onClick={() => void onDeclineToken?.()}>Oui, décliner</button>
                <button type="button" className="fp-btn-ghost" onClick={() => setDeclining(false)}>Revenir</button>
              </div>
            </div>
          ) : (
            <div className="fp-row2">
              <button type="button" className="fp-btn-confirm" onClick={() => void onConfirmToken?.().then(() => setConfirmed(true))}>Confirmer</button>
              <button type="button" className="fp-btn-ghost" onClick={() => setDeclining(true)}>Décliner</button>
            </div>
          )}
        </div>
      )}

      <header className="fv-top">
        <div className="fv-brand">
          <KinshipMark />
          <div>
            <div className="fv-brand-name">Kinship</div>
            <div className="fv-brand-sub">Suivi financeur</div>
          </div>
        </div>
        {data.financement && <span className="fv-chip cpf">{data.financement}</span>}
      </header>
      <h1 className="fv-title">{data.title}</h1>
      <p className="fv-org">{data.org}{data.orgKind ? ` (${data.orgKind})` : ''} · {data.dateRange}</p>
      <div className="fv-chips">
        <span className="fv-chip status">{data.statusLabel}</span>
      </div>

      {watch.length === 0 ? (
        <div className="fv-state ok">
          <span className="fv-dot ok" />
          <b>Rien à signaler</b>
          <span>— aucun signal actif sur ce projet</span>
        </div>
      ) : (
        <div className="fv-state watch">
          <div className="fv-state-head">
            <span className="fv-dot watch" />
            <b>À regarder</b>
            <span>— un ou plusieurs constats</span>
          </div>
          <ul>
            {watch.map((s) => (
              <li key={s.label}><b>{s.label}</b> — {s.detail}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="fv-kpis">
        <div className="fv-kpi">
          <b>S{data.weekCurrent || 0}<small> /{data.weekTotal || 0}</small></b>
          <span>Avancement</span>
        </div>
        <div className="fv-kpi">
          <b>{data.participantsCount ?? 0}</b>
          <span>Participants</span>
        </div>
        <div className="fv-kpi">
          <b className="ok">{data.proofsCount ?? 0}</b>
          <span>Preuves attestées</span>
        </div>
        <div className="fv-kpi">
          <b>{data.lastActivityDays ?? 0} j</b>
          <span>Dernière activité</span>
        </div>
      </div>
      <div className="fv-bar"><i style={{ width: `${weekPct}%` }} /></div>

      <div className="fv-stepper">
        <span>✓ Informé du démarrage {data.informedOn || ''}</span>
        <span>● Suivi en direct</span>
        <span>○ Rapport à la clôture{data.reportDue ? ` — prévue le ${data.reportDue}` : ''}</span>
      </div>

      <div className="fv-tabs">
        <button type="button" className={tab === 'avancement' ? 'on' : ''} onClick={() => setTab('avancement')}>L’avancement</button>
        <button type="button" className={tab === 'cadre' ? 'on' : ''} onClick={() => setTab('cadre')}>Le cadre</button>
      </div>
      {tab === 'avancement' ? (
        <p className="fv-journal">Des constats datés et journalisés, en agrégats — jamais une donnée nominative sur cette vue.</p>
      ) : (
        <div>
          <p className="fv-desc">{data.description}</p>
          <div className="fv-klabel">Les partenaires du projet</div>
          {(data.partners || []).map((p) => (
            <div key={p.name} className="fv-partner">{p.name} <span>— {p.role}</span></div>
          ))}
          <div className="fv-klabel">Votre financement</div>
          <p className="fv-desc">{data.financement}{data.designatedOn ? ` — désignation du ${data.designatedOn}` : ''}</p>
        </div>
      )}

      {!preview && (
        <div className="fv-invite">
          <b>Retrouvez tous vos projets au même endroit</b>
          <p>Créez l’espace de votre organisation sur Kinship — vos suivis vous y retrouvent, en direct.</p>
          <button type="button" className="fv-cta" onClick={() => navigate('/register')}>Créer l’espace de mon organisation</button>
        </div>
      )}
      <p className="fv-journal">Lien fourni par la structure porteuse · consultation journalisée</p>
    </div>
  );
}

function ProjectFunderReport({ data, preview }: { data: FunderFollowData; preview?: boolean }) {
  const report = data.report;
  if (!report) return null;
  return (
    <div className={`fv-follow ${preview ? 'preview' : ''}`}>
      <header className="fv-top">
        <div className="fv-brand">
          <KinshipMark />
          <div>
            <div className="fv-brand-name">Rapport de clôture</div>
            <div className="fv-brand-sub">Suivi financeur — projet</div>
          </div>
        </div>
      </header>
      <h1 className="fv-title">{data.title}</h1>
      <p className="fv-org">{data.org} · {data.dateRange} · clos le {data.closedOn}</p>
      <div className="fv-kpis">
        <div className="fv-kpi"><b>{report.weeks}</b><span>Semaines</span></div>
        <div className="fv-kpi"><b>{report.participantsCount}</b><span>Participants</span></div>
        <div className="fv-kpi"><b className="ok">{report.proofsCount}</b><span>Preuves attestées</span></div>
        <div className="fv-kpi"><b>1</b><span>Preuve Projet</span></div>
      </div>
      <div className="fv-klabel">La vie du projet</div>
      {report.life.map((line) => <p key={line} className="fv-desc">● {line}</p>)}
      <div className="fv-klabel">{report.anonymous ? 'Les participants — partage anonyme' : 'Les participants — partage nominatif'}</div>
      {report.anonymous ? (
        <p className="fv-desc">{report.participantsCount} participants · {report.proofsCount} preuves attestées — aucune identité.</p>
      ) : (
        report.participants.map((p) => (
          <div key={p.name} className="fv-partner">{p.name} <span>{p.role}</span></div>
        ))
      )}
      <p className="fv-journal">La consultation en ligne fait foi — le PDF n’est qu’une restitution.</p>
    </div>
  );
}

export default FunderFollowView;
