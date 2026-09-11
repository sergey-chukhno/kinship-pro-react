import React, { useCallback, useEffect, useState } from 'react';
import {
  listMeParents,
  MeParentLink,
  MeParentsMeta,
  updateMeParentsFollow,
} from '../../api/MeParents';
import { useToast } from '../../hooks/useToast';
import './MesParents.css';

const FOLLOW_GUARD =
  "Ce bouton n'éteint que le suivi de tes preuves. Les messages d'information adressés à ton représentant légal, eux, continuent.";

const MesParents: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [links, setLinks] = useState<MeParentLink[]>([]);
  const [meta, setMeta] = useState<MeParentsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const applyPayload = useCallback((payload: { data: MeParentLink[]; meta: MeParentsMeta }) => {
    setLinks(payload.data || []);
    setMeta(payload.meta || null);
  }, []);

  const loadParents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listMeParents();
      applyPayload(res.data);
    } catch {
      showError("Impossible de charger Mes parents.");
      setLinks([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyPayload]);

  useEffect(() => {
    void loadParents();
  }, [loadParents]);

  const handleToggle = async (nextActive: boolean) => {
    if (!meta?.can_toggle_follow || toggling) return;
    setToggling(true);
    try {
      const res = await updateMeParentsFollow(nextActive);
      applyPayload(res.data);
      showSuccess(nextActive ? 'Suivi réactivé' : 'Suivi suspendu');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Impossible de modifier le suivi.";
      showError(typeof message === 'string' ? message : "Impossible de modifier le suivi.");
    } finally {
      setToggling(false);
    }
  };

  const handleCopyCode = async () => {
    const code = meta?.shareable_code;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showError('Copie impossible.');
    }
  };

  return (
    <div className="mes-parents-page">
      <h1>Mes parents</h1>
      <p className="mes-parents-intro">
        Voici les personnes rattachées qui peuvent suivre tes preuves.
      </p>

      <section className="mes-parents-list-section">
        <h2>Parents rattachés</h2>
        {loading ? (
          <p className="mes-parents-muted">Chargement…</p>
        ) : links.length === 0 ? (
          <p className="mes-parents-muted">Aucun rattachement pour le moment.</p>
        ) : (
          <ul className="mes-parents-list">
            {links.map((link) => (
              <li key={link.id} className="mes-parents-item">
                <div>
                  <div className="mes-parents-name">
                    {[link.parent_first_name, link.parent_last_name].filter(Boolean).join(' ') ||
                      'Parent'}
                  </div>
                  <div
                    className={
                      link.suspended ? 'mes-parents-suspended' : 'mes-parents-active'
                    }
                  >
                    {link.status_label}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {meta?.can_toggle_follow && (
        <section className="mes-parents-follow-section">
          <h2>Suivi de mes preuves</h2>
          <label className="mes-parents-switch-row">
            <span className="mes-parents-switch-label">
              {meta.follow_active ? 'Suivi actif' : "Suivi n'est plus actif"}
            </span>
            <span className={`mes-parents-toggle-switch${toggling || links.length === 0 ? ' is-disabled' : ''}`}>
              <input
                type="checkbox"
                role="switch"
                checked={Boolean(meta.follow_active)}
                disabled={toggling || links.length === 0}
                onChange={(e) => void handleToggle(e.target.checked)}
                aria-label="Activer ou suspendre le suivi parental"
              />
              <span className="mes-parents-toggle-slider" aria-hidden="true" />
            </span>
          </label>
          <p className="mes-parents-guard">{FOLLOW_GUARD}</p>
        </section>
      )}

      {meta?.digital_majority_reached && meta.shareable_code && (
        <section className="mes-parents-code-section">
          <h2>Ton code de rattachement</h2>
          <p className="mes-parents-muted">
            Tu peux le transmettre toi-même à un parent.
          </p>
          <div className="mes-parents-code-row">
            <code className="mes-parents-code">{meta.shareable_code}</code>
            <button type="button" className="mes-parents-copy" onClick={() => void handleCopyCode()}>
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default MesParents;
