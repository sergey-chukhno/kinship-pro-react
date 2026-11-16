import {
  defaultProjectStepType,
  projectStepAttestLabel,
  projectStepDateParts,
  projectStepTypeLabel,
  sortProjectStepsByDate,
} from './projectStepLabels';
import type { ProjectStep } from '../api/ProjectSteps';

describe('projectStepLabels', () => {
  it('maps event types to French labels', () => {
    expect(projectStepTypeLabel('workshop')).toBe('Atelier');
    expect(projectStepTypeLabel('session')).toBe('Séance');
    expect(projectStepTypeLabel('meeting')).toBe('Réunion');
  });

  it('defaults session (Séance) for formation, Atelier otherwise', () => {
    expect(defaultProjectStepType('formation')).toBe('session');
    expect(defaultProjectStepType('standard')).toBe('workshop');
    expect(defaultProjectStepType(null)).toBe('workshop');
  });

  it('formats date parts for the card', () => {
    expect(projectStepDateParts('2026-09-16')).toEqual({ month: 'sept.', day: '16' });
  });

  it('builds Attester label date · type · title', () => {
    expect(
      projectStepAttestLabel({
        title: 'Écrire une chronique',
        date: '2026-10-07',
        event_type: 'workshop',
      })
    ).toBe('07/10/2026 · Atelier · Écrire une chronique');
  });

  it('sorts steps by date then time', () => {
    const steps = [
      { id: 2, title: 'B', date: '2026-11-12', time: '10:00:00', event_type: 'workshop', proofs_count: 0 },
      { id: 1, title: 'A', date: '2026-11-11', time: '09:00:00', event_type: 'workshop', proofs_count: 0 },
    ] as ProjectStep[];
    expect(sortProjectStepsByDate(steps).map((s) => s.id)).toEqual([1, 2]);
  });
});
