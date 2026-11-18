import { mapUserBadgeToProofData } from './userBadgeProofMapper';

function baseUserBadge(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 42,
    proof_number: 'PB·2026·FR·TEST',
    proof_type: 'PB',
    share_token: 'share-token-xyz',
    created_at: '2026-01-25T12:00:00Z',
    assigned_at: '2026-01-25T12:00:00Z',
    comment: null,
    skills_indicated: [],
    documents: [],
    badge: { title: 'Compétence test', level: 'level_1', series: 'Référentiel' },
    receiver: { full_name: 'Alice Test' },
    sender: { full_name: 'Bob Sender', job: null },
    organization: { name: 'École Test', type: 'School', trust_level: 'STANDARD' },
    project: { title: 'Projet test' },
    ...overrides,
  };
}

describe('mapUserBadgeToProofData retention', () => {
  it('formats retention_expiry_at as French date, not awardedDate', () => {
    const proof = mapUserBadgeToProofData(
      baseUserBadge({
        retention_expiry_at: '2031-01-25T12:00:00Z',
      })
    );

    expect(proof.awardedDate).toMatch(/2026/);
    expect(proof.retentionExpiry).toMatch(/2031/);
    expect(proof.retentionExpiry).not.toBe(proof.awardedDate);
  });

  it('uses em dash when retention_expiry_at is absent (no awardedDate fallback)', () => {
    const proof = mapUserBadgeToProofData(baseUserBadge({ retention_expiry_at: null }));

    expect(proof.awardedDate).toMatch(/2026/);
    expect(proof.retentionExpiry).toBe('—');
  });
});
