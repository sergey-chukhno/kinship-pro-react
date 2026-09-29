import { BadgeAPI } from '../../types';
import { RingNiveau } from './CompetenceRing';

export interface CompetenceEntry {
  name: string;
  axeTitle: string | null;
  levels: BadgeAPI[];
  niveaux: RingNiveau[];
  litCount: number;
  totalCount: number;
  everCompleted: boolean;
  /** Preuve la plus récente (UserBadge brut, toutes preuves de la compétence confondues) —
   * pour la tuile "Mes compétences" en style carte Preuve Kinship ; null si jamais constatée. */
  latestProof: any | null;
}
