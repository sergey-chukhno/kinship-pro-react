import { ProjectProofLevel } from '../types/projectProof';

export interface ProjectProofLevelStyle {
  cardBorder?: string;
  mcBarVisible: boolean;
  mcBarClass: string;
  mcTitle: string;
  mcSub: string;
  sealFill: string;
  sealStroke: string;
  sealInnerStroke: string;
  sealTextFill: string;
  kinshipNameColor: string;
  kinshipTypeColor: string;
  proofNumColor: string;
  proofNumWeight: number;
  avatarModifier: '' | 'pp-avatar-gold' | 'pp-avatar-ppmc';
  idNameAccent: boolean;
}

export function getProjectProofLevelStyle(level: ProjectProofLevel): ProjectProofLevelStyle {
  switch (level) {
    case 'EUMC':
      return {
        cardBorder: '1.5px solid #D4960A',
        mcBarVisible: true,
        mcBarClass: 'mc-bar-gold',
        mcTitle: 'Microcertification',
        mcSub: ' · Conforme Rec. UE 2022/C 243/02 · attestée',
        sealFill: '#D4960A',
        sealStroke: '#B8860B',
        sealInnerStroke: 'rgba(255,255,255,0.4)',
        sealTextFill: '#fff',
        kinshipNameColor: '#D4960A',
        kinshipTypeColor: 'rgba(212,150,10,.6)',
        proofNumColor: '#D4960A',
        proofNumWeight: 600,
        avatarModifier: 'pp-avatar-gold',
        idNameAccent: true,
      };
    case 'PPMC':
      return {
        cardBorder: '1.5px solid #5B7FA6',
        mcBarVisible: true,
        mcBarClass: 'mc-bar-ppmc',
        mcTitle: 'Microcertification Kinship',
        mcSub: ' · autodéclarée',
        sealFill: '#5B7FA6',
        sealStroke: '#4A6A8F',
        sealInnerStroke: 'rgba(255,255,255,0.4)',
        sealTextFill: '#fff',
        kinshipNameColor: '#5B7FA6',
        kinshipTypeColor: 'rgba(91,127,166,.7)',
        proofNumColor: '#5B7FA6',
        proofNumWeight: 600,
        avatarModifier: 'pp-avatar-ppmc',
        idNameAccent: true,
      };
    case 'RICH':
      return {
        cardBorder: '1.5px solid #A0AEC0',
        mcBarVisible: true,
        mcBarClass: 'mc-bar-rich',
        mcTitle: 'Preuve Projet enrichie',
        mcSub: ' · 5 à 10 éléments Annexe I renseignés',
        sealFill: '#A0AEC0',
        sealStroke: '#8A9BB0',
        sealInnerStroke: 'rgba(255,255,255,0.5)',
        sealTextFill: '#fff',
        kinshipNameColor: '#6B7A8A',
        kinshipTypeColor: '#8A9BB0',
        proofNumColor: '#A0AEC0',
        proofNumWeight: 400,
        avatarModifier: '',
        idNameAccent: false,
      };
    default:
      return {
        mcBarVisible: false,
        mcBarClass: '',
        mcTitle: '',
        mcSub: '',
        sealFill: 'rgba(0,49,137,0.08)',
        sealStroke: '#003189',
        sealInnerStroke: 'rgba(0,49,137,0.2)',
        sealTextFill: '#003189',
        kinshipNameColor: '#1a1a2e',
        kinshipTypeColor: '#6b7280',
        proofNumColor: '#9ca3af',
        proofNumWeight: 400,
        avatarModifier: '',
        idNameAccent: false,
      };
  }
}
