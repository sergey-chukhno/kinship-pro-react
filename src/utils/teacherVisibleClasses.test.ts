import {
  sortTeacherVisibleClasses,
  countMissingParticipants,
  isClassReferent
} from './teacherVisibleClasses';

describe('teacherVisibleClasses', () => {
  describe('isClassReferent', () => {
    it('is true for is_referent or is_creator', () => {
      expect(isClassReferent({ id: 1, is_referent: true })).toBe(true);
      expect(isClassReferent({ id: 2, is_creator: true })).toBe(true);
      expect(isClassReferent({ id: 3, is_pedagogical_team: true })).toBe(false);
    });
  });

  describe('sortTeacherVisibleClasses', () => {
    it('orders referent, then pedagogical team, then others', () => {
      const sorted = sortTeacherVisibleClasses([
        { id: 1, name: 'Z autre', is_pedagogical_team: false },
        { id: 2, name: 'Péda B', is_pedagogical_team: true },
        { id: 3, name: 'Réf A', is_referent: true },
        { id: 4, name: 'Péda A', is_pedagogical_team: true }
      ]);
      expect(sorted.map(c => c.id)).toEqual([3, 4, 2, 1]);
    });
  });

  describe('countMissingParticipants', () => {
    it('counts students not already participants', () => {
      expect(countMissingParticipants([1, 2, 3, 4], [2, 4])).toBe(2);
      expect(countMissingParticipants(['1', '2'], ['1', '2'])).toBe(0);
      expect(countMissingParticipants([10, 11], [])).toBe(2);
    });
  });
});
