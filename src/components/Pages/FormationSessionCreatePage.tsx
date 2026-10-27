import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getCatalogueFiche } from '../../api/FormationCatalogue';
import { openCatalogSession } from '../../api/FormationSessions';
import { getOrganizationMembers, OrganizationMember } from '../../api/Projects';
import { resolveCatalogueOrg } from '../../api/formationCatalogOrg';
import { useAppContext } from '../../context/AppContext';
import {
  FinancementType,
  FormationFiche,
  ParticipationMode,
} from '../../types/formationCatalogue';
import { FormateurSource } from '../../types/formationSession';
import { formatSessionDateFr, openSessionSpace, cacheFormationSession } from '../../utils/formationSessionStore';
import { useToast } from '../../hooks/useToast';
import './FormationSessionCreatePage.css';

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

function resolveCatalogId(pathname: string): string | null {
  return catalogIdFromPath(pathname) || catalogIdFromPath(window.location.pathname);
}

function memberInitials(m: OrganizationMember): string {
  const from = (m.full_name || `${m.first_name} ${m.last_name}`).trim();
  return from
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';
}

const FormationSessionCreatePage: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { state, setCurrentPage } = useAppContext();
  const { showSuccess, showError } = useToast();
  const org = useMemo(
    () => resolveCatalogueOrg(state.user, state.showingPageType),
    [state.user, state.showingPageType]
  );

  const [fiche, setFiche] = useState<FormationFiche | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formateurSource, setFormateurSource] = useState<FormateurSource>('structure');
  const [memberId, setMemberId] = useState<string>('');
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
    Promise.all([
      getCatalogueFiche(id, org),
      org
        ? getOrganizationMembers(org.id, org.type.toLowerCase() as 'school' | 'company').catch(
            () => [] as OrganizationMember[]
          )
        : Promise.resolve([] as OrganizationMember[]),
    ])
      .then(([f, mems]) => {
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
        setMembers(mems);
        if (mems.length && !memberId) setMemberId(String(mems[0].id));
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
  }, [pathname, org?.key]);

  const selectedMember = members.find((m) => String(m.id) === memberId);

  const formateurName = useMemo(() => {
    if (formateurSource === 'structure') {
      if (memberCleared) return '';
      return selectedMember?.full_name || `${selectedMember?.first_name || ''} ${selectedMember?.last_name || ''}`.trim();
    }
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
  }, [formateurSource, memberCleared, selectedMember, firstName, lastName]);

  const datesOk = Boolean(startDate && endDate);
  const formateurOk =
    formateurSource === 'structure'
      ? Boolean(formateurName && memberId)
      : Boolean(lastName.trim() && firstName.trim() && email.trim());
  const canSubmit = Boolean(fiche && datesOk && formateurOk && !submitting);

  const orgDisplayName = fiche?.orgName || org?.name || '';

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

  const submitCreate = async () => {
    if (!fiche || !canSubmit) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('refus') === '1') {
      setConfirmOpen(false);
      setRefus(
        "La session n'a pas été créée : la compétence « Rédiger une dépêche » ne fait plus partie de la série « Journaliste ». Mettez la fiche à jour."
      );
      return;
    }
    setSubmitting(true);
    try {
      const session = await openCatalogSession(fiche.id, {
        catalogEntryId: fiche.id,
        title: fiche.title,
        description: fiche.description,
        durationHours: fiche.durationHours,
        modality: modality || fiche.modality,
        financement: financement || fiche.financement,
        euMc: fiche.euMc,
        orgName: orgDisplayName,
        organizationId: org?.id,
        organizationType: org?.type,
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
          userId:
            formateurSource === 'structure' && memberId
              ? Number(memberId)
              : undefined,
        },
        practicalInfo,
        imageDataUrl,
      });
      cacheFormationSession(session);
      setConfirmOpen(false);
      showSuccess('Session créée');
      openSessionSpace(session.id, 'gestion');
      navigate(`/formation-session-space/${session.id}`);
      setCurrentPage('formation-session-space');
    } catch (e: any) {
      showError(e?.message || 'Création impossible.');
    } finally {
      setSubmitting(false);
    }
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
          {orgDisplayName ? (
            <>
              <strong>{orgDisplayName}</strong>
              {' — '}
            </>
          ) : null}
          Choisissez les dates et le formateur responsable ; le reste vient de la fiche.
        </p>

        {refus && (
          <div className="fsc-refus" role="alert">
            <strong>La session n&apos;a pas été créée :</strong>{' '}
            {refus.replace(/^La session n'a pas été créée :\s*/, '')}
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
              <td className="dur">{fiche.durationHours ? `${fiche.durationHours} h` : ''}</td>
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
                  <span className="dot">{memberInitials(selectedMember)}</span>
                  <span>
                    <div className="nm">
                      {selectedMember.full_name ||
                        `${selectedMember.first_name} ${selectedMember.last_name}`}
                    </div>
                    <div className="em">{selectedMember.email}</div>
                  </span>
                  <button
                    type="button"
                    className="x"
                    onClick={() => setMemberCleared(true)}
                    aria-label="Retirer"
                  >
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
                  {members.length === 0 && <option value="">Aucun membre</option>}
                  {members.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.full_name || `${m.first_name} ${m.last_name}`}
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
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="" />
            ) : (
              <div style={{ width: 72, height: 48, background: '#ebe8e0', borderRadius: 8 }} />
            )}
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

        {fiche.euMc && <div className="fsc-gold">✦ Microcertification européenne</div>}

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
              <button
                type="button"
                className="fsc-btn am"
                disabled={submitting}
                onClick={() => void submitCreate()}
              >
                {submitting ? 'Création…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormationSessionCreatePage;
