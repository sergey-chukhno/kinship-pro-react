import {
  STUDENT_CODE_NEED_VERIFIED_EMAIL,
  guardWriteUntilEmailVerified,
  isReadOnlyUntilEmail,
} from './studentCodeAccess';

describe('studentCodeAccess', () => {
  it('detects read_only_until_email', () => {
    expect(isReadOnlyUntilEmail({ read_only_until_email: true })).toBe(true);
    expect(isReadOnlyUntilEmail({ read_only_until_email: false })).toBe(false);
    expect(isReadOnlyUntilEmail(null)).toBe(false);
  });

  it('guardWriteUntilEmailVerified blocks and notifies', () => {
    const notify = jest.fn();
    expect(guardWriteUntilEmailVerified({ read_only_until_email: true }, notify)).toBe(false);
    expect(notify).toHaveBeenCalledWith(STUDENT_CODE_NEED_VERIFIED_EMAIL);
    expect(guardWriteUntilEmailVerified({ read_only_until_email: false }, notify)).toBe(true);
  });
});
