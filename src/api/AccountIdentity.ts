import axiosClient, { axiosClientWithoutToken } from './config';

export interface PikIdentityPayload {
  identity_token: string;
  pik_acknowledged_at: string | null;
  issued_at: string | null;
  backup_email: string | null;
}

export interface PikEncartPayload {
  show_encart: boolean;
}

function unwrapIdentity(data: unknown): PikIdentityPayload {
  const root = (data ?? {}) as Record<string, unknown>;
  const nested = (root.identity ?? root.data ?? root) as Record<string, unknown>;
  return {
    identity_token: String(nested.identity_token ?? ''),
    pik_acknowledged_at: (nested.pik_acknowledged_at as string | null) ?? null,
    issued_at: (nested.issued_at as string | null) ?? null,
    backup_email: (nested.backup_email as string | null) ?? null,
  };
}

/** GET /api/v1/account/identity */
export function getIdentity() {
  return axiosClient.get('/api/v1/account/identity').then((res) => unwrapIdentity(res.data));
}

/** PATCH /api/v1/account/identity — backup_email */
export function updateBackupEmail(backupEmail: string) {
  return axiosClient
    .patch('/api/v1/account/identity', { backup_email: backupEmail })
    .then((res) => unwrapIdentity(res.data));
}

/** GET /api/v1/account/identity/pdf */
export function downloadIdentityPdf() {
  return axiosClient.get('/api/v1/account/identity/pdf', {
    responseType: 'blob',
  });
}

/** PATCH /api/v1/account/identity/acknowledged */
export function acknowledgeIdentity() {
  return axiosClient
    .patch('/api/v1/account/identity/acknowledged')
    .then((res) => unwrapIdentity(res.data));
}

/** GET /api/v1/account/identity/encart */
export function getIdentityEncart() {
  return axiosClient.get('/api/v1/account/identity/encart').then((res) => {
    const root = (res.data ?? {}) as Record<string, unknown>;
    const nested = (root.data ?? root) as Record<string, unknown>;
    return { show_encart: Boolean(nested.show_encart) } as PikEncartPayload;
  });
}

/** GET /droits — page publique (texte droits, sans token) */
export function getPublicDroits() {
  return axiosClientWithoutToken.get('/droits');
}

export function triggerPdfDownload(blob: Blob, filename = 'kinship-pik.pdf') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
