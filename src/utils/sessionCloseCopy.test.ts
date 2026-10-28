import {
  formatDateLongFr,
  formatDateRangeLongFr,
  formatDateShortFr,
  formatDurationHoursLabel,
  formatProofCodeDisplay,
  invalidParticipantSentence,
  printCertificatesLabel,
  proofLabel,
} from './sessionCloseCopy';

describe('sessionCloseCopy', () => {
  it('formats short and long French dates', () => {
    expect(formatDateShortFr('2026-10-17')).toBe('17/10/2026');
    expect(formatDateLongFr('2026-10-17')).toBe('17 octobre 2026');
    expect(formatDateRangeLongFr('2026-10-17', '2026-10-23')).toBe(
      'du 17 octobre 2026 au 23 octobre 2026'
    );
  });

  it('adds heures unit', () => {
    expect(formatDurationHoursLabel('21')).toBe('21 heures');
    expect(formatDurationHoursLabel('21 h')).toBe('21 heures');
    expect(formatDurationHoursLabel('1')).toBe('1 heure');
  });

  it('agrees singular/plural copy', () => {
    expect(proofLabel(1, false)).toBe('1 preuve de formation');
    expect(proofLabel(2, false)).toBe('2 preuves de formation');
    expect(invalidParticipantSentence(1, ['Nadia Benali'], false)).toBe(
      '1 participant non validé ne recevra pas de preuve de formation : Nadia Benali.'
    );
    expect(printCertificatesLabel(1)).toBe('Imprimer le certificat');
  });

  it('normalizes proof code middots', () => {
    expect(formatProofCodeDisplay('PF-2026-FR-659643QM')).toBe('PF·2026·FR·659643QM');
    expect(formatProofCodeDisplay('PF·2026·FR·659643QM')).toBe('PF·2026·FR·659643QM');
  });
});
