import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCatalogueFiche } from '../../api/FormationCatalogue';
import { useAppContext } from '../../context/AppContext';
import { FormationFiche } from '../../types/formationCatalogue';
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
  { id: 'm1', name: 'Camille Dupont' },
  { id: 'm2', name: 'Alex Martin' },
  { id: 'm3', name: 'Samira Benali' },
];

function catalogIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/formation-session-new\/([^/]+)\/?$/);
  return m?.[1] ?? null;
}

const FormationSessionCreatePage: React.FC = () => {
  const { pathname } = useLocation();
  const catalogId = catalogIdFromPath(pathname);
  const navigate = useNavigate();
  const { setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();

  const [fiche, setFiche] = useState<FormationFiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formateurSource, setFormateurSource] = useState<FormateurSource>('structure');
  const [memberId, setMemberId] = useState(MOCK_STRUCTURE_MEMBERS[0].id);
  const [emailName, setEmailName] = useState('');
  const [email, setEmail] = useState('');
  const [practicalInfo, setPracticalInfo] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!catalogId) {
      setError('Formation catalogue manquante.');
      setLoading(false);
      return;
    }
    setLoading(true);
    getCatalogueFiche(catalogId)
      .then((f) => {
        if (!f) {
          setError('Fiche introuvable.');
          return;
        }
        setFiche(f);
        setPracticalInfo(f.practicalInfo || '');
        setImageDataUrl(f.imageDataUrl);
      })
      .catch((e) => setError(e?.message || 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, [catalogId]);

  const formateurName = useMemo(() => {
    if (formateurSource === 'structure') {
      return MOCK_STRUCTURE_MEMBERS.find((m) => m.id === memberId)?.name || '';
    }
    return emailName.trim();
  }, [formateurSource, memberId, emailName]);

  const canSubmit =
    Boolean(fiche && startDate && endDate && formateurName) &&
    (formateurSource === 'structure' || Boolean(email.trim()));

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
    try {
      const session = createFormationSession({
        catalogEntryId: fiche.id,
        title: fiche.title,
        description: fiche.description,
        durationHours: fiche.durationHours,
        modality: fiche.modality,
        financement: fiche.financement,
        euMc: fiche.euMc,
        orgName: fiche.orgName,
        startDate,
        endDate,
        formateur: {
          source: formateurSource,
          name: formateurName,
          email: formateurSource === 'email' ? email.trim() : undefined,
          memberId: formateurSource === 'structure' ? memberId : undefined,
        },
        practicalInfo,
        imageDataUrl,
      });
      setCreatedId(session.id);
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
    setCurrentPage('formation-session-space');
    navigate(`/formation-session-space/${createdId}`);
  };

  if (loading) {
    return (
      <div className="fsc">
        <p className="fsc-muted">Chargement…</p>
      </div>
    );
  }

  if (error || !fiche) {
    return (
      <div className="fsc">
        <div className="fsc-err">{error || 'Erreur'}</div>
        <button type="button" className="fsc-btn s" onClick={goCatalogue}>
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
          <h1>Session créée</h1>
          <p>
            <strong>{fiche.title}</strong>
            <br />
            Du {formatSessionDateFr(startDate)} au {formatSessionDateFr(endDate)}
            <br />
            Formateur·rice : {formateurName}
          </p>
          <p className="fsc-muted">
            Les dates restent modifiables dans l’espace session. Le contenu de la fiche catalogue est
            figé pour cette session.
          </p>
          <button type="button" className="fsc-btn p" onClick={goSpace}>
            Continuer vers l’espace →
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

      <div className="fsc-steps" aria-label="Étapes">
        <span className="done">1 Catalogue</span>
        <span className="current">2 Session</span>
        <span className="todo">3 Participants</span>
      </div>

      <h1>Nouvelle session</h1>
      <p className="fsc-lead">
        Dates, formateur·rice et infos pratiques. Programme et évaluation viennent de la fiche
        catalogue.
      </p>

      <div className="fsc-fiche">
        <div>
          <div className="fsc-fiche-org">{fiche.orgName}</div>
          <div className="fsc-fiche-title">{fiche.title || 'Sans titre'}</div>
          <div className="fsc-fiche-meta">
            {[fiche.durationHours ? `${fiche.durationHours} h` : null, fiche.modality, fiche.financement]
              .filter(Boolean)
              .join(' · ')}
            {fiche.euMc ? ' · MC UE' : ''}
          </div>
        </div>
        <button type="button" className="fsc-link" onClick={goFiche}>
          Voir la fiche →
        </button>
      </div>

      <div className="fsc-grid">
        <label>
          Date de début *
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          Date de fin *
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <fieldset className="fsc-fieldset">
        <legend>Formateur·rice *</legend>
        <div className="fsc-tabs">
          <button
            type="button"
            className={formateurSource === 'structure' ? 'on' : ''}
            onClick={() => setFormateurSource('structure')}
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
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            {MOCK_STRUCTURE_MEMBERS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="fsc-grid">
            <label>
              Nom
              <input value={emailName} onChange={(e) => setEmailName(e.target.value)} placeholder="Prénom Nom" />
            </label>
            <label>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="formateur@exemple.fr"
              />
            </label>
          </div>
        )}
      </fieldset>

      <div className="fsc-readonly">
        <div>
          <span className="lbl">Modalité</span>
          <span>{fiche.modality || '—'} (fiche catalogue)</span>
        </div>
        <div>
          <span className="lbl">Financement</span>
          <span>{fiche.financement || '—'} (fiche catalogue)</span>
        </div>
        <div>
          <span className="lbl">MC UE</span>
          {fiche.euMc ? (
            <span className="pill or">Micro-certificat UE</span>
          ) : (
            <span className="pill muted">Non déclaré sur la fiche</span>
          )}
        </div>
      </div>

      <label className="fsc-block">
        Infos pratiques
        <textarea
          rows={3}
          value={practicalInfo}
          onChange={(e) => setPracticalInfo(e.target.value)}
          placeholder="Lieu, accès, matériel…"
        />
      </label>

      <label className="fsc-block">
        Image (optionnel)
        <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0] || null)} />
      </label>
      {imageDataUrl ? (
        <div className="fsc-preview">
          <img src={imageDataUrl} alt="" />
        </div>
      ) : null}

      <div className="fsc-actions">
        <button type="button" className="fsc-btn s" onClick={goCatalogue}>
          Annuler
        </button>
        <button
          type="button"
          className="fsc-btn p"
          disabled={!canSubmit}
          onClick={() => setConfirmOpen(true)}
        >
          Créer la session
        </button>
      </div>

      {confirmOpen && (
        <div className="fsc-modal-backdrop" role="presentation" onClick={() => setConfirmOpen(false)}>
          <div
            className="fsc-modal"
            role="dialog"
            aria-labelledby="fsc-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="fsc-confirm-title">Confirmer la session</h2>
            <p>
              Vous allez ouvrir une session pour <strong>{fiche.title}</strong> du{' '}
              {formatSessionDateFr(startDate)} au {formatSessionDateFr(endDate)}, animée par{' '}
              <strong>{formateurName}</strong>.
            </p>
            <p className="fsc-muted">
              Le contenu de la fiche (programme, évaluation) est figé. Les dates restent modifiables
              ensuite.
            </p>
            <div className="fsc-actions">
              <button type="button" className="fsc-btn s" onClick={() => setConfirmOpen(false)}>
                Retour
              </button>
              <button type="button" className="fsc-btn p" onClick={submitCreate}>
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
