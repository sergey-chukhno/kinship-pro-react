import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { SESSION_EXPIRED_EVENT } from '../api/sessionExpiry';
import { applySessionExpiredNavigation } from './sessionExpiredNavigation';

/** Clears user shell and sends the user to /login when session expiry is signaled. */
export function useSessionExpiredNavigation(): void {
  const { setUser, setCurrentPage } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const onSessionExpired = () => {
      applySessionExpiredNavigation({ setUser, setCurrentPage, navigate });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
  }, [setUser, setCurrentPage, navigate]);
}
