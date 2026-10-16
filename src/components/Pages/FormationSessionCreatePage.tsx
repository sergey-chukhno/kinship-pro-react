import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCatalogueFiche } from '../../api/FormationCatalogue';
import { useAppContext } from '../../context/AppContext';
import {
  FinancementType,
  FormationFiche,
  ParticipationMode,
} from '../../types/formationCatalogue';
import { FormateurSource } from '../../types/formationSession';
import {
  createFormationSession,
  formatSessionDateFr,
  openSessionSpace,
} from '../../utils/formationSessionStore';
import { useToast } from '../../hooks/useToast';
import './FormationSessionCreatePage.css';

type Step = 'form' | 'confirmed';

const MOCK_STRUCTURE_MEMBERS = [
  { id: 'm1', name: 'Antoine Morel', email: 'a.morel@exemple.fr', initials: 'AM' },
  { id: 'm2', name: 'Camille Dupont', email: 'c.dupont@exemple.fr', initials: 'CD' },
  { id: 'm3', name: 'Samira Benali', email: 's.benali@exemple.fr', initials: 'SB' },
];

const MODALITIES: ParticipationMode[] = ['presentiel', 'distanciel', 'hybride'];
const FINANCEMENTS: FinancementType[] = [
  'CPF',
  'OPCO',
  'Entreprise',
  'Association',
  'Institution',
  'Autre',
];

const MODALITY_LABEL: Record<ParticipationMode, string> = {
  presentiel: 'Présentiel',
  distanciel: 'Distanciel',
  hybride: 'Hybride',
};

function catalogIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/formation-session-new\/([^/]+)\/?$/);
  return m?.[1] ?? null;
}

/** Prefer router pathname; fall back to window (setCurrentPage can mount before navigate). */
function resolveCatalogId(pathname: string): string | null {
  return catalogIdFromPath(pathname) || catalogIdFromPath(window.location.pathname);
}

