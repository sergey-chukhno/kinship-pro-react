import {
  schoolOrgRoleLabel,
  memberSchoolOrgRoleLabel,
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

  describe('memberSchoolOrgRoleLabel', () => {
    it('prefers role_in_system over school membership role member', () => {
      // School API: role_in_system = élève, membership often "member" (not used for label)
      expect(
        memberSchoolOrgRoleLabel({
          role_in_system: 'collegien',
          role: 'member',
        })
      ).toBe('élève');
      expect(
        memberSchoolOrgRoleLabel({
          role_in_system: 'lyceen',
          organization_role: 'member',
        })
      ).toBe('élève');
    });

    it('uses teacher members payload role (system role on role field)', () => {
      expect(memberSchoolOrgRoleLabel({ role: 'etudiant' })).toBe('élève');
    });

    it('uses member_type student when system role missing', () => {
      expect(memberSchoolOrgRoleLabel({ member_type: 'student', role: 'member' })).toBe(
        'élève'
      );
    });

    it('does not show membre when only membership role would win without system role fallback chain', () => {
      // School API shape: no `role`, only role_in_system + role_in_school
      expect(
        memberSchoolOrgRoleLabel({
          role_in_system: 'eleve_primaire',
        })
      ).toBe('élève');
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
