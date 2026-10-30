import {
  attestLastSeriesKey,
  readAttestLastSeries,
  writeAttestLastSeries,
} from './attestLastSeries';

describe('attestLastSeries', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds storage key', () => {
    expect(attestLastSeriesKey(12, 99)).toBe('attest:lastSeries:12:99');
  });

  it('round-trips payload', () => {
    writeAttestLastSeries(1, 2, {
      series: 'Compétences psychosociales',
      catalog_key: 'competences_psychosociales',
    });
    expect(readAttestLastSeries(1, 2)).toEqual({
      series: 'Compétences psychosociales',
      catalog_key: 'competences_psychosociales',
    });
  });

  it('returns null when missing or invalid', () => {
    expect(readAttestLastSeries(1, 2)).toBeNull();
    localStorage.setItem(attestLastSeriesKey(1, 2), '{');
    expect(readAttestLastSeries(1, 2)).toBeNull();
  });
});
