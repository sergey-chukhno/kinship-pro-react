import { companyTypeRaw, translateOrgType } from './orgTypeLabels';

describe('orgTypeLabels', () => {
  it('translates school and company type slugs', () => {
    expect(translateOrgType('college')).toBe('Collège');
    expect(translateOrgType('medico_social')).toBe('Médico-social');
    expect(translateOrgType('information_et_orientation')).toBe('Information et orientation');
    expect(translateOrgType('medico social')).toBe('Médico-social');
  });

  it('keeps already-human French labels', () => {
    expect(translateOrgType('Collège')).toBe('Collège');
    expect(translateOrgType('Association')).toBe('Association');
  });

  it('reads company_type string or { name }', () => {
    expect(companyTypeRaw({ company_type: 'medico_social' })).toBe('medico_social');
    expect(companyTypeRaw({ company_type: { name: 'information_et_orientation' } })).toBe(
      'information_et_orientation'
    );
    expect(companyTypeRaw({})).toBe('');
  });
});
