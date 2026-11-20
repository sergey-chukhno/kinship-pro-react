type SessionExpiredNavDeps = {
  setUser: (user: null) => void;
  setCurrentPage: (page: 'Auth') => void;
  navigate: (path: string, opts?: { replace?: boolean }) => void;
};

/** Pure handler — unit-tested without react-router ESM. */
export function applySessionExpiredNavigation(deps: SessionExpiredNavDeps): void {
  deps.setUser(null);
  deps.setCurrentPage('Auth');
  deps.navigate('/login', { replace: true });
}
