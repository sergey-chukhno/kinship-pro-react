import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getSelectedOrganizationId } from '../../utils/contextUtils';
import {
  getMyOfActivation,
  saveMyOfDraft,
  submitMyOfDossier,
  subscribeOfActivation,
} from '../../utils/ofActivationStore';
import { useToast } from '../../hooks/useToast';
import './OfActivationPage.css';

function currentOrgName(user: ReturnType<typeof useAppContext>['state']['user'], pageType: string): string {
  const id = getSelectedOrganizationId(user, pageType as 'pro' | 'edu' | 'teacher' | 'user' | 'of');
  if (pageType === 'pro') {
    return user.available_contexts?.companies?.find((c) => c.id === id)?.name
      || user.available_contexts?.companies?.[0]?.name
      || 'Form’Avenir Provence';
  }
  if (pageType === 'edu') {
    return user.available_contexts?.schools?.find((s) => s.id === id)?.name
      || user.available_contexts?.schools?.[0]?.name
      || 'Form’Avenir Provence';
  }
  return user.organization || 'Form’Avenir Provence';
}

const OfActivationPage: React.FC = () => {
  const { state, setCurrentPage, setShowingPageType } = useAppContext();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [dossier, setDossier] = useState(() => getMyOfActivation());

  const orgName = useMemo(
    () => dossier.orgName || currentOrgName(state.user, state.showingPageType),
    [dossier.orgName, state.user, state.showingPageType]
  );

  useEffect(() => subscribeOfActivation(() => setDossier(getMyOfActivation())), []);

  useEffect(() => {
    if (!dossier.orgName && orgName) {
      const next = saveMyOfDraft({ orgName });
      setDossier(next);
    }
  }, [dossier.orgName, orgName]);

  const isRejected = dossier.status === 'rejected';
  const isWaiting = dossier.status === 'submitted' || dossier.status === 'verifying';
  const isActivated = dossier.status === 'activated';
  const flaggedNda = isRejected && dossier.rejectField === 'nda';

  const submit = () => {
    if (!dossier.nda.trim()) return;
    const next = submitMyOfDossier({
      orgName,
      nda: dossier.nda.trim(),
      qualiopiUntil: dossier.qualiopiUntil,
      qualiopiDocName: dossier.qualiopiDocName,
      extraDocs: dossier.extraDocs,
      cguAccepted: true,
    });
    setDossier(next);
    showSuccess('Dossier soumis — un conseiller Kinship va vous appeler.');
  };

  const goCreate = () => {
    localStorage.setItem('selectedPageType', 'of');
    localStorage.setItem('selectedContextType', 'formation');
    localStorage.setItem('selectedContextId', 'of-demo');
    setShowingPageType('of');
    setCurrentPage('create');
    navigate('/create?type=formation');
  };

  const goHubReadOnly = () => {
    setCurrentPage('formations');
    navigate('/formations');
  };

  return (
    <section className="ofa-page" aria-label="Vérifier mon organisme">
      <button
        type="button"
        className="ofa-back"
        onClick={() => {
          setCurrentPage('dashboard');
          navigate('/dashboard');
        }}
      >
        ← Tableau de bord
      </button>

      {isActivated ? (
        <div className="ofa-issue ok">
          <h1>✓ Votre espace formation est activé</h1>
          <p>
            {orgName} peut créer ses formations — la carte FORMATION est ouverte. Votre espace passe au
            vert — la couleur des organismes de formation vérifiés. Vos preuves diront votre niveau de
            confiance, vérifié à la source.
          </p>
          <button type="button" className="ofa-btn amber" onClick={goCreate}>
            Créer ma première formation →
          </button>
        </div>
      ) : isWaiting ? (
        <>
          <div className="ofa-wait">
            <span className="ofa-dot" />
            <span>Votre dossier est en cours de validation — délai : 48 h ouvrées</span>
          </div>
          <div className="ofa-vrow">
            <span className={dossier.checks.siret ? 'ok' : 'off'}>{dossier.checks.siret ? '✓' : '○'}</span>
            SIRET vérifié <em>· INSEE</em>
          </div>
          <div className="ofa-vrow">
            <span className={dossier.checks.nda ? 'ok' : 'off'}>{dossier.checks.nda ? '✓' : '○'}</span>
            NDA vérifié <em>· CARIF-OREF</em>
          </div>
          <div className="ofa-vrow">
            <span className={dossier.checks.qualiopi ? 'ok' : 'off'}>
              {dossier.checks.qualiopi ? '✓' : '○'}
            </span>
            Qualiopi{dossier.qualiopiUntil ? ` valide jusqu’au ${dossier.qualiopiUntil}` : ''}
          </div>
          <div className="ofa-call">
            📞 <b>Un conseiller Kinship va vous appeler</b> pour finaliser l’activation — c’est aussi
            l’occasion de répondre à vos questions.
          </div>
          {dossier.status === 'verifying' && (
            <div className="ofa-note">
              Pendant la vérification : votre espace formation est ouvert <b>en lecture</b> — vous
              découvrez l’interface, la création de formation s’ouvrira à l’activation.
              <button type="button" className="ofa-link" onClick={goHubReadOnly}>
                Découvrir l’espace →
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {isRejected && (
            <div className="ofa-issue ko">
              <b>Votre dossier n’a pas pu être validé.</b> Le motif :{' '}
              <b>{dossier.rejectMotif || 'le NDA transmis ne correspond pas à votre SIRET'}</b>.
              Corrigez le champ signalé, puis soumettez à nouveau.
            </div>
          )}

          <h1>Vérifier mon organisme</h1>
          <p className="ofa-lead">
            {isRejected
              ? 'Votre dossier est conservé — rien ne se ressaisit.'
              : 'Kinship vérifie votre organisme auprès des sources officielles — c’est ce qui donne leur valeur à vos formations et à leurs preuves.'}
          </p>

          <label className="ofa-fld">
            <span>Organisme</span>
            <div className="ofa-inp ok">
              {orgName} · SIRET {dossier.siret} <em>✓ vérifié</em>
            </div>
            <small>Repris de votre organisation — vérifié auprès de l’INSEE.</small>
          </label>

          <label className={`ofa-fld ${flaggedNda ? 'flagged' : ''}`}>
            <span>
              Numéro de déclaration d’activité (NDA) <i>✱</i>
            </span>
            <input
              className="ofa-inp"
              value={dossier.nda}
              onChange={(e) => setDossier(saveMyOfDraft({ nda: e.target.value }))}
              placeholder="93 13 08421 13"
            />
            <small className={flaggedNda ? 'flag' : ''}>
              {flaggedNda
                ? 'Le motif du refus porte sur ce champ — vérifiez votre récépissé de déclaration d’activité.'
                : 'Le numéro délivré par la DREETS — il sera vérifié auprès des sources officielles.'}
            </small>
          </label>

          <label className="ofa-fld">
            <span>Certification Qualiopi — si vous l’avez</span>
            <input
              className="ofa-inp"
              value={dossier.qualiopiUntil}
              onChange={(e) => setDossier(saveMyOfDraft({ qualiopiUntil: e.target.value }))}
              placeholder="Valide jusqu’au 14/03/2028"
            />
            <div className="ofa-docs">
              {dossier.qualiopiDocName ? (
                <span className="ofa-chip ok">📎 {dossier.qualiopiDocName} ✓</span>
              ) : null}
              <label className="ofa-chip add">
                📎 déposer un document
                <input
                  type="file"
                  hidden
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setDossier(saveMyOfDraft({ qualiopiDocName: file.name }));
                  }}
                />
              </label>
            </div>
            <small>
              Le certificat se dépose ici (PDF). Pas de Qualiopi ? Déposez vos habilitations officielles
              (RNCP, RS…) ou vos documents justificatifs — un conseiller Kinship vérifiera avec vous.
            </small>
          </label>

          <label className="ofa-cgu">
            <input
              type="checkbox"
              checked={dossier.cguAccepted}
              onChange={(e) => setDossier(saveMyOfDraft({ cguAccepted: e.target.checked }))}
            />
            J’accepte les CGU Kinship <em>(v2.5)</em>
          </label>

          <button
            type="button"
            className="ofa-btn amber"
            disabled={!dossier.nda.trim() || !dossier.cguAccepted}
            onClick={submit}
          >
            {isRejected ? 'Soumettre à nouveau' : 'Soumettre mon dossier'}
          </button>
        </>
      )}
    </section>
  );
};

export default OfActivationPage;
