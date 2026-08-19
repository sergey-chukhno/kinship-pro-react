import {
  FINANCEMENT_LABEL,
  FormationCard,
  MOCK_OF_ORG,
  PARTICIPATION_LABEL,
} from '../data/mockFormations';
import { FunderFollowData, FunderSession, FunderSignal } from '../data/mockFunderView';

function formatRange(start?: string, end?: string): string {
  if (!start || !end) return '';
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };
  return `${fmt(start)} → ${fmt(end)}`;
}

export function followViewFromFormation(
  formation: FormationCard,
  opts?: { identitiesDone?: number; identitiesTotal?: number }
): FunderFollowData {
  const signals: FunderSignal[] = [];
  const lastChange = formation.dateChanges?.at(-1);
  if (lastChange) {
    const at = lastChange.at.slice(0, 10).split('-').reverse().join('/');
    signals.push({
      kind: 'dates',
      label: 'Dates reportées',
      detail: `le ${at} — nouvelles dates : ${formatRange(lastChange.toStart, lastChange.toEnd)}`,
    });
  }

  const hoursTotal = formation.durationHours ?? 0;
  const coming = formation.status === 'coming';
  const ended = formation.status === 'ended' || formation.status === 'archived';
  const sessions: FunderSession[] = coming
    ? [
        {
          id: 'next',
          kind: 'next',
          title: '→ Séance 1',
          meta: formation.startDate
            ? `${formation.startDate.split('-').reverse().join('/')} · 9h00—12h30`
            : '',
          recap: '— la prochaine',
        },
      ]
    : [];

  const startShort = formation.startDate
    ? `${formation.startDate.slice(8, 10)}/${formation.startDate.slice(5, 7)}`
    : undefined;
  const endShort = formation.endDate
    ? `${formation.endDate.slice(8, 10)}/${formation.endDate.slice(5, 7)}`
    : undefined;

  return {
    token: formation.id,
    closed: ended,
    closedOn: ended && formation.endDate
      ? formation.endDate.split('-').reverse().join('/')
      : undefined,
    title: formation.title,
    org: MOCK_OF_ORG.name,
    dateRange: formatRange(formation.startDate, formation.endDate),
    financement: formation.financement ? FINANCEMENT_LABEL[formation.financement] : '',
    statusLabel:
      formation.status === 'in_progress'
        ? 'EN COURS'
        : formation.status === 'coming'
          ? 'À VENIR'
          : 'TERMINÉE',
    qualiopi: true,
    attendanceSurvey: Boolean(formation.attendanceSurveyOptIn),
    hoursDone: coming ? '0h' : ended ? `${hoursTotal}h` : `${Math.round(hoursTotal * 0.5)}h`,
    hoursTotal: hoursTotal ? `${hoursTotal}h` : '—',
    hoursPercent: coming ? 0 : ended ? 100 : 52,
    attendanceRate: coming ? '—' : '92 %',
    sessionsDone: coming ? 0 : ended ? 8 : 5,
    sessionsTotal: 8,
    identitiesDone: opts?.identitiesDone ?? 0,
    identitiesTotal: opts?.identitiesTotal ?? 0,
    showIdentities: formation.financement === 'CPF',
    informedOn: coming ? undefined : startShort,
    reportDue: endShort,
    phase: coming ? 'informed' : ended ? 'report' : 'live',
    location: formation.participationMode
      ? PARTICIPATION_LABEL[formation.participationMode]
      : 'Présentiel',
    level: 'Niveau EQF 2',
    language: 'Français',
    description: formation.description ?? '',
    outcomes: (formation.learningOutcomes ?? []).map((o) => ({
      text: o.text.replace(/^📚\s*/, ''),
      source: o.kind === 'series' ? 'DigComp' : 'acquis propre',
    })),
    sessions,
    signals,
  };
}
