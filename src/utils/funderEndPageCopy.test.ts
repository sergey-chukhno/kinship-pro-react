import { funderEndPageCopy } from './funderEndPageCopy';

describe('funderEndPageCopy', () => {
  it('prefers API message split after the first sentence', () => {
    expect(
      funderEndPageCopy({
        kind: 'project',
        message:
          'Cette session est clôturée le 12 novembre 2026. Le rapport vous a été transmis par e-mail.',
      })
    ).toEqual({
      title: 'Cette session est clôturée le 12 novembre 2026.',
      sub: 'Le rapport vous a été transmis par e-mail.',
    });
  });

  it('falls back to session copy for formation', () => {
    expect(funderEndPageCopy({ kind: 'formation', closedOn: '12/11/2026' })).toEqual({
      title: 'Cette session est clôturée le 12/11/2026.',
      sub: 'Le rapport vous a été transmis par e-mail.',
    });
  });

  it('falls back to project copy', () => {
    expect(funderEndPageCopy({ kind: 'project', closedOn: '12/11/2026' })).toEqual({
      title: 'Ce projet est clôturé le 12/11/2026.',
      sub: 'Le rapport vous a été transmis par e-mail.',
    });
  });

  it('never uses « email » without hyphen', () => {
    const copies = [
      funderEndPageCopy({ kind: 'formation', closedOn: '1' }),
      funderEndPageCopy({ kind: 'project', closedOn: '1' }),
      funderEndPageCopy({
        message: 'Cette session est clôturée le 1. Le rapport vous a été transmis par e-mail.',
      }),
    ];
    copies.forEach(({ title, sub }) => {
      expect(`${title} ${sub}`).not.toMatch(/par email(?!-)/);
      expect(sub).toMatch(/e-mail/);
    });
  });
});
