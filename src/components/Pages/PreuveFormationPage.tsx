import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  FINANCEMENT_LABEL,
  MOCK_OF_ORG,
  PARTICIPATION_LABEL,
} from '../../data/mockFormations';
import { getFormationPeople, getSelectedFormation } from '../../utils/formationStore';
import { useToast } from '../../hooks/useToast';
import './PreuveFormationPage.css';

type TabId = 'participants' | 'cadre' | 'confiance' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'participants', label: 'Participants' },
  { id: 'cadre', label: 'Cadre' },
  { id: 'confiance', label: 'Confiance' },
  { id: 'export', label: 'Export' },
];

const OF_PARTICIPANTS = [
  {
    id: 'nb',
    initials: 'NB',
    name: 'Nadia Belkacem',
    identity: 'identité ✓',
    presence: 'présence 8/8',
    objects: '1 PF · 8 PE · 2 PB',
  },
  {
    id: 'kt',
    initials: 'KT',
    name: 'Karim Tounsi',
    identity: 'identité ✓',
    presence: 'présence 7/8',
    objects: '1 PF · 7 PE · 1 PB',
  },
  {
    id: 'md',
    initials: 'MD',
    name: 'Marc Dubois',
    identity: 'identité ✓',
    presence: 'présence 8/8',
    objects: '1 PF · 8 PE · 1 PB',
  },
];

