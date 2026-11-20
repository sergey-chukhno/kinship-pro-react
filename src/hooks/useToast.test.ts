import { toast } from 'react-toastify';
import { useToast } from './useToast';
import { SESSION_EXPIRED_TOAST_KEY } from '../api/sessionExpiry';

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  },
}));

describe('useToast', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('showError calls toast.error normally', () => {
    const { showError } = useToast();
    showError('boom');
    expect(toast.error).toHaveBeenCalledWith('boom', expect.any(Object));
  });

  it('showError is a no-op when session-expired flag is active', () => {
    sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
    const { showError } = useToast();
    showError('Erreur lors de la récupération des projets.');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('showSuccess still works when session-expired flag is active', () => {
    sessionStorage.setItem(SESSION_EXPIRED_TOAST_KEY, '1');
    const { showSuccess } = useToast();
    showSuccess('ok');
    expect(toast.success).toHaveBeenCalled();
  });
});
