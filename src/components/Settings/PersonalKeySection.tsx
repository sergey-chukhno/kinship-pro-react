import React, { useCallback, useEffect, useState } from 'react';
import axiosClient from '../../api/config';

const FEATURE_PIK_REMISE = process.env.REACT_APP_FEATURE_PIK_REMISE === 'true';

type IdentityPayload = {
  remitted?: boolean;
  state?: 'before' | 'after';
  pik_acknowledged_at?: string | null;
  door_label?: string | null;
  feature_enabled?: boolean;
  backup_email?: string | null;
};

/**
 * D-PIK-REMISE / KIN_UX_PIK V1.9 — behind FEATURE_PIK_REMISE (default OFF).
 */
const PersonalKeySection: React.FC = () => {
  const [payload, setPayload] = useState<IdentityPayload | null>(null);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [backupEmail, setBackupEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosClient.get('/api/v1/account/identity');
      setPayload(res.data);
      setBackupEmail(res.data?.backup_email || '');
    } catch {
      setError('Impossible de charger la clé personnelle.');
    }
  }, []);

  useEffect(() => {
    if (FEATURE_PIK_REMISE) void load();
  }, [load]);

  if (!FEATURE_PIK_REMISE) return null;

  const remitted = Boolean(payload?.remitted);

  const reveal = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.post('/api/v1/account/identity/reveal');
      setPlaintext(res.data.plaintext);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Remise impossible.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.get('/api/v1/account/identity/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kinship-cle-personnelle.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Téléchargement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const replaceKey = async () => {
    if (!window.confirm(
      'Votre ancienne clé cessera de fonctionner immédiatement. Pensez à remplacer les copies que vous avez enregistrées. Les demandes en cours faites avec l\'ancienne clé seront annulées.'
    )) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.post('/api/v1/account/identity/replace');
      setPlaintext(res.data.plaintext);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Remplacement impossible.');
    } finally {
      setBusy(false);
    }
  };

  const saveBackupEmail = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await axiosClient.patch('/api/v1/account/identity', {
        backup_email: backupEmail.trim() || null,
      });
      setPayload(res.data);
      setBackupEmail(res.data?.backup_email || '');
      setMessage('Adresse de secours enregistrée.');
    } catch (e: any) {
      const details = e?.response?.data?.details;
      setError(
        (Array.isArray(details) && details.join(', ')) ||
          e?.response?.data?.message ||
          'Enregistrement impossible.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-section">
      <h2>Ma clé personnelle</h2>
      <p>
        Votre Clé personnelle Kinship vous permet d&apos;exercer vos droits sur vos preuves à tout moment —
        y compris si votre compte est un jour supprimé ou anonymisé.
      </p>
      {error ? <p style={{ color: '#c0392b' }}>{error}</p> : null}
      {message ? <p style={{ color: '#1a7f37' }}>{message}</p> : null}
      {!remitted ? (
        <>
          <p><strong>Votre Clé personnelle Kinship</strong></p>
          <p style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>
            {plaintext || '•••• •••• •••• •••• •••• ••••'}
          </p>
          <p>Enregistrez-la maintenant. Nous ne pourrons pas vous la réafficher ensuite. Kinship ne vous l&apos;enverra jamais par email.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void reveal()}>
              Afficher ma clé
            </button>
            <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void downloadPdf()}>
              Télécharger le PDF
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Votre clé vous a été remise
            {payload?.pik_acknowledged_at
              ? ` le ${new Date(payload.pik_acknowledged_at).toLocaleDateString('fr-FR')}`
              : ''}
            {payload?.door_label ? `, ${payload.door_label}` : ''}.
          </p>
          <p>Nous ne la conservons pas et ne pouvons pas vous la réafficher.</p>
          {plaintext ? (
            <p style={{ fontFamily: 'monospace', letterSpacing: '0.08em' }}>{plaintext}</p>
          ) : null}
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void replaceKey()}>
            Remplacer ma clé
          </button>
        </>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e8e6df' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Adresse email de secours</h3>
        <p style={{ fontSize: '0.9rem', color: '#6b6a64' }}>
          Optionnelle. Différente de votre email de connexion. Elle ne reçoit jamais la clé —
          uniquement des alertes de sécurité liées à vos droits.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <input
            type="email"
            value={backupEmail}
            onChange={(e) => setBackupEmail(e.target.value)}
            placeholder="secours@exemple.fr"
            style={{
              flex: '1 1 220px',
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #cfd3e6',
            }}
          />
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => void saveBackupEmail()}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalKeySection;
