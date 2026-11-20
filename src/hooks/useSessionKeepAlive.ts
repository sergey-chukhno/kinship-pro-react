import { useEffect, useRef } from 'react';
import { refreshToken } from '../api/Authentication';
import {
  handleSessionExpired,
  isJwtExpired,
  isJwtExpiringSoon,
} from '../api/sessionExpiry';

const DEBOUNCE_MS = 1000;
const EXPIRING_SOON_SECONDS = 300;

/**
 * When the tab becomes visible / focused: expire → session-expired flow;
 * soon-to-expire → silent refresh. Relies on axios 401 interceptor as fallback.
 */
export function useSessionKeepAlive(enabled: boolean): void {
  const lastCheckRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const check = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < DEBOUNCE_MS) return;
      lastCheckRef.current = now;

      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      if (isJwtExpired(token)) {
        handleSessionExpired();
        return;
      }

      if (!isJwtExpiringSoon(token, EXPIRING_SOON_SECONDS)) return;
      if (refreshingRef.current) return;

      refreshingRef.current = true;
      try {
        const refreshed = await refreshToken();
        if (refreshed?.data?.token) {
          localStorage.setItem('jwt_token', refreshed.data.token);
        }
      } catch {
        // 401 → interceptor / handleSessionExpired
      } finally {
        refreshingRef.current = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', check);
    };
  }, [enabled]);
}
