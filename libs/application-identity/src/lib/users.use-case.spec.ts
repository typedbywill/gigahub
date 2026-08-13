import {
  GrantRole,
  Role,
  User,
} from '@gigahub/domain/identity';
import { ListUsersUseCase } from './list-users.use-case';
import { GetUserUseCase } from './get-user.use-case';
import { InactivateUserUseCase } from './inactivate-user.use-case';
import { UpdateUserProfileUseCase } from './update-user-profile.use-case';
import {
  ClearUserAvatarUseCase,
  SetUserAvatarUseCase,
} from './set-user-avatar.use-case';
import { SeedDefaultRolesUseCase } from './seed-default-roles.use-case';
import { ListRolesUseCase } from './list-roles.use-case';
import { ListPermissionsUseCase } from './list-permissions.use-case';
import { CreateRoleUseCase } from './create-role.use-case';
import { ReplaceRolePermissionsUseCase } from './replace-role-permissions.use-case';
import { ReplaceUserRolesUseCase } from './replace-user-roles.use-case';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type ErpUserDirectory,
  type GrantRepository,
  type ObjectStoragePort,
  type RoleRepository,
  type SessionRepository,
  type UserRepository,
} from './ports';

describe('Users admin use cases', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');
  const bucket = 'gigahub';

  function makeUser(
    overrides: Partial<{
      id: string;
      email: string;
      name: string;
      status: 'active' | 'blocked';
      idErp: string;
      idErpEmployee: string;
      avatarObjectKey: string;
    }> = {},
  ): User {
    return User.create({
      id: overrides.id ?? 'usr-1',
      email: overrides.email ?? 'alice@gigahub.local',
      name: overrides.name ?? 'Alice',
      status: overrides.status ?? 'active',
      avatarObjectKey: overrides.avatarObjectKey,
      ...(overrides.idErp
        ? {
            idErp: overrides.idErp,
            idErpEmployee: overrides.idErpEmployee ?? '20',
          }
        : {}),
    });
  }

  function buildUserRepo(users: User[]): UserRepository {
    return {
      findByEmail: jest.fn(async (email) =>
        users.find((u) => u.email === email) ?? null,
      ),
      findById: jest.fn(async (id) => users.find((u) => u.id === id) ?? null),
      findByIdErp: jest.fn(async (idErp) =>
        users.find((u) => u.idErp === idErp) ?? null,
      ),
      findAllWithErpLink: jest.fn(async () =>
        users.filter((u) => u.hasErpLink()),
      ),
      list: jest.fn(async (query) => {
        let filtered = [...users];
        if (query.status && query.status !== 'all') {
          filtered = filtered.filter((u) => u.status === query.status);
        }
        if (query.erpLinked === true) {
          filtered = filtered.filter((u) => u.hasErpLink());
        } else if (query.erpLinked === false) {
          filtered = filtered.filter((u) => !u.hasErpLink());
        }
        if (query.q) {
          const q = query.q.toLowerCase();
          filtered = filtered.filter(
            (u) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q),
          );
        }
        const start = (query.page - 1) * query.pageSize;
        return {
          items: filtered.slice(start, start + query.pageSize),
          total: filtered.length,
        };
      }),
      save: jest.fn(async (user) => {
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          users[idx] = user;
        } else {
          users.push(user);
        }
      }),
    };
  }

  function buildRoleRepo(roles: Role[]): RoleRepository {
    return {
      findById: jest.fn(async (id) => roles.find((r) => r.id === id) ?? null),
      findBySlug: jest.fn(
        async (slug) => roles.find((r) => r.slug === slug) ?? null,
      ),
      listActive: jest.fn(async () => roles.filter((r) => r.isActive())),
      save: jest.fn(async (role) => {
        const idx = roles.findIndex((r) => r.id === role.id);
        if (idx >= 0) {
          roles[idx] = role;
        } else {
          roles.push(role);
        }
      }),
    };
  }

  function buildGrantRepo(grants: GrantRole[]): GrantRepository {
    return {
      listRoleGrantsByUserId: jest.fn(async (userId) =>
        grants.filter((g) => g.userId === userId),
      ),
      listPermissionGrantsByUserId: jest.fn(async () => []),
      saveRoleGrant: jest.fn(async (grant) => {
        const idx = grants.findIndex((g) => g.id === grant.id);
        if (idx >= 0) {
          grants[idx] = grant;
        } else {
          grants.push(grant);
        }
      }),
      savePermissionGrant: jest.fn(async () => undefined),
    };
  }

  function emptyDetailDeps(users: User[]) {
    return {
      users: buildUserRepo(users),
      roles: buildRoleRepo([]),
      grants: buildGrantRepo([]),
      storage: null as ObjectStoragePort | null,
    };
  }

  it('lists users with pagination and filters', async () => {
    const users = [
      makeUser({ id: 'usr-1', name: 'Alice', email: 'alice@x.com' }),
      makeUser({
        id: 'usr-2',
        name: 'Bob',
        email: 'bob@x.com',
        status: 'blocked',
        idErp: '10',
        idErpEmployee: '11',
      }),
    ];
    const repo = buildUserRepo(users);
    const list = new ListUsersUseCase(repo);

    const all = await list.execute({ page: 1, pageSize: 20, status: 'all' });
    expect(all.total).toBe(2);
    expect(all.items).toHaveLength(2);

    const active = await list.execute({
      page: 1,
      pageSize: 20,
      status: 'active',
    });
    expect(active.total).toBe(1);
    expect(active.items[0]?.name).toBe('Alice');

    const erp = await list.execute({
      page: 1,
      pageSize: 20,
      status: 'all',
      erpLinked: true,
    });
    expect(erp.total).toBe(1);
    expect(erp.items[0]?.name).toBe('Bob');

    const search = await list.execute({
      page: 1,
      pageSize: 20,
      status: 'all',
      q: 'bob',
    });
    expect(search.total).toBe(1);
  });

  it('gets user by id or throws NotFound', async () => {
    const users = [makeUser()];
    const deps = emptyDetailDeps(users);
    const get = new GetUserUseCase(
      deps.users,
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    const detail = await get.execute({ userId: 'usr-1' });
    expect(detail.email).toBe('alice@gigahub.local');
    expect(detail.roles).toEqual([]);

    await expect(get.execute({ userId: 'missing' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.NotFound,
    });
  });

  it('updates name and email', async () => {
    const users = [makeUser()];
    const deps = emptyDetailDeps(users);
    const useCase = new UpdateUserProfileUseCase(
      deps.users,
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    const result = await useCase.execute({
      userId: 'usr-1',
      name: 'Alice Updated',
      email: 'alice.new@gigahub.local',
    });
    expect(result.user.name).toBe('Alice Updated');
    expect(result.user.email).toBe('alice.new@gigahub.local');
  });

  it('rejects email conflict on update', async () => {
    const users = [
      makeUser({ id: 'usr-1', email: 'alice@gigahub.local' }),
      makeUser({ id: 'usr-2', email: 'bob@gigahub.local', name: 'Bob' }),
    ];
    const deps = emptyDetailDeps(users);
    const useCase = new UpdateUserProfileUseCase(
      deps.users,
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    await expect(
      useCase.execute({ userId: 'usr-1', email: 'bob@gigahub.local' }),
    ).rejects.toMatchObject({ code: ApplicationErrorCodes.Conflict });
  });

  it('sets and clears avatar', async () => {
    const users = [makeUser()];
    const deps = emptyDetailDeps(users);
    const storage: ObjectStoragePort = {
      uploadFile: jest.fn(async (_b, key) => `http://minio/${bucket}/${key}`),
      getFileUrl: jest.fn(async (_b, key) => `http://minio/${bucket}/${key}`),
      deleteFile: jest.fn(async () => undefined),
    };
    const setAvatar = new SetUserAvatarUseCase(
      deps.users,
      deps.roles,
      deps.grants,
      storage,
      bucket,
      { generate: () => 'file-1' },
    );
    const clearAvatar = new ClearUserAvatarUseCase(
      deps.users,
      deps.roles,
      deps.grants,
      storage,
      bucket,
    );

    const setResult = await setAvatar.execute({
      userId: 'usr-1',
      file: Buffer.from('fake-image'),
      contentType: 'image/png',
    });
    expect(setResult.user.avatarUrl).toBe(
      'http://minio/gigahub/avatars/usr-1/file-1.png',
    );
    expect(users[0]!.avatarObjectKey).toBe('avatars/usr-1/file-1.png');

    const clearResult = await clearAvatar.execute({ userId: 'usr-1' });
    expect(clearResult.user.avatarUrl).toBeUndefined();
    expect(users[0]!.avatarObjectKey).toBeUndefined();
    expect(storage.deleteFile).toHaveBeenCalled();
  });

  it('seeds default roles idempotently', async () => {
    const roles: Role[] = [];
    const repo = buildRoleRepo(roles);
    const useCase = new SeedDefaultRolesUseCase(repo, {
      generate: () => `role-${roles.length + 1}`,
    });

    const first = await useCase.execute();
    expect(first.created).toBe(4);
    expect(first.skipped).toBe(0);

    const second = await useCase.execute();
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(4);
  });

  it('lists active roles', async () => {
    const roles = [
      Role.create({
        id: 'role-1',
        slug: 'tecnico',
        name: 'Técnico',
        permissionIds: ['work-order:read'],
      }),
    ];
    const list = new ListRolesUseCase(buildRoleRepo(roles));
    const result = await list.execute();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.slug).toBe('tecnico');
  });

  it('lists permission catalog', async () => {
    const result = await new ListPermissionsUseCase().execute();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.some((item) => item.id === 'access:manage')).toBe(
      true,
    );
  });

  it('creates a role', async () => {
    const roles: Role[] = [];
    const useCase = new CreateRoleUseCase(buildRoleRepo(roles), {
      generate: () => 'role-new',
    });
    const result = await useCase.execute({
      name: 'Auditor',
      slug: 'auditor',
      permissionIds: ['work-order:read'],
    });
    expect(result.role.id).toBe('role-new');
    expect(result.role.slug).toBe('auditor');
    expect(roles).toHaveLength(1);
  });

  it('rejects duplicate role slug', async () => {
    const roles = [
      Role.create({
        id: 'role-1',
        slug: 'tecnico',
        name: 'Técnico',
        permissionIds: ['work-order:read'],
      }),
    ];
    const useCase = new CreateRoleUseCase(buildRoleRepo(roles), {
      generate: () => 'role-2',
    });
    await expect(
      useCase.execute({ name: 'Outro', slug: 'tecnico' }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCodes.Conflict,
    } satisfies Partial<ApplicationError>);
  });

  it('replaces role permissions', async () => {
    const roles = [
      Role.create({
        id: 'role-1',
        slug: 'tecnico',
        name: 'Técnico',
        permissionIds: ['work-order:read'],
      }),
    ];
    const useCase = new ReplaceRolePermissionsUseCase(buildRoleRepo(roles));
    const result = await useCase.execute({
      roleId: 'role-1',
      permissionIds: ['work-order:read', 'work-order:execute'],
    });
    expect(result.role.permissionIds).toEqual([
      'work-order:read',
      'work-order:execute',
    ]);
    expect([...roles[0]!.permissionIds]).toEqual([
      'work-order:read',
      'work-order:execute',
    ]);
  });

  it('rejects unknown permission when replacing role permissions', async () => {
    const roles = [
      Role.create({
        id: 'role-1',
        slug: 'tecnico',
        name: 'Técnico',
        permissionIds: ['work-order:read'],
      }),
    ];
    const useCase = new ReplaceRolePermissionsUseCase(buildRoleRepo(roles));
    await expect(
      useCase.execute({
        roleId: 'role-1',
        permissionIds: ['not-a-real:permission'],
      }),
    ).rejects.toMatchObject({
      code: ApplicationErrorCodes.ValidationError,
    } satisfies Partial<ApplicationError>);
  });

  it('replaces user roles and bumps authorization version', async () => {
    const users = [makeUser()];
    const roles = [
      Role.create({
        id: 'role-tec',
        slug: 'tecnico',
        name: 'Técnico',
        permissionIds: ['work-order:read'],
      }),
      Role.create({
        id: 'role-fin',
        slug: 'financeiro',
        name: 'Financeiro',
        permissionIds: ['finance:cashbox:inspect'],
      }),
    ];
    const grants: GrantRole[] = [];
    const userRepo = buildUserRepo(users);
    const roleRepo = buildRoleRepo(roles);
    const grantRepo = buildGrantRepo(grants);
    const useCase = new ReplaceUserRolesUseCase(
      userRepo,
      roleRepo,
      grantRepo,
      null,
      bucket,
      { generate: () => `grant-${grants.length + 1}` },
    );

    const assigned = await useCase.execute({
      userId: 'usr-1',
      roleIds: ['role-tec', 'role-fin'],
      grantedByUserId: 'admin-1',
    });
    expect(assigned.user.roles).toHaveLength(2);
    expect(users[0]!.authorizationVersion).toBe(1);

    const replaced = await useCase.execute({
      userId: 'usr-1',
      roleIds: ['role-tec'],
      grantedByUserId: 'admin-1',
    });
    expect(replaced.user.roles).toHaveLength(1);
    expect(replaced.user.roles[0]?.slug).toBe('tecnico');
    expect(users[0]!.authorizationVersion).toBe(2);
  });

  it('inactivates local user without calling ERP', async () => {
    const users = [makeUser()];
    const deps = emptyDetailDeps(users);
    const revokeAllForUser = jest.fn(async () => undefined);
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser,
    };
    const erp: ErpUserDirectory = {
      listCollaborators: jest.fn(),
      verifyPassword: jest.fn(),
      updatePassword: jest.fn(),
      setCollaboratorActive: jest.fn(),
    };
    const useCase = new InactivateUserUseCase(
      deps.users,
      sessions,
      erp,
      { now: () => now },
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    const result = await useCase.execute({ userId: 'usr-1' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).not.toHaveBeenCalled();
    expect(revokeAllForUser).toHaveBeenCalledWith(users[0]!.id, now);
    expect(deps.users.save).toHaveBeenCalled();
  });

  it('inactivates ERP-linked user in IXC before Mongo', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const deps = emptyDetailDeps(users);
    const callOrder: string[] = [];
    const erp: ErpUserDirectory = {
      listCollaborators: jest.fn(),
      verifyPassword: jest.fn(),
      updatePassword: jest.fn(),
      setCollaboratorActive: jest.fn(async () => {
        callOrder.push('erp');
      }),
    };
    const originalSave = deps.users.save;
    deps.users.save = jest.fn(async (user) => {
      callOrder.push('save');
      return originalSave(user);
    });
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(async () => {
        callOrder.push('revoke');
      }),
    };
    const useCase = new InactivateUserUseCase(
      deps.users,
      sessions,
      erp,
      { now: () => now },
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    const result = await useCase.execute({ userId: 'usr-erp' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).toHaveBeenCalledWith('99', false);
    expect(callOrder).toEqual(['erp', 'save', 'revoke']);
  });

  it('does not touch Mongo when IXC inactivation fails', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const deps = emptyDetailDeps(users);
    const erp: ErpUserDirectory = {
      listCollaborators: jest.fn(),
      verifyPassword: jest.fn(),
      updatePassword: jest.fn(),
      setCollaboratorActive: jest.fn(async () => {
        throw new Error('IXC down');
      }),
    };
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const useCase = new InactivateUserUseCase(
      deps.users,
      sessions,
      erp,
      { now: () => now },
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    await expect(useCase.execute({ userId: 'usr-erp' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.ErpUnavailable,
    });
    expect(deps.users.save).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(users[0]!.status).toBe('active');
  });

  it('is idempotent when user is already blocked', async () => {
    const users = [makeUser({ status: 'blocked' })];
    const deps = emptyDetailDeps(users);
    const erp: ErpUserDirectory = {
      listCollaborators: jest.fn(),
      verifyPassword: jest.fn(),
      updatePassword: jest.fn(),
      setCollaboratorActive: jest.fn(),
    };
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const useCase = new InactivateUserUseCase(
      deps.users,
      sessions,
      erp,
      { now: () => now },
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    const result = await useCase.execute({ userId: 'usr-1' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).not.toHaveBeenCalled();
    expect(deps.users.save).not.toHaveBeenCalled();
  });

  it('requires ERP when linked user and directory is null', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const deps = emptyDetailDeps(users);
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const useCase = new InactivateUserUseCase(
      deps.users,
      sessions,
      null,
      { now: () => now },
      deps.roles,
      deps.grants,
      deps.storage,
      bucket,
    );

    await expect(useCase.execute({ userId: 'usr-erp' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.ErpUnavailable,
    });
  });
});
