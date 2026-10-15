import { EuMcGate, EuMcGateReason } from '../types/formationCatalogue';

/** Mots maquette P4.3 pour la case MC UE grisée (serveur = source de vérité). */
export const EU_MC_GATE_REASON_COPY: Record<EuMcGateReason, string> = {
  setting: 'disponible prochainement.',
  plan: 'avec le plan européen →',
  trust: 'Faites vérifier votre organisme →',
};

export function getEuMcGateCheckboxLabel(gate: EuMcGate): {
  disabled: boolean;
  body: string;
} {
  if (gate.allowed) {
    return {
      disabled: false,
      body:
        'votre organisme y est éligible. Les éléments du cadre européen seront à compléter avant l’ajout au catalogue.',
    };
  }
  const reason = gate.reason || 'setting';
  return {
    disabled: true,
    body: EU_MC_GATE_REASON_COPY[reason],
  };
}
