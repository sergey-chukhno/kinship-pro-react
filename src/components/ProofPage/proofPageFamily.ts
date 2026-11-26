import { ProofFamily } from '../../types/proofPage';

export interface FamilyChrome {
  bandLabel: string;
  bandSub?: string;
  dateLine: (endedAt: string) => string;
  cssVarFrom: string;
  cssVarTo: string;
  cssVarMid?: string;
  cssVarInk: string;
}

function formatEndedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Étape 1 : chrome minimal par famille (contenu riche = étapes 2–6). */
export function getFamilyChrome(family: ProofFamily): FamilyChrome {
  switch (family) {
    case 'formation_certified':
      return {
        bandLabel: 'FORMATION PROFESSIONNELLE',
        bandSub: 'Organisme de formation certifié',
        dateLine: (e) => `scellée le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-formation-certified-from)',
        cssVarTo: 'var(--ppg-fam-formation-certified-to)',
        cssVarInk: 'var(--ppg-fam-formation-certified-ink)',
      };
    case 'formation_other':
      return {
        bandLabel: 'Preuve Kinship · Formation',
        dateLine: (e) => `scellée le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-formation-other-from)',
        cssVarTo: 'var(--ppg-fam-formation-other-to)',
        cssVarInk: 'var(--ppg-fam-formation-other-ink)',
      };
    case 'microcredential':
      return {
        bandLabel: 'Microcertification',
        bandSub: 'au sens de la recommandation européenne (2022/C 243/02)',
        dateLine: (e) => `délivrée le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-mc-gold-deep)',
        cssVarTo: 'var(--ppg-fam-mc-gold)',
        cssVarInk: '#fff',
      };
    case 'project_enriched':
      return {
        bandLabel: 'Preuve Projet enrichie',
        dateLine: (e) => `clos le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-project-enriched-from)',
        cssVarMid: 'var(--ppg-fam-project-enriched-mid)',
        cssVarTo: 'var(--ppg-fam-project-enriched-to)',
        cssVarInk: 'var(--ppg-fam-project-enriched-ink)',
      };
    case 'stage':
      return {
        bandLabel: 'Preuve Kinship · Stage',
        dateLine: (e) => `clos le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-stage-from)',
        cssVarTo: 'var(--ppg-fam-stage-to)',
        cssVarInk: 'var(--ppg-fam-stage-ink)',
      };
    case 'project_basic':
    default:
      return {
        bandLabel: 'Preuve Projet',
        dateLine: (e) => `clos le ${formatEndedDate(e)}`,
        cssVarFrom: 'var(--ppg-fam-project-from)',
        cssVarTo: 'var(--ppg-fam-project-to)',
        cssVarInk: 'var(--ppg-fam-project-ink)',
      };
  }
}

export function formatProofDateRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const fmt = (d: Date) =>
    Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(a)} → ${fmt(b)}`;
}

export function formatRetentionDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
