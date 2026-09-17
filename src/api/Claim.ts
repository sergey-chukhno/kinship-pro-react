import axiosClient from './config';

export interface ClaimVerificationPayload {
  claim_token: string;
  first_name: string;
  last_name: string;
  birthday: string; // Format: YYYY-MM-DD
}

export interface ClaimCredentialsPayload {
  claim_token: string;
  email: string;
  password: string;
  password_confirmation: string;
  birthday: string; // Format: YYYY-MM-DD
  accept_privacy_policy?: boolean; // Optional for backward compatibility
}

export type ClaimPersonalKeyResponse = {
  plaintext: string;
  pik_acknowledged_at?: string | null;
  door_label?: string | null;
  pdf_token: string;
};

export const verifyStudentClaim = (payload: ClaimVerificationPayload) => {
  return axiosClient.post('/api/v1/account/claim/verify', payload);
};

export const updateStudentCredentials = (payload: ClaimCredentialsPayload) => {
  return axiosClient.post('/api/v1/account/claim', payload);
};

export const revealClaimPersonalKey = (payload: ClaimVerificationPayload) => {
  return axiosClient.post<ClaimPersonalKeyResponse>('/api/v1/account/claim/personal_key', payload);
};

export async function downloadClaimPersonalKeyPdf(pdfToken: string) {
  const res = await axiosClient.get('/api/v1/account/claim/personal_key/pdf', {
    params: { pdf_token: pdfToken },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kinship-cle-personnelle.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

