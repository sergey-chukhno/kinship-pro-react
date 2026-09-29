import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import {
  OfActivationDossier,
  OfRejectField,
  callOfDossier,
  delayLabel,
  formatSubmittedAt,
  getOfActivationQueue,
  markOfChecks,
  refuseOfDossier,
  subscribeOfActivation,
  validateOfDossier,
} from '../../utils/ofActivationStore';
import { useToast } from '../../hooks/useToast';
import './SuperAdminOfQueuePage.css';

function downloadDoc(name: string) {
  const blob = new Blob([`Pièce déposée — ${name}\n(démo Kinship — vérification aux sources)`], {
    type: 'application/pdf',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const SuperAdminOfQueuePage: React.FC = () => {
  const { setCurrentPage } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [queue, setQueue] = useState(() => getOfActivationQueue());
  const [openId, setOpenId] = useState<string | null>(null);
  const [refuseId, setRefuseId] = useState<string | null>(null);
  const [motif, setMotif] = useState('le NDA transmis ne correspond pas à votre SIRET');
  const [field, setField] = useState<OfRejectField>('nda');

  useEffect(
    () =>
      subscribeOfActivation(() => {
        setQueue(getOfActivationQueue());
      }),
    []
  );

  const open = queue.find((d) => d.id === openId) ?? queue[0];

  const toggleCheck = (d: OfActivationDossier, key: keyof OfActivationDossier['checks']) => {
    markOfChecks(d.id, { ...d.checks, [key]: !d.checks[key] });
  };

  return (
    <section className="saq-page" aria-label="Dossiers d’activation à traiter">
      <button
        type="button"
        className="saq-back"
        onClick={() => {
          setCurrentPage('settings');
          navigate('/settings');
        }}
      >
        ← Paramètres
      </button>
      <h1>Dossiers d’activation à traiter</h1>
      <p className="saq-lead">
        Classés par ancienneté — délai cible : 48 h ouvrées (alerte au dépassement). La fiche s’ouvre
        pré-remplie depuis les sources officielles : rien ne se ressaisit.
      </p>

      <div className="saq-table-wrap">
        <table className="saq-tbl">
          <thead>
            <tr>
              <th>Organisme</th>
              <th>NDA</th>
              <th>Qualiopi</th>
              <th>OPCO réf.</th>
              <th>Soumis le</th>
              <th>Délai</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queue
              .filter((d) => d.status === 'submitted' || d.status === 'verifying')
              .map((d) => {
                const delay = delayLabel(d.submittedAt);
                return (
                  <tr key={d.id} className={openId === d.id ? 'on' : ''} onClick={() => setOpenId(d.id)}>
                    <td>
                      <b>{d.orgName || 'Organisme'}</b>
                    </td>
                    <td>{d.nda || '—'}</td>
                    <td>
                      {d.qualiopiUntil ? (
                        <>
                          ✓ jusqu’au {d.qualiopiUntil}
                          {d.qualiopiUntil.includes('2026') && <span className="saq-warn"> ⚠ &lt; 90 j</span>}
                        </>
                      ) : (
                        <span className="muted">— (documents joints)</span>
                      )}
                    </td>
                    <td>{d.opcoRef || '—'}</td>
                    <td>{formatSubmittedAt(d.submittedAt)}</td>
                    <td className={delay.overdue ? 'overdue' : ''}>
                      {delay.text}
                      {delay.overdue ? ' ⚠' : ''}
                    </td>
                    <td>
                      <div className="saq-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="saq-abtn call"
                          onClick={() => {
                            callOfDossier(d.id);
                            showSuccess(`Appel horodaté — ${d.orgName}`);
                          }}
                        >
                          Appeler
                        </button>
                        <button
                          type="button"
                          className="saq-abtn ok"
                          onClick={() => {
                            validateOfDossier(d.id);
                            showSuccess(`${d.orgName} activé — plan SOCLE posé.`);
                          }}
                        >
                          Valider
                        </button>
                        <button
                          type="button"
                          className="saq-abtn no"
                          onClick={() => {
                            setRefuseId(d.id);
                            setOpenId(d.id);
                          }}
                        >
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {open && (open.status === 'submitted' || open.status === 'verifying') && (
        <div className="saq-fiche">
          <header>
            La fiche du dossier — {open.orgName}{' '}
            <span>· pré-remplie CARIF-OREF, rien ne se ressaisit</span>
          </header>
          <div className="saq-fiche-body">
            <div className="saq-k">Les pièces déposées par l’organisme</div>
            <div className="saq-docs">
              {open.qualiopiDocName && (
                <button type="button" className="saq-chip" onClick={() => downloadDoc(open.qualiopiDocName!)}>
                  📎 {open.qualiopiDocName} · ⬇ télécharger
                </button>
              )}
              {(open.extraDocs.length ? open.extraDocs : [{ name: 'recepisse-nda.pdf' }]).map((doc) => (
                <button key={doc.name} type="button" className="saq-chip" onClick={() => downloadDoc(doc.name)}>
                  📎 {doc.name} · ⬇ télécharger
                </button>
              ))}
            </div>

            <div className="saq-k">
              1er temps — la vérification aux registres{' '}
              <span>· la grille 9.2 est la procédure</span>
            </div>
            {(
              [
                ['siret', 'SIRET actif', 'INSEE / annuaire-entreprises'],
                ['nda', 'NDA', 'liste publique des OF — DGEFP'],
                ['qualiopi', `Qualiopi${open.qualiopiUntil ? ` jusqu’au ${open.qualiopiUntil}` : ''}`, 'France Compétences / annuaire officiel'],
              ] as const
            ).map(([key, label, source]) => (
              <button
                key={key}
                type="button"
                className="saq-vrow"
                onClick={() => toggleCheck(open, key)}
              >
                <span className={open.checks[key] ? 'ok' : 'off'}>{open.checks[key] ? '✓' : '○'}</span>
                {label} <em>· {source}</em>
              </button>
            ))}

            <div className="saq-k">2e temps — la décision humaine</div>
            <p>
              📞 l’appel (horodaté au clic)
              {open.calledAt ? ` — ${formatSubmittedAt(open.calledAt)}` : ''} · <b>Valider</b> →
              l’organisme est activé, son agrément s’enregistre avec son échéance ET le plan SOCLE se
              pose dans le même geste · <b>Refuser</b> → le motif obligatoire, communiqué à l’organisme
              avec la démarche de correction.
            </p>

            {refuseId === open.id && (
              <div className="saq-refuse">
                <label>
                  Motif du refus <i>✱</i>
                  <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={3} />
                </label>
                <label>
                  Champ signalé
                  <select value={field} onChange={(e) => setField(e.target.value as OfRejectField)}>
                    <option value="nda">NDA</option>
                    <option value="siret">SIRET</option>
                    <option value="qualiopi">Qualiopi</option>
                  </select>
                </label>
                <div className="saq-refuse-actions">
                  <button type="button" className="saq-abtn no" onClick={() => setRefuseId(null)}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="saq-abtn ok"
                    onClick={() => {
                      if (!motif.trim()) {
                        showError('Le refus exige un motif.');
                        return;
                      }
                      refuseOfDossier(open.id, motif.trim(), field);
                      setRefuseId(null);
                      showSuccess('Refus communiqué — le motif et la correction partent.');
                    }}
                  >
                    Confirmer le refus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default SuperAdminOfQueuePage;
