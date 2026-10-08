import {
  CIVIL_DATA_ERASED_LABEL,
  CIVIL_DATA_ERASED_SENTINEL,
  displayCivilLabel,
  displayPersonName,
  isCivilDataErased,
} from './civilDataErased';

describe('isCivilDataErased', () => {
  it('detects exact sentinel', () => {
    expect(isCivilDataErased(CIVIL_DATA_ERASED_SENTINEL)).toBe(true);
  });

  it('detects compound first+last sentinel (User#full_name join)', () => {
    expect(isCivilDataErased(`${CIVIL_DATA_ERASED_SENTINEL} ${CIVIL_DATA_ERASED_SENTINEL}`)).toBe(
      true
    );
  });

  it('ignores normal names and French label', () => {
    expect(isCivilDataErased('Alice Dupont')).toBe(false);
    expect(isCivilDataErased(CIVIL_DATA_ERASED_LABEL)).toBe(false);
    expect(isCivilDataErased(null)).toBe(false);
  });
});

describe('displayCivilLabel', () => {
  it('translates CIVIL_DATA_ERASED sentinel to French label', () => {
    expect(displayCivilLabel(CIVIL_DATA_ERASED_SENTINEL)).toBe(CIVIL_DATA_ERASED_LABEL);
  });

  it('translates compound sentinel from BE full_name join', () => {
    expect(
      displayCivilLabel(`${CIVIL_DATA_ERASED_SENTINEL} ${CIVIL_DATA_ERASED_SENTINEL}`)
    ).toBe(CIVIL_DATA_ERASED_LABEL);
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

  it('translates compound full_name from BE User#full_name join', () => {
    expect(
      displayPersonName(`${CIVIL_DATA_ERASED_SENTINEL} ${CIVIL_DATA_ERASED_SENTINEL}`, null, null)
    ).toBe(CIVIL_DATA_ERASED_LABEL);
  });

  it('sanitizes sentinel fallback (e.g. receiver.name)', () => {
    expect(displayPersonName(null, null, null, CIVIL_DATA_ERASED_SENTINEL)).toBe(
      CIVIL_DATA_ERASED_LABEL
    );
  });
});
