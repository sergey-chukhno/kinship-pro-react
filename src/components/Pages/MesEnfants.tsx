import React, { useCallback, useEffect, useState } from 'react';
import {
  createParentLink,
  deleteParentLink,
  listParentLinkProofs,
  listParentLinks,
  ParentLink,
  ParentLinkProof,
} from '../../api/ParentLinks';
import { useToast } from '../../hooks/useToast';
import './MesEnfants.css';

const MUTE = "Ce rattachement n'est pas disponible.";
const COUPON_INTRO =
  'Saisissez ce code et la date de naissance de votre enfant.';
const SCHOOL_ORIENTATION =
  "Votre enfant n'apparaît pas ? Son établissement vous remettra un code.";

const MesEnfants: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [code, setCode] = useState('');
  const [birthday, setBirthday] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [proofsLinkId, setProofsLinkId] = useState<number | null>(null);
  const [proofs, setProofs] = useState<ParentLinkProof[]>([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [proofsError, setProofsError] = useState('');

  // showError from useToast is recreated every render — omit from deps to avoid a fetch loop.
  const loadLinks = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await listParentLinks();
      setLinks(res.data.data || []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setForbidden(true);
        setLinks([]);
      } else {
        showError("Impossible de charger la liste des enfants.");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (normalizedCode.length !== 6 || !birthday) {
      setFormError('Indiquez le code à six caractères et la date de naissance.');
      return;
    }

    setSubmitting(true);
    try {
      await createParentLink({ code: normalizedCode, birthday });
      showSuccess('Rattachement établi');
      setCode('');
      setBirthday('');
      await loadLinks();
    } catch (err: any) {
      const status = err?.response?.status;
      const apiError = err?.response?.data?.error;
      if (status === 403) {
        setForbidden(true);
        setFormError(err?.response?.data?.message || 'Accès réservé aux comptes majeurs.');
      } else if (status === 422 || status === 429) {
        setFormError(typeof apiError === 'string' ? apiError : MUTE);
      } else {
        setFormError(MUTE);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetach = async (link: ParentLink) => {
    const label = `${link.first_name} ${link.last_name}`.trim();
    if (!window.confirm(`Retirer le rattachement avec ${label || 'cet enfant'} ?`)) {
      return;
    }
    try {
      await deleteParentLink(link.id);
      showSuccess('Rattachement retiré');
      if (proofsLinkId === link.id) {
        setProofsLinkId(null);
        setProofs([]);
      }
      await loadLinks();
    } catch {
      showError("Impossible de retirer ce rattachement.");
    }
  };

  const handleOpenProofs = async (link: ParentLink) => {
    if (link.suspended) return;
    setProofsLinkId(link.id);
    setProofsLoading(true);
    setProofsError('');
    setProofs([]);
    try {
      const res = await listParentLinkProofs(link.id);
      setProofs(res.data.data || []);
    } catch (err: any) {
      setProofsError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          'Impossible de charger les preuves.'
      );
    } finally {
      setProofsLoading(false);
    }
  };

  if (forbidden) {
    return (
      <div className="mes-enfants-page">
        <h1>Mes enfants</h1>
        <p className="mes-enfants-forbidden">
          L&apos;onglet Mes enfants est réservé aux comptes majeurs.
        </p>
      </div>
    );
  }

  const proofsChild = links.find((l) => l.id === proofsLinkId);

  return (
    <div className="mes-enfants-page">
      <h1>Mes enfants</h1>
      <p className="mes-enfants-intro">{COUPON_INTRO}</p>
      <p className="mes-enfants-orientation">{SCHOOL_ORIENTATION}</p>

      <form className="mes-enfants-form" onSubmit={handleSubmit}>
        <label className="mes-enfants-field">
          <span>Code</span>
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Ex. M9EPXB"
          />
        </label>
        <label className="mes-enfants-field">
          <span>Date de naissance</span>
          <input
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
        </label>
        {formError && <p className="mes-enfants-error">{formError}</p>}
        <button type="submit" className="mes-enfants-submit" disabled={submitting}>
          {submitting ? 'Vérification…' : 'Rattacher'}
        </button>
      </form>

      <section className="mes-enfants-list-section">
        <h2>Enfants suivis</h2>
        {loading ? (
          <p className="mes-enfants-muted">Chargement…</p>
        ) : links.length === 0 ? (
          <p className="mes-enfants-muted">Aucun rattachement pour le moment.</p>
        ) : (
          <ul className="mes-enfants-list">
            {links.map((link) => (
              <li key={link.id} className="mes-enfants-item">
                <div>
                  <div className="mes-enfants-name">
                    {link.first_name} {link.last_name}
                  </div>
                  {link.suspended && (
                    <div className="mes-enfants-suspended">Le suivi n&apos;est plus actif</div>
                  )}
                </div>
                <div className="mes-enfants-actions">
                  {!link.suspended && (
                    <button
                      type="button"
                      className="mes-enfants-proofs"
                      onClick={() => void handleOpenProofs(link)}
                    >
                      Voir les preuves
                    </button>
                  )}
                  <button
                    type="button"
                    className="mes-enfants-detach"
                    onClick={() => handleDetach(link)}
                  >
                    Se détacher
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {proofsLinkId != null && (
        <section className="mes-enfants-proofs-section">
          <div className="mes-enfants-proofs-header">
            <h2>
              Preuves
              {proofsChild
                ? ` — ${proofsChild.first_name} ${proofsChild.last_name}`
                : ''}
            </h2>
            <button
              type="button"
              className="mes-enfants-proofs-close"
              onClick={() => {
                setProofsLinkId(null);
                setProofs([]);
                setProofsError('');
              }}
            >
              Fermer
            </button>
          </div>
          {proofsLoading ? (
            <p className="mes-enfants-muted">Chargement…</p>
          ) : proofsError ? (
            <p className="mes-enfants-error">{proofsError}</p>
          ) : proofs.length === 0 ? (
            <p className="mes-enfants-muted">Aucune preuve pour le moment.</p>
          ) : (
            <ul className="mes-enfants-proofs-list">
              {proofs.map((p) => (
                <li key={p.id} className="mes-enfants-proof-item">
                  <div className="mes-enfants-proof-name">{p.badge_name}</div>
                  <div className="mes-enfants-proof-meta">
                    {p.proof_type ? `${p.proof_type} · ` : ''}
                    {p.proof_number || `Preuve #${p.id}`}
                    {p.created_at
                      ? ` · ${new Date(p.created_at).toLocaleDateString('fr-FR')}`
                      : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default MesEnfants;
