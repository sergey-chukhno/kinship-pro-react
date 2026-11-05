import { getPublicProofPath } from './publicProofRoute';

describe('getPublicProofPath (non-regression Point 12)', () => {
  it('returns /pb for PB or missing proof_type', () => {
    expect(getPublicProofPath('TOK123')).toBe('/pb/TOK123');
    expect(getPublicProofPath('TOK123', 'PB')).toBe('/pb/TOK123');
  });

  it('returns /pe for PE', () => {
    expect(getPublicProofPath('TOKPE', 'PE')).toBe('/pe/TOKPE');
  });

  it('returns null without token', () => {
    expect(getPublicProofPath(null)).toBeNull();
    expect(getPublicProofPath('')).toBeNull();
    expect(getPublicProofPath('   ')).toBeNull();
  });
});
