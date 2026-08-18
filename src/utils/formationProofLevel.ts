import { FormationProofLevel } from '../types/formationProof';
import { ProjectProofLevelStyle } from './projectProofLevel';

export function getFormationProofLevelStyle(
  level: FormationProofLevel
): ProjectProofLevelStyle {
  if (level === 'EUMC') {
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
  }

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
