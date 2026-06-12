import {
  getUserProjectRole,
} from './projectMapper';
import {
  isUserListedAsCoResponsible,
  isUserProjectCoOwner,
  isUserProjectParticipant,
  resolveProjectMemberUserId,
} from './projectPermissions';

describe('project co-responsible permissions (MLDS)', () => {
  const mldsProject = {
    id: 1,
    mlds_information: { type_mlds: 'perseverance' },
    owner: { id: 10 },
    co_responsibles: [
      { user_id: 42, full_name: 'Co Resp MLDS' },
    ],
    project_members: [],
  };

  it('resolves user_id on co_responsibles entries', () => {
    expect(resolveProjectMemberUserId(mldsProject.co_responsibles[0])).toBe('42');
    expect(isUserListedAsCoResponsible(mldsProject, '42')).toBe(true);
    expect(isUserProjectCoOwner(mldsProject, '42')).toBe(true);
  });

  it('returns co-owner role for MLDS co_responsibles via user_id', () => {
    expect(getUserProjectRole(mldsProject, 42)).toBe('co-owner');
  });

  it('treats MLDS co-responsibles as project participants', () => {
    expect(isUserProjectParticipant(mldsProject, '42')).toBe(true);
  });

  it('detects co_owner in project_members via user_id', () => {
    const project = {
      id: 2,
      owner: { id: 10 },
      project_members: [
        { user_id: 55, role: 'co_owner', status: 'pending' },
      ],
    };
    expect(getUserProjectRole(project, 55)).toBe('co-owner');
    expect(isUserProjectParticipant(project, '55')).toBe(true);
  });
});