const FormationSessionCreatePage: React.FC = () => {
  const { pathname } = useLocation();
  const catalogId = resolveCatalogId(pathname);
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();

  const [fiche, setFiche] = useState<FormationFiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [mcGateOff, setMcGateOff] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formateurSource, setFormateurSource] = useState<FormateurSource>('structure');
  const [memberId, setMemberId] = useState(MOCK_STRUCTURE_MEMBERS[0].id);
  const [memberCleared, setMemberCleared] = useState(false);
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [modality, setModality] = useState<ParticipationMode | ''>('');
  const [financement, setFinancement] = useState<FinancementType | ''>('');
  const [practicalInfo, setPracticalInfo] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

  useEffect(() => {
    const id = resolveCatalogId(pathname);
    if (!id) {
      setFiche(null);
      setError('Formation catalogue manquante.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);
    getCatalogueFiche(id)
      .then((f) => {
        if (cancelled) return;
        if (!f) {
          setFiche(null);
          setError('Fiche introuvable.');
          return;
        }
        setError(null);
        setFiche(f);
        setPracticalInfo(f.practicalInfo || '');
        setImageDataUrl(f.imageDataUrl);
        setModality(f.modality || '');
        setFinancement(f.financement || '');
      })
      .catch((e) => {
        if (!cancelled) {
          setFiche(null);
          setError(e?.message || 'Chargement impossible.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const selectedMember = MOCK_STRUCTURE_MEMBERS.find((m) => m.id === memberId);

  const formateurName = useMemo(() => {
    if (formateurSource === 'structure') {
      if (memberCleared) return '';
      return selectedMember?.name || '';
    }
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  }, [formateurSource, memberCleared, selectedMember, firstName, lastName]);

  const datesOk = Boolean(startDate && endDate);
  const formateurOk =
    formateurSource === 'structure'
      ? Boolean(formateurName)
      : Boolean(lastName.trim() && firstName.trim() && email.trim());
  const canSubmit = Boolean(fiche && datesOk && formateurOk);

  const goCatalogue = () => {
    setCurrentPage('catalogue-formations');
    navigate('/catalogue-formations');
  };

  const goFiche = () => {
    if (!fiche) return;
    setCurrentPage('formation-fiche');
    navigate(`/formation-fiche/${fiche.id}`);
  };

  const onPickImage = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const submitCreate = () => {
    if (!fiche || !canSubmit) return;
    // Mock hard refus (démo) : activer via ?refus=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('refus') === '1') {
      setConfirmOpen(false);
      setRefus(
        "La session n'a pas été créée : la compétence « Rédiger une dépêche » ne fait plus partie de la série « Journaliste ». Mettez la fiche à jour."
      );
      return;
    }
    try {
      const session = createFormationSession({
        catalogEntryId: fiche.id,
        title: fiche.title,
        description: fiche.description,
        durationHours: fiche.durationHours,
        modality: modality || fiche.modality,
        financement: financement || fiche.financement,
        euMc: fiche.euMc && params.get('mcgate') !== '1',
        orgName: fiche.orgName,
        startDate,
        endDate,
        formateur: {
          source: formateurSource,
          name: formateurName,
          email:
            formateurSource === 'email'
              ? email.trim()
              : selectedMember?.email,
          memberId: formateurSource === 'structure' ? memberId : undefined,
        },
        practicalInfo,
        imageDataUrl,
      });
      setCreatedId(session.id);
      setMcGateOff(Boolean(fiche.euMc && params.get('mcgate') === '1'));
      setConfirmOpen(false);
      setStep('confirmed');
      showSuccess('Session créée');
    } catch (e: any) {
      showError(e?.message || 'Création impossible.');
    }
  };

  const goSpace = () => {
    if (!createdId) return;
    openSessionSpace(createdId);
    navigate(`/formation-session-space/${createdId}`);
    setCurrentPage('formation-session-space');
  };

  if (loading) {
    return (
      <div className="fsc">
        <p className="fsc-ssub">Chargement…</p>
      </div>
    );
  }

  if (error || !fiche) {
    return (
      <div className="fsc">
        <div className="fsc-err">{error || 'Erreur'}</div>
        <button type="button" className="fsc-btn g" onClick={goCatalogue}>
          Retour au catalogue
        </button>
      </div>
    );
  }

  if (step === 'confirmed') {
    return (
      <div className="fsc">
        <div className="fsc-crumb">
          <button type="button" onClick={goCatalogue}>
            Catalogue
          </button>
          <span>›</span>
          <span>Session créée</span>
        </div>
        <div className="fsc-confirm-card">
          <div className="fsc-steps">
            <span className="done">1 · Catalogue</span>
            <span className="done">2 · Session</span>
            <span className="on">3 · Participants</span>
          </div>
          <h1>Session créée</h1>
          <p>
            <strong>{fiche.title}</strong>
            <br />
            Du {formatSessionDateFr(startDate)} au {formatSessionDateFr(endDate)}
            <br />
            Formateur responsable : {formateurName}
          </p>
          {mcGateOff && (
            <div className="fsc-gold off">
              ✦ Microcertification européenne — votre organisme n&apos;y est pas éligible
              aujourd&apos;hui.
            </div>
          )}
          <p className="fsc-ssub">
            Stub UI : l&apos;import participants (écran 3) sera branché après arbitrage Patrick.
            En attendant, continuez vers l&apos;espace session.
          </p>
          <button type="button" className="fsc-btn am" onClick={goSpace}>
            Continuer vers l&apos;espace →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fsc">
      <div className="fsc-crumb">
        <button type="button" onClick={goCatalogue}>
          Catalogue de formations
        </button>
        <span>›</span>
        <span>Nouvelle session</span>
      </div>

      <div className="fsc-inner">
        <div className="fsc-steps" aria-label="Étapes">
          <span className="done">1 · Catalogue</span>
          <span className="on">2 · Session</span>
          <span>3 · Participants</span>
        </div>

        <h1 className="fsc-stitle">Nouvelle session</h1>
        <p className="fsc-ssub">
          Choisissez les dates et le formateur responsable ; le reste vient de la fiche.
        </p>

        {refus && (
          <div className="fsc-refus" role="alert">
            <strong>La session n&apos;a pas été créée :</strong> {refus.replace(/^La session n'a pas été créée :\s*/, '')}
            <div className="fsc-btnrow" style={{ marginTop: 10 }}>
              <button type="button" className="fsc-btn g" onClick={() => setRefus(null)}>
                Fermer
              </button>
              <button type="button" className="fsc-btn s" onClick={goFiche}>
                Ouvrir la fiche →
              </button>
            </div>
          </div>
        )}

        <table className="fsc-btab">
          <thead>
            <tr>
              <th>Formation</th>
              <th>
                Début <span className="fsc-ob">✱</span>
              </th>
              <th>
                Fin <span className="fsc-ob">✱</span>
              </th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div className="ftitle">{fiche.title || 'Sans titre'}</div>
                {fiche.certificationCode ? (
                  <div className="fcode">{fiche.certificationCode}</div>
                ) : null}
              </td>
              <td>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Date de début"
                />
              </td>
              <td>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="Date de fin"
                />
              </td>
              <td className="dur">{fiche.durationHours ? `${fiche.durationHours} h` : '—'}</td>
            </tr>
          </tbody>
        </table>
        <p className="fsc-hint">
          Description, programme, évaluation, certification : ceux de la fiche —{' '}
          <button type="button" onClick={goFiche}>
            ouvrir la fiche →
          </button>
        </p>

        <div className="fsc-field">
          <span className="fsc-label">
            Formateur responsable <span className="fsc-ob">✱</span>
          </span>
          <div className="fsc-fseg">
            <button
              type="button"
              className={formateurSource === 'structure' ? 'on' : ''}
              onClick={() => {
                setFormateurSource('structure');
                setMemberCleared(false);
              }}
            >
              Dans ma structure
            </button>
            <button
              type="button"
              className={formateurSource === 'email' ? 'on' : ''}
              onClick={() => setFormateurSource('email')}
            >
              Par e-mail
            </button>
          </div>
          {formateurSource === 'structure' ? (
            <>
              {!memberCleared && selectedMember ? (
                <div className="fsc-fchip">
                  <span className="dot">{selectedMember.initials}</span>
                  <span>
                    <div className="nm">{selectedMember.name}</div>
                    <div className="em">{selectedMember.email}</div>
                  </span>
                  <button type="button" className="x" onClick={() => setMemberCleared(true)} aria-label="Retirer">
                    ✕
                  </button>
                </div>
              ) : (
                <select
                  className="fsc-select"
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value);
                    setMemberCleared(false);
                  }}
                >
                  {MOCK_STRUCTURE_MEMBERS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="fsc-ssub" style={{ marginTop: 6 }}>
                La session s&apos;ajoute à son espace ; il est prévenu.
              </p>
            </>
          ) : (
            <>
              <div className="fsc-grid3">
                <label>
                  Nom
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
                </label>
                <label>
                  Prénom
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                  />
                </label>
                <label>
                  Adresse e-mail
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prenom.nom@…"
                  />
                </label>
              </div>
              <p className="fsc-ssub" style={{ marginTop: 6 }}>
                Il reçoit une invitation par e-mail et rejoint votre structure comme formateur.
              </p>
            </>
          )}
        </div>

        <div className="fsc-field">
          <span className="fsc-label">
            Modalité <span className="fsc-ob">✱</span>
            <span className="fsc-badge">Proposée par la fiche</span>
          </span>
          <div className="fsc-ropts">
            {MODALITIES.map((m) => (
              <button
                key={m}
                type="button"
                className={`fsc-ropt ${modality === m ? 'sel' : ''}`}
                onClick={() => setModality(m)}
              >
                {MODALITY_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="fsc-field">
          <span className="fsc-label">
            Financement <span className="fsc-ob">✱</span>
            <span className="fsc-badge">Proposé par la fiche</span>
          </span>
          <div className="fsc-ropts">
            {FINANCEMENTS.map((f) => (
              <button
                key={f}
                type="button"
                className={`fsc-ropt ${financement === f ? 'sel' : ''}`}
                onClick={() => setFinancement(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="fsc-field">
          <span className="fsc-label">Informations pratiques</span>
          <textarea
            className="fsc-ta"
            value={practicalInfo}
            onChange={(e) => setPracticalInfo(e.target.value)}
            placeholder="Campus, salle, horaires, matériel…"
          />
        </div>

        <div className="fsc-field">
          <span className="fsc-label">Image</span>
          <div className="fsc-imgrow">
            {imageDataUrl ? <img src={imageDataUrl} alt="" /> : <div style={{ width: 72, height: 48, background: '#ebe8e0', borderRadius: 8 }} />}
            <label className="fsc-link">
              Changer l&apos;image →
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onPickImage(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>

        {fiche.euMc && (
          <div className="fsc-gold">✦ Microcertification européenne</div>
        )}

        <div className="fsc-foot">
          <button type="button" className="fsc-btn g" onClick={goCatalogue}>
            Annuler
          </button>
          <div className="fsc-fcol">
            <button
              type="button"
              className="fsc-btn am"
              disabled={!canSubmit}
              onClick={() => setConfirmOpen(true)}
            >
              Créer la session
            </button>
            {!datesOk && (
              <span className="fsc-mc9">Disponible une fois les dates renseignées.</span>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div className="fsc-modal-backdrop" role="presentation" onClick={() => setConfirmOpen(false)}>
          <div
            className="fsc-modal"
            role="dialog"
            aria-labelledby="fsc-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fsc-confirm-title">Confirmer la création de la session</h2>
            <p>
              <strong>{fiche.title}</strong>, du {formatSessionDateFr(startDate)} au{' '}
              {formatSessionDateFr(endDate)}.
            </p>
            <div className="fsc-fige">
              Après confirmation, le contenu de la session ne change plus : titre, programme, durée,
              évaluation, certification, modalité, financement. Les dates restent modifiables.
            </div>
            <p>
              Les inscriptions s&apos;ouvrent. {formateurName}, formateur responsable, est prévenu.
            </p>
            <div className="fsc-btnrow">
              <button type="button" className="fsc-btn g" onClick={() => setConfirmOpen(false)}>
                Annuler
              </button>
              <button type="button" className="fsc-btn am" onClick={submitCreate}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationSessionCreatePage;
