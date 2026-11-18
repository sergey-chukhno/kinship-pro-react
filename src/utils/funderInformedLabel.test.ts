import { funderCardInformedLine, formatFunderInformedDate } from './funderInformedLabel';

describe('funderInformedLabel', () => {
  it('formats ISO day and rejects blank', () => {
    expect(formatFunderInformedDate('2026-01-05')).toBe('05/01/2026');
    expect(formatFunderInformedDate(null)).toBeNull();
  });

  it('builds informed-le card line', () => {
    expect(
      funderCardInformedLine({
        startedNotifiedAt: '2026-01-05',
        shareMode: 'nominatif',
      })
    ).toBe('financeur · informé le 05/01/2026 · vue nominative');

    expect(funderCardInformedLine({ shareMode: 'anonyme' })).toBe(
      'financeur · sera informé au démarrage · vue anonymisée'
    );
  });
});
