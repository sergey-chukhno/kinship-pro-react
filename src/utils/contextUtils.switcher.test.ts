import {
  activeOrganizationForCreate,
  creatableOrganizations,
  defaultConcretiseOrganizationKey,
  parseCtxParam,
  resolveSwitcherContext,
} from './contextUtils';
import { User } from '../types';

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

describe('activeOrganizationForCreate', () => {
  const user = {
    available_contexts: {
      schools: [
        { id: 4, name: 'Ecole maternelle Jules Ferry', city: '', role: 'admin' as const },
        { id: 21, name: 'Reseau FOQUAL Draguignan', city: '', role: 'admin' as const },
      ],
    },
  } as User;

  beforeEach(() => {
    localStorage.clear();
  });

  it('uses the school highlighted in the switcher, not the first membership', () => {
    localStorage.setItem('selectedContextId', '21');
    localStorage.setItem('selectedContextType', 'school');

    expect(
      activeOrganizationForCreate({ user, showingPageType: 'edu', search: '' })
    ).toEqual({ id: 21, type: 'School', name: 'Reseau FOQUAL Draguignan' });
  });

  it('prefers ?ctx= over a stale stored school', () => {
    localStorage.setItem('selectedContextId', '4');
    localStorage.setItem('selectedContextType', 'school');

    expect(
      activeOrganizationForCreate({ user, showingPageType: 'edu', search: '?ctx=school-21' })
    ).toEqual({ id: 21, type: 'School', name: 'Reseau FOQUAL Draguignan' });
  });
});

describe('defaultConcretiseOrganizationKey', () => {
  const user = {
    available_contexts: {
      schools: [
        { id: 4, name: 'Ecole maternelle Jules Ferry', city: '', role: 'admin' as const },
        { id: 21, name: 'Reseau FOQUAL Draguignan', city: '', role: 'admin' as const },
        { id: 9, name: 'Collège sans droit', city: '', role: 'member' as const },
      ],
    },
  } as User;

  beforeEach(() => {
    localStorage.clear();
  });

  it('lists only schools and companies the user can administer', () => {
    expect(creatableOrganizations(user).map((org) => org.id)).toEqual([4, 21]);
  });

  it('preselects the switcher school instead of the first membership', () => {
    localStorage.setItem('selectedContextId', '21');
    localStorage.setItem('selectedContextType', 'school');

    expect(
      defaultConcretiseOrganizationKey({ user, showingPageType: 'edu', search: '' })
    ).toBe('School:21');
  });

  it('stays empty when the context is not an organisation, rather than picking the first school', () => {
    expect(
      defaultConcretiseOrganizationKey({ user, showingPageType: 'teacher', search: '' })
    ).toBe('');
  });
});
