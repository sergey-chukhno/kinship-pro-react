import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FunderFollowData, FunderSignal } from '../../data/mockFunderView';
import './FunderView.css';

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
}

const FunderFollowView: React.FC<FunderFollowViewProps> = ({ data, preview }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'seances' | 'programme'>('seances');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  if (data.closed) {
    return (
      <div className={`fv-ended ${preview ? 'preview' : ''}`}>
        <KinshipMark muted />
        <p className="fv-ended-title">
          {data.kind === 'project' ? 'Ce projet est clôturé le' : 'Cette formation est clôturée le'} {data.closedOn ?? '—'}.
        </p>
        <p className="fv-ended-sub">
          Votre lien de suivi a pris fin. Le rapport vous a été transmis par email.
        </p>
      </div>
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

      {!preview && data.kind === 'project' && (
        <div className="fv-invite">
          <div className="fv-invite-title">Retrouvez tous vos projets financés au même endroit</div>
          <p>
            Si votre organisation a un espace Kinship, les projets que vous financez
            apparaissent dans Suivi financement.
          </p>
          <button
            type="button"
            className="fv-cta"
            onClick={() => navigate(localStorage.getItem('jwt_token') ? '/funded-projects' : '/register')}
          >
            {localStorage.getItem('jwt_token') ? 'Voir mes projets financés' : 'Créer l’espace de mon organisation'}
          </button>
        </div>
      )}
      {!preview && data.kind !== 'project' && (
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

export default FunderFollowView;
