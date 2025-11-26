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
}

export const verifyStudentClaim = (payload: ClaimVerificationPayload) => {
  return axiosClient.post('/api/v1/account/claim/verify', payload);
};

export const updateStudentCredentials = (payload: ClaimCredentialsPayload) => {
  return axiosClient.post('/api/v1/account/claim', payload);
};

