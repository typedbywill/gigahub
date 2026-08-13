import { User } from '@gigahub/domain/identity';
import { ListUsersUseCase } from './list-users.use-case';
import { GetUserUseCase } from './get-user.use-case';
import { InactivateUserUseCase } from './inactivate-user.use-case';
import {
  ApplicationErrorCodes,
  type ErpUserDirectory,
  type SessionRepository,
  type UserRepository,
} from './ports';

describe('ListUsers / GetUser / InactivateUser', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  function makeUser(
    overrides: Partial<{
      id: string;
      email: string;
      name: string;
      status: 'active' | 'blocked';
      idErp: string;
      idErpEmployee: string;
    }> = {},
  ): User {
    return User.create({
      id: overrides.id ?? 'usr-1',
      email: overrides.email ?? 'alice@gigahub.local',
      name: overrides.name ?? 'Alice',
      status: overrides.status ?? 'active',
      ...(overrides.idErp
        ? {
            idErp: overrides.idErp,
            idErpEmployee: overrides.idErpEmployee ?? '20',
          }
        : {}),
    });
  }

  function buildRepo(users: User[]): UserRepository {
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
    const repo = buildRepo(users);
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
    const get = new GetUserUseCase(buildRepo(users));

    const detail = await get.execute({ userId: 'usr-1' });
    expect(detail.email).toBe('alice@gigahub.local');

    await expect(get.execute({ userId: 'missing' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.NotFound,
    });
  });

  it('inactivates local user without calling ERP', async () => {
    const users = [makeUser()];
    const repo = buildRepo(users);
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
    const useCase = new InactivateUserUseCase(repo, sessions, erp, {
      now: () => now,
    });

    const result = await useCase.execute({ userId: 'usr-1' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).not.toHaveBeenCalled();
    expect(revokeAllForUser).toHaveBeenCalledWith(users[0]!.id, now);
    expect(repo.save).toHaveBeenCalled();
  });

  it('inactivates ERP-linked user in IXC before Mongo', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const repo = buildRepo(users);
    const callOrder: string[] = [];
    const erp: ErpUserDirectory = {
      listCollaborators: jest.fn(),
      verifyPassword: jest.fn(),
      updatePassword: jest.fn(),
      setCollaboratorActive: jest.fn(async () => {
        callOrder.push('erp');
      }),
    };
    const originalSave = repo.save;
    repo.save = jest.fn(async (user) => {
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
    const useCase = new InactivateUserUseCase(repo, sessions, erp, {
      now: () => now,
    });

    const result = await useCase.execute({ userId: 'usr-erp' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).toHaveBeenCalledWith('99', false);
    expect(callOrder).toEqual(['erp', 'save', 'revoke']);
  });

  it('does not touch Mongo when IXC inactivation fails', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const repo = buildRepo(users);
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
    const useCase = new InactivateUserUseCase(repo, sessions, erp, {
      now: () => now,
    });

    await expect(useCase.execute({ userId: 'usr-erp' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.ErpUnavailable,
    });
    expect(repo.save).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(users[0]!.status).toBe('active');
  });

  it('is idempotent when user is already blocked', async () => {
    const users = [makeUser({ status: 'blocked' })];
    const repo = buildRepo(users);
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
    const useCase = new InactivateUserUseCase(repo, sessions, erp, {
      now: () => now,
    });

    const result = await useCase.execute({ userId: 'usr-1' });
    expect(result.user.status).toBe('blocked');
    expect(erp.setCollaboratorActive).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('requires ERP when linked user and directory is null', async () => {
    const users = [
      makeUser({ id: 'usr-erp', idErp: '99', idErpEmployee: '88' }),
    ];
    const repo = buildRepo(users);
    const sessions: SessionRepository = {
      findById: jest.fn(),
      findByRefreshTokenHash: jest.fn(),
      save: jest.fn(),
      revokeFamily: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    const useCase = new InactivateUserUseCase(repo, sessions, null, {
      now: () => now,
    });

    await expect(useCase.execute({ userId: 'usr-erp' })).rejects.toMatchObject({
      code: ApplicationErrorCodes.ErpUnavailable,
    });
  });
});
