import { EU_MC_GATE_REASON_COPY, getEuMcGateCheckboxLabel } from './euMcGateCopy';

describe('getEuMcGateCheckboxLabel', () => {
  it('enables the checkbox when the gate is allowed', () => {
    const label = getEuMcGateCheckboxLabel({ allowed: true });
    expect(label.disabled).toBe(false);
    expect(label.body).toMatch(/éligible/);
  });

  it('disables with setting / plan / trust copy from the mock', () => {
    expect(getEuMcGateCheckboxLabel({ allowed: false, reason: 'setting' })).toEqual({
      disabled: true,
      body: EU_MC_GATE_REASON_COPY.setting,
    });
    expect(getEuMcGateCheckboxLabel({ allowed: false, reason: 'plan' })).toEqual({
      disabled: true,
      body: EU_MC_GATE_REASON_COPY.plan,
    });
    expect(getEuMcGateCheckboxLabel({ allowed: false, reason: 'trust' })).toEqual({
      disabled: true,
      body: EU_MC_GATE_REASON_COPY.trust,
    });
  });

  it('defaults to setting when reason is missing', () => {
    expect(getEuMcGateCheckboxLabel({ allowed: false }).body).toBe(
      EU_MC_GATE_REASON_COPY.setting
    );
  });
});
