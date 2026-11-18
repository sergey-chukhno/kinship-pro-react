import { participantChipName, participantMatchesSearch } from './participantSearchMatch';

describe('participantChipName', () => {
  it('keeps a single token', () => {
    expect(participantChipName('Sofia')).toBe('Sofia');
  });

  it('shortens to Prénom I.', () => {
    expect(participantChipName('Julie Lehingue')).toBe('Julie L.');
  });
});

describe('participantMatchesSearch', () => {
  it('empty term matches everyone', () => {
    expect(participantMatchesSearch('Julie Lehingue', '')).toBe(true);
    expect(participantMatchesSearch('Julie Lehingue', '   ')).toBe(true);
  });

  it('matches on full name, not via a Risso-like org substring', () => {
    // Org is never passed — « s » must not match Julie just because school is Risso
    expect(participantMatchesSearch('Julie Lehingue', 's')).toBe(false);
    expect(participantMatchesSearch('Julie Lehingue', 'ss')).toBe(false);
  });

  it('matches names containing s / ss', () => {
    expect(participantMatchesSearch('Oscar Noel', 's')).toBe(true);
    expect(participantMatchesSearch('Sabrina Quill', 'ss')).toBe(false); // no « ss » substring
    expect(participantMatchesSearch('Sabrina Quill', 's')).toBe(true);
    expect(participantMatchesSearch('Cassidy Brown', 'ss')).toBe(true);
  });

  it('matches chip form', () => {
    expect(participantMatchesSearch('Uma Silva', 'uma s')).toBe(true);
    expect(participantMatchesSearch('Uma Silva', 'uma s.')).toBe(true);
  });

  it('sss matches neither typical first names nor Risso', () => {
    expect(participantMatchesSearch('Sofia Martinez', 'sss')).toBe(false);
    expect(participantMatchesSearch('Sabrina Quill', 'sss')).toBe(false);
  });
});
