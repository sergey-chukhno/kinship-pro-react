import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

export const SESSION_EXPIRED_EVENT = 'kinship-session-expired';
export const SESSION_EXPIRED_TOAST_KEY = 'kinship_session_expired_toast';
export const SESSION_EXPIRED_MESSAGE =
  'Votre session a expiré. Veuillez vous reconnecter.';

const AUTH_EXEMPT_PATH_FRAGMENTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/login_with_student_code',
  '/api/v1/auth/register',
  '/api/v1/auth/password/forgot',
  '/api/v1/auth/password/reset',
];

export function clearAuthStorage(): void {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('selectedPageType');
  localStorage.removeItem('selectedContextId');
  localStorage.removeItem('selectedContextType');
}

export function clearSessionExpiredFlag(): void {
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_TOAST_KEY);
  } catch {
    // sessionStorage may be unavailable (private mode / SSR)
  }
}

export function isSessionExpiredToastActive(): boolean {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY) === '1';
  } catch {
    return false;
  }
}

function requestUrl(error: AxiosError): string {
  const config = error.config;
  if (!config) return '';
  const base = config.baseURL || '';
  const path = config.url || '';
  try {
    if (path.startsWith('http')) return path;
    return `${base}${path}`;
  } catch {
    return `${base}${path}`;
  }
}

export function shouldHandleUnauthorized(error: unknown): boolean {
  const axiosError = error as AxiosError | undefined;
  if (!axiosError?.response || axiosError.response.status !== 401) return false;
  if (!localStorage.getItem('jwt_token')) return false;

  const url = requestUrl(axiosError).toLowerCase();
  if (AUTH_EXEMPT_PATH_FRAGMENTS.some((frag) => url.includes(frag))) {
    return false;
  }
  return true;
}

/** Idempotent: one toast + clear storage + event per browser tab cycle. */
export function handleSessionExpired(): void {
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY) === '1') {
      return;
    }
    sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
  } catch {
    // If sessionStorage fails, still proceed (may toast more than once).
  }

  toast.error(SESSION_EXPIRED_MESSAGE, {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });

  clearAuthStorage();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/** Read JWT `exp` (seconds) without verifying signature — client UX only. */
export function getJwtExpiresAt(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  const exp = getJwtExpiresAt(token);
  if (exp == null) return true;
  return Date.now() / 1000 >= exp - skewSeconds;
}

export function isJwtExpiringSoon(token: string, withinSeconds = 300): boolean {
  const exp = getJwtExpiresAt(token);
  if (exp == null) return true;
  const now = Date.now() / 1000;
  return exp - now <= withinSeconds && exp - now > 0;
}
