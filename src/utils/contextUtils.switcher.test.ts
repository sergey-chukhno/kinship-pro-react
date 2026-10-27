import { parseCtxParam, resolveSwitcherContext } from './contextUtils';

describe('parseCtxParam', () => {
  it('parses company/school/formation ctx values', () => {
    expect(parseCtxParam('company-20')).toEqual({ type: 'company', id: '20' });
    expect(parseCtxParam('school-3')).toEqual({ type: 'school', id: '3' });
    expect(parseCtxParam('formation-12')).toEqual({ type: 'formation', id: '12' });
  });

  it('keeps dashed ids after the first separator', () => {
    expect(parseCtxParam('user-user-dashboard')).toEqual({
      type: 'user',
      id: 'user-dashboard',
    });
    expect(parseCtxParam('teacher-teacher-dashboard')).toEqual({
      type: 'teacher',
      id: 'teacher-dashboard',
    });
  });

  it('rejects empty or unknown types', () => {
    expect(parseCtxParam(null)).toBeNull();
    expect(parseCtxParam('')).toBeNull();
    expect(parseCtxParam('company')).toBeNull();
    expect(parseCtxParam('company-')).toBeNull();
    expect(parseCtxParam('unknown-9')).toBeNull();
  });
});

describe('resolveSwitcherContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefers ?ctx= over stale localStorage (same-type Qualiopi switch)', () => {
    localStorage.setItem('selectedContextId', '19');
    localStorage.setItem('selectedContextType', 'company');

    expect(
      resolveSwitcherContext({
        search: '?ctx=company-20',
        showingPageType: 'pro',
      })
    ).toEqual({ type: 'company', id: '20' });

    expect(
      resolveSwitcherContext({
        search: '?ctx=company-21',
        showingPageType: 'pro',
      })
    ).toEqual({ type: 'company', id: '21' });
  });

  it('falls back to localStorage when search has no ctx', () => {
    localStorage.setItem('selectedContextId', '19');
    localStorage.setItem('selectedContextType', 'company');

    expect(
      resolveSwitcherContext({
        search: '',
        showingPageType: 'pro',
      })
    ).toEqual({ type: 'company', id: '19' });
  });

  it('falls back to page-type defaults when nothing is stored', () => {
    expect(
      resolveSwitcherContext({
        search: '',
        showingPageType: 'teacher',
      })
    ).toEqual({ type: 'teacher', id: 'teacher-dashboard' });

    expect(
      resolveSwitcherContext({
        search: '',
        showingPageType: 'user',
      })
    ).toEqual({ type: 'user', id: 'user-dashboard' });

    expect(
      resolveSwitcherContext({
        search: '',
        showingPageType: 'of',
        formationOrgFallbackId: 42,
      })
    ).toEqual({ type: 'formation', id: '42' });
  });
});