const PreuveFormationPage: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess } = useToast();
  const formation = getSelectedFormation();
  const [tab, setTab] = useState<TabId>('participants');
  const [openId, setOpenId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  const people = formation ? getFormationPeople(formation.id) : { participants: [] };
  const proofNumber = formation?.proofNumber ?? 'PF·2027·FR·4K8NX2QM';
  const token = formation?.pfShareToken ?? 'pf-debuter-numerique';
  const hours = formation?.durationHours ?? 60;
  const participantCount = Math.max(people.participants.length, 12);

  const dateLabel = useMemo(() => {
    if (!formation?.startDate || !formation?.endDate) return '5 janv. → 27 mars 2027';
    const fmt = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${Number(d)}/${m}/${y}`;
    };
    return `${fmt(formation.startDate)} → ${fmt(formation.endDate)}`;
  }, [formation]);

  const back = () => {
    setCurrentPage('formations');
    navigate('/formations');
  };

  const openProof = () => {
    setCurrentPage('pik');
    navigate(`/pik/preuve/pf/${token}`);
  };

  if (!formation) {
    return (
      <section className="rapport-of">
        <button type="button" className="back-button" onClick={back}>
          <i className="fas fa-arrow-left" aria-hidden />
        </button>
        <p className="rapport-empty">Aucune formation sélectionnée.</p>
      </section>
    );
  }

  return (
    <section className="rapport-of" aria-label="Rapport Preuve Formation">
      <div className="rapport-toolbar">
        <button type="button" className="back-button" onClick={back} title="Retour">
          <i className="fas fa-arrow-left" aria-hidden />
        </button>
        <div>
          <h1>Rapport OF</h1>
          <p>{formation.title}</p>
        </div>
        <button type="button" className="rof-btn" onClick={() => setCertOpen((v) => !v)}>
          Certificat de réalisation
        </button>
      </div>

      <article className="rof-doc">
        <header className="rof-head">
          <div>
            <div className="rof-lib">Preuve Formation® réglementaire</div>
            <div className="rof-sub">{formation.title}</div>
            <div className="rof-sub">
              {MOCK_OF_ORG.name} · {MOCK_OF_ORG.qualiopiLabel} · {dateLabel}
            </div>
          </div>
          <div className="rof-num">
            {proofNumber.includes('·')
              ? proofNumber.replace(/·([^·]+)$/, '\n$1')
              : proofNumber}
          </div>
        </header>

        <div className="rof-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              className={`rof-tab ${tab === item.id ? 'on' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="rof-body">
          {tab === 'participants' && (
            <>
              <div className="rof-band warn">
                Accès nominatif jusqu&apos;au <b>27/03/2030</b> (rétention) — ensuite les noms
                s&apos;effacent ; la preuve collective reste vérifiable à vie.
              </div>
              {OF_PARTICIPANTS.map((p) => (
                <div key={p.id}>
                  <button
                    type="button"
                    className="rof-prow"
                    onClick={() => setOpenId((id) => (id === p.id ? null : p.id))}
                  >
                    <b>{p.name}</b>
                    <span className="rof-pill">{p.identity}</span>
                    <span className="rof-pill">{p.presence}</span>
                    <span className="rof-pill">{p.objects}</span>
                    <span className="rof-link">
                      {openId === p.id ? 'Replier ▴' : 'Déplier ▾'}
                    </span>
                  </button>
                  {openId === p.id && (
                    <div className="rof-drill">
                      <div className="rof-drill-head">
                        <span className="rof-avatar">{p.initials}</span>
                        <b>{p.name}</b>
                        <span className="rof-pill">identité ✓ France Identité</span>
                      </div>
                      <h3>Ses objets probatoires</h3>
                      <div className="rof-obj">
                        <b className="pf">PF</b>
                        <span>Sa Preuve Formation — sa vue de l&apos;objet</span>
                        <code>{proofNumber}</code>
                        <button type="button" className="rof-link" onClick={openProof}>
                          Ouvrir la preuve ↗
                        </button>
                      </div>
                      <div className="rof-obj">
                        <b className="pe">PE</b>
                        <span>Présence vérifiée — 8 séances</span>
                        <code>PE·2027·FR·J8Q2… ×8</code>
                      </div>
                      <div className="rof-obj">
                        <b className="pb">PB</b>
                        <span>Utiliser un traitement de texte · EQF 2</span>
                        <code>PB·2027·FR·T7Q3K2MRXW</code>
                      </div>
                      <h3>La restitution des présences — par séance</h3>
                      <div className="rof-session">
                        <b>Séance 1 — 06/01/2027</b>
                        <div>
                          Session matinée · ouverte 9h00 → close 12h30 —{' '}
                          <b className="ok">validé 9h47</b>
                        </div>
                        <div>
                          Session après-midi · ouverte 14h00 → close 17h30 —{' '}
                          <b className="ok">validé 14h05</b>
                        </div>
                      </div>
                      <div className="rof-session">
                        <b>Séance 4 — 27/01/2027</b>
                        <div>
                          Session matinée · ouverte 9h02 → close 12h30 —{' '}
                          <span className="muted">sans saisie</span> ·{' '}
                          <span className="note">
                            attestée par la formatrice à la clôture de séance
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <p className="rof-more">+ {Math.max(0, participantCount - 3)} autres participants</p>
            </>
          )}

          {tab === 'cadre' && (
            <>
              <div className="rof-kpis">
                <div>
                  <strong>{participantCount}</strong>
                  <span>participants</span>
                </div>
                <div>
                  <strong>104</strong>
                  <span>preuves</span>
                </div>
                <div>
                  <strong>{hours} h</strong>
                  <span>durée</span>
                </div>
              </div>
              <div className="rof-kv">
                <span>Formation</span>
                <b>{formation.title}</b>
              </div>
              <div className="rof-kv">
                <span>Dates · durée · mode</span>
                <b>
                  {dateLabel} · {hours} heures ·{' '}
                  {formation.participationMode
                    ? PARTICIPATION_LABEL[formation.participationMode].toLowerCase()
                    : 'présentiel'}
                </b>
              </div>
              <div className="rof-kv">
                <span>Financement</span>
                <b>
                  {formation.financement
                    ? FINANCEMENT_LABEL[formation.financement]
                    : '—'}
                </b>
              </div>
              <h3>Co-attestants — figés à la clôture</h3>
              <div className="rof-obj">
                <span>🏢</span>
                <span>
                  <b>{MOCK_OF_ORG.name}</b> — émettrice · {MOCK_OF_ORG.qualiopiLabel}
                </span>
              </div>
              <div className="rof-obj">
                <span>✓</span>
                <span>
                  <b>Cabinet Dutto</b> — co-attestée par R. Dutto, expert-comptable
                </span>
              </div>
              <h3>Référentiels utilisés</h3>
              <div className="rof-obj">
                <span>📚</span>
                <span>
                  <b>DigComp 2.2</b> — Domaine 1 · EQF 2{' '}
                  <span className="muted">· source : JRC128415 (2022) — le texte anglais fait foi</span>
                </span>
              </div>
              <div className="rof-obj">
                <span>📚</span>
                <span>
                  <b>Catalogue Kinship</b> — Présence vérifiée
                </span>
              </div>
            </>
          )}

          {tab === 'confiance' && (
            <>
              <div className="rof-kv">
                <span>Empreinte de la preuve</span>
                <b>
                  9f3a71e2c04b…d8b84c{' '}
                  <span className="muted">— vérifiable en ligne</span>
                </b>
              </div>
              <div className="rof-kv">
                <span>Scellée le</span>
                <b>27 mars 2027 — irréversible</b>
              </div>
              <div className="rof-kv">
                <span>Base légale</span>
                <b>
                  art. 6(1)(c) RGPD — obligation légale : R. 6332-26 C. trav. + arrêté du 21/12/2018
                  modifié
                </b>
              </div>
              <div className="rof-kv">
                <span>Accès nominatif</span>
                <b>jusqu&apos;au 27/03/2030 — puis anonymisation</b>
              </div>
              <div className="rof-kv">
                <span>Vérification publique</span>
                <b>à vie — /verify, sans compte</b>
              </div>
              <div className="rof-band ok">
                ✓ Vérifiée — l&apos;empreinte recalculée correspond à la preuve scellée.
              </div>
            </>
          )}

          {tab === 'export' && (
            <>
              <div className="rof-prow static">
                <div>
                  <b>Exporter PDF</b>
                  <div className="muted">
                    nominatif · porte le QR et le lien de la version en ligne + les numéros de
                    preuve
                  </div>
                </div>
                <button
                  type="button"
                  className="rof-btn solid"
                  onClick={() => showSuccess('Export PDF — démo')}
                >
                  Exporter
                </button>
              </div>
              <div className="rof-prow static">
                <div>
                  <b>Partager avec DGEFP / Qualiopi</b>
                  <div className="muted">
                    lien révocable · borné à l&apos;échéance d&apos;audit — art. R. 6332-26 C. trav.
                  </div>
                </div>
                <button
                  type="button"
                  className="rof-btn"
                  onClick={() => setShareOpen((v) => !v)}
                >
                  Générer le lien
                </button>
              </div>
              <div className="rof-prow static">
                <div>
                  <b>Vérification publique</b>
                  <div className="muted">/verify/{proofNumber}</div>
                </div>
                <button type="button" className="rof-link" onClick={openProof}>
                  Ouvrir ↗
                </button>
              </div>
              <div className="rof-band muted">
                « Ce document est une restitution datée. Version faisant foi : la consultation en
                ligne via le lien ci-dessus. »
              </div>
            </>
          )}
        </div>
      </article>

      {shareOpen && (
        <div className="rof-panel">
          <h2>Partager la Preuve Formation®</h2>
          <p className="muted">
            {formation.title} · <code>{proofNumber}</code>
          </p>
          <h3>Destinataires</h3>
          <div className="rof-prow static">
            <span>☑</span>
            <b>OPCO Atlas</b>
            <span className="rof-pill">financeur</span>
            <span className="rof-pill accent">nominatif</span>
            <span className="muted">partage automatique configuré</span>
          </div>
          <p className="rof-band muted">
            Les destinataires reçoivent un lien valable jusqu&apos;au <b>27/03/2030</b>. Vous êtes
            responsable de ce partage.
          </p>
          <div className="rof-actions">
            <button type="button" className="rof-btn" onClick={() => setShareOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="rof-btn solid"
              onClick={() => {
                setShareOpen(false);
                showSuccess('✓ Enregistré');
              }}
            >
              Partager
            </button>
          </div>
        </div>
      )}

      {certOpen && (
        <div className="rof-cert">
          <div className="rof-cert-flags">
            <span className="ok">Email connu → envoyé à la clôture</span>
            <span className="note">Sans email → à imprimer, remise en main propre</span>
          </div>
          <p className="muted">
            Modèle : France — ministère du Travail (2020, arrêté mod. 2024)
          </p>
          <article className="rof-a4">
            <div className="rof-a4-title">CERTIFICAT DE RÉALISATION</div>
            <div className="muted center">
              Art. R. 6332-26 du Code du travail · arrêté du 21 décembre 2018 modifié
            </div>
            <p>
              Je soussignée <b>Léa Fontaine</b>, <i>gérante</i>
            </p>
            <p className="muted">
              ☑ représentante légale du dispensateur de formation &nbsp;☐ prestataire de formation
              &nbsp;☐ employeur (formation interne)
            </p>
            <p>
              de <b>{MOCK_OF_ORG.name}</b>{' '}
              <span className="accent">{MOCK_OF_ORG.qualiopiLabel}</span>
            </p>
            <p>
              atteste que <b>Mme Nadia Belkacem</b>
            </p>
            <p>
              a suivi l&apos;action de : <b>☑ formation</b>
            </p>
            <p>
              Intitulé : <b>« {formation.title} »</b>
            </p>
            <p>
              du <b>{dateLabel}</b> — durée totale : <b>{hours} heures</b> ·{' '}
              {formation.participationMode
                ? PARTICIPATION_LABEL[formation.participationMode].toLowerCase()
                : 'présentiel'}
            </p>
            <div className="rof-band muted">
              Assiduité : <b>8 séances sur 8</b> — 7 présences vérifiées · 1 attestée par la
              formatrice · Financement :{' '}
              <b>
                {formation.financement ? FINANCEMENT_LABEL[formation.financement] : 'CPF'}
              </b>
            </div>
            <p className="muted small">
              Les justificatifs de réalisation sont conservés pendant 3 ans à compter de la fin de
              l&apos;année du dernier paiement (10 ans en cas de cofinancement européen).
            </p>
            <p className="muted">Fait à [ville du siège], le 27 mars 2027</p>
            <div className="rof-signs">
              <div>✍ Signature électronique du responsable — horodatée</div>
              <div>Cachet du dispensateur</div>
            </div>
            <p className="rof-claim">
              Vos preuves vous attendent — scannez pour les récupérer.
            </p>
          </article>
        </div>
      )}
    </section>
  );
};

export default PreuveFormationPage;
