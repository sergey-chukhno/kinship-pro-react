import { renderHook, act } from '@testing-library/react';
import { useSessionKeepAlive } from './useSessionKeepAlive';

const mockRefreshToken = jest.fn();
const mockHandleSessionExpired = jest.fn();
const mockIsJwtExpired = jest.fn();
const mockIsJwtExpiringSoon = jest.fn();

jest.mock('../api/Authentication', () => ({
  refreshToken: (...args: unknown[]) => mockRefreshToken(...args),
}));

jest.mock('../api/sessionExpiry', () => ({
  handleSessionExpired: (...args: unknown[]) => mockHandleSessionExpired(...args),
  isJwtExpired: (...args: unknown[]) => mockIsJwtExpired(...args),
  isJwtExpiringSoon: (...args: unknown[]) => mockIsJwtExpiringSoon(...args),
}));

describe('useSessionKeepAlive', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  it('does nothing when disabled', () => {
    localStorage.setItem('jwt_token', 'tok');
    renderHook(() => useSessionKeepAlive(false));
    window.dispatchEvent(new Event('focus'));
    expect(mockIsJwtExpired).not.toHaveBeenCalled();
  });

  it('calls handleSessionExpired on focus when JWT is expired', () => {
    localStorage.setItem('jwt_token', 'tok');
    mockIsJwtExpired.mockReturnValue(true);
    renderHook(() => useSessionKeepAlive(true));

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockHandleSessionExpired).toHaveBeenCalledTimes(1);
    expect(mockRefreshToken).not.toHaveBeenCalled();
  });

  it('refreshes token on focus when JWT is expiring soon', async () => {
    localStorage.setItem('jwt_token', 'old');
    mockIsJwtExpired.mockReturnValue(false);
    mockIsJwtExpiringSoon.mockReturnValue(true);
    mockRefreshToken.mockResolvedValue({ data: { token: 'new-token' } });

    renderHook(() => useSessionKeepAlive(true));

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
    });

    expect(mockRefreshToken).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('jwt_token')).toBe('new-token');
    expect(mockHandleSessionExpired).not.toHaveBeenCalled();
  });

  it('runs check on visibilitychange when visible', () => {
    localStorage.setItem('jwt_token', 'tok');
    mockIsJwtExpired.mockReturnValue(true);
    renderHook(() => useSessionKeepAlive(true));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockHandleSessionExpired).toHaveBeenCalled();
  });
});
