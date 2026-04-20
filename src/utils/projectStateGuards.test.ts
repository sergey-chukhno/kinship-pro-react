import {
  buildCloseProjectConfirmationMessage,
  canOwnerCloseProject,
  isProjectReadOnly,
  shouldShowEndDateWarningBanner
} from './projectStateGuards';

describe('projectStateGuards', () => {
  describe('isProjectReadOnly', () => {
    it('returns true for ended and archived', () => {
      expect(isProjectReadOnly('ended')).toBe(true);
      expect(isProjectReadOnly('archived')).toBe(true);
    });

    it('returns false for writable states', () => {
      expect(isProjectReadOnly('draft')).toBe(false);
      expect(isProjectReadOnly('in_progress')).toBe(false);
      expect(isProjectReadOnly('coming')).toBe(false);
    });
  });

  describe('canOwnerCloseProject', () => {
    it('allows closure only for owner on in_progress and not read-only mode', () => {
      expect(canOwnerCloseProject('in_progress', 'owner', false)).toBe(true);
      expect(canOwnerCloseProject('coming', 'owner', false)).toBe(false);
      expect(canOwnerCloseProject('in_progress', 'admin', false)).toBe(false);
      expect(canOwnerCloseProject('in_progress', 'owner', true)).toBe(false);
    });
  });

  describe('shouldShowEndDateWarningBanner', () => {
    it('shows banner only for in_progress with backend flag true', () => {
      expect(shouldShowEndDateWarningBanner('in_progress', true)).toBe(true);
      expect(shouldShowEndDateWarningBanner('in_progress', false)).toBe(false);
      expect(shouldShowEndDateWarningBanner('ended', true)).toBe(false);
    });
  });

  describe('buildCloseProjectConfirmationMessage', () => {
    it('contains project title and irreversible warning', () => {
      const message = buildCloseProjectConfirmationMessage('Projet Alpha');
      expect(message).toContain('Projet Alpha');
      expect(message).toContain('définitive et irréversible');
      expect(message).toContain('lecture seule');
    });
  });
});
