import {
  getMldsBilanHvLines,
  getMldsHseLinesFromMldsInfo,
  getMldsHvLinesFromMldsInfo,
  getMldsOperatingLinesFromMldsInfo,
  getMldsTransportLinesFromMldsInfo,
  hasMldsBilanData,
  mergeMldsLineLabel,
  normalizeMldsLineCollection,
  sumMldsFinancialCreditsEuro,
} from './mldsFinancialLines';

describe('mldsFinancialLines', () => {
  const hashStyleMlds = {
    financial_transport: {
      '0': { transport_name: 'Bus', price: '23' },
    },
    financial_operating: {
      '0': { operating_name: 'Manuel', price: '45' },
    },
    financial_hv_lines: {
      '0': { teacher_name: 'Mme.Valende', hour: '24' },
    },
    financial_hse_lines: {
      '0': { hse_name: 'M.Hammer', hour: '23' },
      '1': { hse_name: 'Mme.Tropani', hour: '22' },
    },
    financial_rate: '50.73',
    financial_service: [{ service_name: 'sortie', price: '30', hours: '5' }],
  };

  it('normalizes Rails hash-indexed collections', () => {
    expect(normalizeMldsLineCollection(hashStyleMlds.financial_hv_lines)).toHaveLength(1);
    expect(getMldsHvLinesFromMldsInfo(hashStyleMlds)[0].teacher_name).toBe('Mme.Valende');
    expect(getMldsHseLinesFromMldsInfo(hashStyleMlds)).toHaveLength(2);
    expect(getMldsTransportLinesFromMldsInfo(hashStyleMlds)[0].transport_name).toBe('Bus');
    expect(getMldsOperatingLinesFromMldsInfo(hashStyleMlds)[0].operating_name).toBe('Manuel');
  });

  it('reads bilan HV lines from hash format and prefers bilan label in PDF merge', () => {
    const bilan = {
      financial_hv_lines: {
        '0': { teacher_name: 'Nom corrigé', hour: '24' },
      },
    };
    expect(hasMldsBilanData(bilan)).toBe(true);
    expect(getMldsBilanHvLines(bilan)[0].teacher_name).toBe('Nom corrigé');
    expect(mergeMldsLineLabel('Mme.Valende', 'Nom corrigé', 'Enseignant')).toBe('Nom corrigé');
    expect(mergeMldsLineLabel('Mme.Valende', 'Mme.Valende', 'Enseignant')).toBe('Mme.Valende');
    expect(mergeMldsLineLabel('Mme.Valende', '', 'Enseignant')).toBe('Mme.Valende');
  });

  it('sums credits including HV lines from hash format', () => {
    const total = sumMldsFinancialCreditsEuro(
      hashStyleMlds,
      hashStyleMlds.financial_service,
      50.73
    );
    // 23 + 45 + 30 + (24 * 50.73) = 1315.52
    expect(total).toBeCloseTo(1315.52, 2);
  });
});
