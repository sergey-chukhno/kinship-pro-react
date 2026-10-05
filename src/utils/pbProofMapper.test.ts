import { mapPbProofApiToProofData, normalizeBadgeProofResponse } from './pbProofMapper';

describe('mapPbProofApiToProofData sender', () => {
  it('reads the emitter from sender_display when sender_name is absent', () => {
    const api = normalizeBadgeProofResponse(
      {
        proof_number: 'PB·2026·FR·141B47WV00',
        proof_type: 'PB',
        proof_manifest: {
          organization_name: 'Ecole maternelle Jules Ferry',
          organization_country: 'FR',
          organization_trust_level: 'SCHOOL',
        },
        holder_display: 'Fatima1 El mouhine',
        sender_display: { name: 'Fatima El mouhine', job: null },
        sender_comment: 'Pleine de bonne volonté',
        share_token: 'DVLYWLZ4RF99R0CZ',
      },
      'DVLYWLZ4RF99R0CZ'
    );

    const proof = mapPbProofApiToProofData(api);

    expect(proof.senderName).toBe('Fatima El mouhine');
    expect(proof.senderInitials).toBe('FM');
    expect(proof.senderJob).toBeNull();
    expect(proof.senderCivilErased).toBe(false);
    expect(proof.senderOrg).toBe('Ecole maternelle Jules Ferry');
  });

  it('treats CIVIL_DATA_ERASED on sender_display.name as erased civil data', () => {
    const api = normalizeBadgeProofResponse(
      {
        proof_number: 'PB·1',
        proof_type: 'PB',
        holder_display: 'Titulaire',
        sender_display: { name: 'CIVIL_DATA_ERASED', job: 'Prof' },
      },
      'TOKEN'
    );

    const proof = mapPbProofApiToProofData(api);

    expect(proof.senderName).toBe('Données civiles effacées');
    expect(proof.senderCivilErased).toBe(true);
  });

  it('maps assign PublicProofPayload without share_token (F3 Écran 7)', () => {
    const api = normalizeBadgeProofResponse(
      {
        proof_number: 'PB·2026·FR·ASSIGN01',
        proof_type: 'PB',
        holder_display: 'Alice',
        sender_display: { name: 'Bob', job: 'Mentor' },
        attestation_label: '✓ Attestée',
        esco_label: 'Adaptability',
        esco_uri: 'http://data.europa.eu/esco/skill/x',
        esco_match: 'exact',
        verify_service_enabled: false,
      },
      ''
    );
    const proof = mapPbProofApiToProofData(api);
    expect(proof.shareToken).toBe('');
    expect(proof.holderName).toBe('Alice');
    expect(proof.escoLabel).toBe('Adaptability');
    expect(proof.verifyServiceEnabled).toBe(false);
  });
});
