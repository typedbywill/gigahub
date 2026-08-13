import { GrantRole, Role, User } from '@gigahub/domain/identity';
import { EnsureBootstrapAdminsUseCase } from './ensure-bootstrap-admins.use-case';
import type {
  GrantRepository,
  RoleRepository,
  UserRepository,
} from './ports';

describe('EnsureBootstrapAdminsUseCase', () => {
  function buildRepos(opts?: { erpIds?: string[] }) {
    const users = [
      User.create({
        id: 'usr-298',
        email: 'william@example.com',
        name: 'William Gerhard',
        status: 'active',
        idErp: '298',
        idErpEmployee: '554',
      }),
    ];
    const roles = [
      Role.create({
        id: 'role-admin',
        slug: 'admin-acesso',
        name: 'Administrador de acesso',
        permissionIds: ['access:manage', 'users:read'],
      }),
    ];
    const grants: GrantRole[] = [];

    const userRepo: UserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdErp: jest.fn(async (idErp) =>
        users.find((user) => user.idErp === idErp) ?? null,
      ),
      findAllWithErpLink: jest.fn(),
      list: jest.fn(),
      save: jest.fn(async (user) => {
        const idx = users.findIndex((item) => item.id === user.id);
        if (idx >= 0) {
          users[idx] = user;
        }
      }),
    };
    const roleRepo: RoleRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(async (slug) =>
        roles.find((role) => role.slug === slug) ?? null,
      ),
      listActive: jest.fn(),
      save: jest.fn(),
    };
    const grantRepo: GrantRepository = {
      listRoleGrantsByUserId: jest.fn(async (userId) =>
        grants.filter((grant) => grant.userId === userId),
      ),
      listPermissionGrantsByUserId: jest.fn(async () => []),
      saveRoleGrant: jest.fn(async (grant) => {
        grants.push(grant);
      }),
      savePermissionGrant: jest.fn(),
    };

    const useCase = new EnsureBootstrapAdminsUseCase(
      userRepo,
      roleRepo,
      grantRepo,
      { generate: () => `grant-${grants.length + 1}` },
      opts?.erpIds ?? ['298'],
    );

    return { users, grants, useCase, grantRepo };
  }

  it('grants admin-acesso to configured ERP ids', async () => {
    const { users, grants, useCase } = buildRepos();
    const result = await useCase.execute();
    expect(result).toEqual({ granted: 1, skipped: 0, missing: [] });
    expect(grants).toHaveLength(1);
    expect(String(grants[0]!.roleId)).toBe('role-admin');
    expect(users[0]!.authorizationVersion).toBe(1);
  });

  it('skips when grant already exists', async () => {
    const { grants, useCase } = buildRepos();
    await useCase.execute();
    const second = await useCase.execute();
    expect(second).toEqual({ granted: 0, skipped: 1, missing: [] });
    expect(grants).toHaveLength(1);
  });

  it('reports missing ERP ids', async () => {
    const { useCase } = buildRepos({ erpIds: ['999'] });
    const result = await useCase.execute();
    expect(result).toEqual({ granted: 0, skipped: 0, missing: ['999'] });
  });
});
