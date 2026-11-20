import { AxiosError } from 'axios';
import { toast } from 'react-toastify';
import {
  SESSION_EXPIRED_MESSAGE,
  SESSION_EXPIRED_TOAST_KEY,
  clearAuthStorage,
  clearSessionExpiredFlag,
  getJwtExpiresAt,
  handleSessionExpired,
  isJwtExpired,
  isJwtExpiringSoon,
  isSessionExpiredToastActive,
  onAxiosClientResponseError,
  shouldHandleUnauthorized,
} from './sessionExpiry';

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
  },
}));

function makeJwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ user_id: 1, exp: expSeconds }));
  return `${header}.${payload}.sig`;
}

describe('sessionExpiry', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  describe('getJwtExpiresAt / isJwtExpired / isJwtExpiringSoon', () => {
    it('reads exp from JWT payload', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      expect(getJwtExpiresAt(makeJwt(exp))).toBe(exp);
    });

    it('detects expired token with skew', () => {
      const past = Math.floor(Date.now() / 1000) - 60;
      expect(isJwtExpired(makeJwt(past))).toBe(true);
    });

    it('detects expiring soon within window', () => {
      const soon = Math.floor(Date.now() / 1000) + 120;
      expect(isJwtExpiringSoon(makeJwt(soon), 300)).toBe(true);
      const far = Math.floor(Date.now() / 1000) + 3600;
      expect(isJwtExpiringSoon(makeJwt(far), 300)).toBe(false);
    });
  });

  describe('shouldHandleUnauthorized', () => {
    it('returns false without jwt in localStorage', () => {
      const err = {
        response: { status: 401 },
        config: { url: '/api/v1/projects', baseURL: 'https://api.example' },
      } as AxiosError;
      expect(shouldHandleUnauthorized(err)).toBe(false);
    });

    it('returns true for 401 with token on protected URL', () => {
      localStorage.setItem('jwt_token', 'tok');
      const err = {
        response: { status: 401 },
        config: { url: '/api/v1/projects', baseURL: 'https://api.example' },
      } as AxiosError;
      expect(shouldHandleUnauthorized(err)).toBe(true);
    });

    it('exempts login URL', () => {
      localStorage.setItem('jwt_token', 'tok');
      const err = {
        response: { status: 401 },
        config: { url: '/api/v1/auth/login', baseURL: 'https://api.example' },
      } as AxiosError;
      expect(shouldHandleUnauthorized(err)).toBe(false);
    });
  });

  describe('handleSessionExpired', () => {
    it('toasts once, clears auth, and dispatches event', () => {
      localStorage.setItem('jwt_token', 'tok');
      localStorage.setItem('selectedPageType', 'pro');
      const listener = jest.fn();
      window.addEventListener('kinship-session-expired', listener);

      handleSessionExpired();
      handleSessionExpired();

      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        SESSION_EXPIRED_MESSAGE,
        expect.any(Object)
      );
      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(localStorage.getItem('selectedPageType')).toBeNull();
      expect(isSessionExpiredToastActive()).toBe(true);
      expect(sessionStorage.getItem(SESSION_EXPIRED_TOAST_KEY)).toBe('1');
      expect(listener).toHaveBeenCalledTimes(1);

      window.removeEventListener('kinship-session-expired', listener);
    });

    it('clearSessionExpiredFlag resets toast gate', () => {
      handleSessionExpired();
      clearSessionExpiredFlag();
      expect(isSessionExpiredToastActive()).toBe(false);
      handleSessionExpired();
      expect(toast.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearAuthStorage', () => {
    it('removes auth keys', () => {
      localStorage.setItem('jwt_token', 'x');
      localStorage.setItem('selectedContextId', '1');
      clearAuthStorage();
      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(localStorage.getItem('selectedContextId')).toBeNull();
    });
  });

  describe('onAxiosClientResponseError', () => {
    it('triggers session expiry on protected 401 then rejects', async () => {
      localStorage.setItem('jwt_token', 'tok');
      const err = {
        response: { status: 401 },
        config: { url: '/api/v1/projects', baseURL: 'https://api.example' },
      } as AxiosError;

      await expect(onAxiosClientResponseError(err)).rejects.toBe(err);
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('jwt_token')).toBeNull();
    });

    it('does not trigger session expiry for login 401', async () => {
      localStorage.setItem('jwt_token', 'tok');
      const err = {
        response: { status: 401 },
        config: { url: '/api/v1/auth/login', baseURL: 'https://api.example' },
      } as AxiosError;

      await expect(onAxiosClientResponseError(err)).rejects.toBe(err);
      expect(toast.error).not.toHaveBeenCalled();
      expect(localStorage.getItem('jwt_token')).toBe('tok');
    });
  });
});
