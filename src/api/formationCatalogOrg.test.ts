import { isCatalogueOrgCertified } from './formationCatalogOrg';

describe('isCatalogueOrgCertified', () => {
  it('is false without org, Qualiopi or STRATEGIC_PARTNER', () => {
    expect(isCatalogueOrgCertified(null)).toBe(false);
    expect(isCatalogueOrgCertified(undefined)).toBe(false);
    expect(isCatalogueOrgCertified({ qualiopi: false, trustLevel: 'STANDARD' })).toBe(false);
    expect(isCatalogueOrgCertified({ qualiopi: false, trustLevel: null })).toBe(false);
  });

  it('is true when Qualiopi is verified', () => {
    expect(isCatalogueOrgCertified({ qualiopi: true, trustLevel: 'STANDARD' })).toBe(true);
  });

  it('is true for STRATEGIC_PARTNER even without qualiopi flag', () => {
    expect(isCatalogueOrgCertified({ qualiopi: false, trustLevel: 'STRATEGIC_PARTNER' })).toBe(
      true
    );
  });
});
