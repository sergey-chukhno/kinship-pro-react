import {
  schoolOrgRoleLabel,
  countSelectableChosen,
  addChosenStudentsCtaLabel,
} from './schoolParticipantLabels';

describe('schoolParticipantLabels', () => {
  describe('schoolOrgRoleLabel', () => {
    it('maps all school student system roles to élève', () => {
      expect(schoolOrgRoleLabel('eleve_primaire')).toBe('élève');
      expect(schoolOrgRoleLabel('collegien')).toBe('élève');
      expect(schoolOrgRoleLabel('lyceen')).toBe('élève');
      expect(schoolOrgRoleLabel('etudiant')).toBe('élève');
    });

    it('keeps staff labels', () => {
      expect(schoolOrgRoleLabel('intervenant')).toBe('intervenant');
      expect(schoolOrgRoleLabel('admin')).toBe('admin');
    });
  });

  describe('countSelectableChosen', () => {
    it('counts checked ids that are not already members', () => {
      expect(countSelectableChosen(['1', '2', '3'], ['2'])).toBe(2);
      expect(countSelectableChosen(['1', '2'], ['1', '2'])).toBe(0);
    });
  });

  describe('addChosenStudentsCtaLabel', () => {
    it('formats CTA per Patrick screen c', () => {
      expect(addChosenStudentsCtaLabel(0)).toBe('✓ dans le projet');
      expect(addChosenStudentsCtaLabel(1)).toBe('Ajouter 1 élève');
      expect(addChosenStudentsCtaLabel(11)).toBe('Ajouter 11 élèves');
    });
  });
});
