import {
  CIVIL_DATA_ERASED_LABEL,
  CIVIL_DATA_ERASED_SENTINEL,
  displayCivilLabel,
  displayPersonName,
} from './civilDataErased';

describe('displayCivilLabel', () => {
  it('translates CIVIL_DATA_ERASED sentinel to French label', () => {
    expect(displayCivilLabel(CIVIL_DATA_ERASED_SENTINEL)).toBe(CIVIL_DATA_ERASED_LABEL);
  });

  it('keeps normal display names', () => {
    expect(displayCivilLabel('Alice Dupont')).toBe('Alice Dupont');
  });

  it('keeps already-translated French label', () => {
    expect(displayCivilLabel(CIVIL_DATA_ERASED_LABEL)).toBe(CIVIL_DATA_ERASED_LABEL);
  });

  it('uses fallback when blank, and sanitizes sentinel fallback', () => {
    expect(displayCivilLabel(null, 'Inconnu')).toBe('Inconnu');
    expect(displayCivilLabel('', CIVIL_DATA_ERASED_SENTINEL)).toBe(CIVIL_DATA_ERASED_LABEL);
  });
});

describe('displayPersonName', () => {
  it('translates sentinel on any name field', () => {
    expect(displayPersonName(CIVIL_DATA_ERASED_SENTINEL, null, null)).toBe(CIVIL_DATA_ERASED_LABEL);
    expect(displayPersonName(null, CIVIL_DATA_ERASED_SENTINEL, 'X')).toBe(CIVIL_DATA_ERASED_LABEL);
    expect(displayPersonName(null, null, CIVIL_DATA_ERASED_SENTINEL)).toBe(CIVIL_DATA_ERASED_LABEL);
  });

  it('sanitizes sentinel fallback (e.g. receiver.name)', () => {
    expect(displayPersonName(null, null, null, CIVIL_DATA_ERASED_SENTINEL)).toBe(
      CIVIL_DATA_ERASED_LABEL
    );
  });
});
