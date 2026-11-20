import { SESSION_EXPIRED_EVENT } from '../api/sessionExpiry';
import { applySessionExpiredNavigation } from './sessionExpiredNavigation';

describe('applySessionExpiredNavigation', () => {
  it('clears user and navigates to /login', () => {
    const setUser = jest.fn();
    const setCurrentPage = jest.fn();
    const navigate = jest.fn();

    applySessionExpiredNavigation({ setUser, setCurrentPage, navigate });

    expect(setUser).toHaveBeenCalledWith(null);
    expect(setCurrentPage).toHaveBeenCalledWith('Auth');
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('can be wired as the session-expired event handler', () => {
    const setUser = jest.fn();
    const setCurrentPage = jest.fn();
    const navigate = jest.fn();

    const onSessionExpired = () =>
      applySessionExpiredNavigation({ setUser, setCurrentPage, navigate });

    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired);

    expect(setUser).toHaveBeenCalledWith(null);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });
});
