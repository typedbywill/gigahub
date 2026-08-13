import { Credential, Session, User } from '@gigahub/domain/identity';
import { LoginUseCase } from './login.use-case';
import { RenewTokenUseCase } from './renew-token.use-case';
import { ChangePasswordUseCase } from './change-password.use-case';
import { SyncUsersFromErpUseCase } from './sync-users-from-erp.use-case';
import {
  ApplicationErrorCodes,
  type CredentialRepository,
  type ErpUserDirectory,
  type SessionRepository,
  type UserRepository,
} from './ports';

describe('LoginUseCase and RenewTokenUseCase', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  function build(opts?: { erpLinked?: boolean; erp?: ErpUserDirectory | null }) {
    const user = User.create({
      id: 'usr-1',
      email: 'admin@gigahub.local',
      name: 'Admin',
      status: 'active',
      ...(opts?.erpLinked
        ? { idErp: '10', idErpEmployee: '20' }
        : {}),
    });
    const credential = Credential.create({
      id: 'cred-1',
      userId: user.id,
      passwordHash: 'hashed-secret',
    });
    const users: UserRepository = {
      findByEmail: jest.fn(async (email) =>
        email === user.email ? user : null,
      ),
      findById: jest.fn(async (id) => (id === user.id ? user : null)),
      findByIdErp: jest.fn(async () => null),
      findAllWithErpLink: jest.fn(async () => []),
      list: jest.fn(async () => ({ items: [], total: 0 })),
      save: jest.fn(async () => undefined),
    };
    const credentials: CredentialRepository = {
      findByUserId: jest.fn(async (id) =>
        id === user.id ? credential : null,
      ),
      save: jest.fn(async () => undefined),
    };
    let stored: Session | null = null;
    const sessions: SessionRepository = {
      findById: jest.fn(async () => stored),
      findByRefreshTokenHash: jest.fn(async (hash) => {
        if (!stored) return null;
        return stored.matchesRefreshHash(hash) ? stored : null;
      }),
      save: jest.fn(async (session) => {
        stored = session;
      }),
      revokeFamily: jest.fn(async () => {
        stored?.revoke(now);
      }),
      revokeAllForUser: jest.fn(async () => {
        stored?.revoke(now);
      }),
    };
    const hasher = {
      hash: jest.fn(async (p: string) => `hashed-${p}`),
      verify: jest.fn(async (p: string, h: string) => h === `hashed-${p}`),
    };
    let refreshSeq = 0;
    const refreshTokens = {
      generate: jest.fn(() => `refresh-${++refreshSeq}`),
      hash: jest.fn((token: string) => `hash(${token})`),
    };
    const tokens = {
      issueAccessToken: jest.fn(async () => 'access-token'),
    };
    const ids = {
      generate: jest.fn(() => `id-${Math.random().toString(36).slice(2, 8)}`),
    };
    const clock = { now: () => now };
    const erp =
      opts?.erp === undefined
        ? null
        : opts.erp;

    return {
      user,
      sessions,
      erp,
      login: new LoginUseCase(
        users,
        credentials,
        sessions,
        hasher,
        erp,
        tokens,
        refreshTokens,
        ids,
        clock,
      ),
      renew: new RenewTokenUseCase(
        users,
        sessions,
        tokens,
        refreshTokens,
        clock,
      ),
      changePassword: new ChangePasswordUseCase(
        users,
        credentials,
        sessions,
        hasher,
        erp,
        clock,
      ),
    };
  }

  it('logs in local user with Argon2 credential', async () => {
    const { login, renew } = build();
    const logged = await login.execute({
      email: 'Admin@gigahub.local',
      password: 'secret',
    });
    expect(logged.accessToken).toBe('access-token');
    expect(logged.user.email).toBe('admin@gigahub.local');

    const renewed = await renew.execute({ refreshToken: logged.refreshToken });
    expect(renewed.refreshToken).not.toBe(logged.refreshToken);
  });

  it('logs in ERP-linked user via IXC verifyPassword', async () => {
    const erp: ErpUserDirectory = {
      listCollaborators: async () => [],
      verifyPassword: jest.fn(async (_email, password) => password === 'ixc-secret'),
      updatePassword: jest.fn(async () => undefined),
      setCollaboratorActive: jest.fn(async () => undefined),
    };
    const { login } = build({ erpLinked: true, erp });
    const logged = await login.execute({
      email: 'admin@gigahub.local',
      password: 'ixc-secret',
    });
    expect(logged.accessToken).toBe('access-token');
    expect(erp.verifyPassword).toHaveBeenCalled();
  });

  it('rejects wrong password', async () => {
    const { login } = build();
    await expect(
      login.execute({ email: 'admin@gigahub.local', password: 'nope' }),
    ).rejects.toMatchObject({ code: ApplicationErrorCodes.InvalidCredentials });
  });

  it('detects refresh reuse', async () => {
    const { login, renew } = build();
    const logged = await login.execute({
      email: 'admin@gigahub.local',
      password: 'secret',
    });
    await renew.execute({ refreshToken: logged.refreshToken });
    await expect(
      renew.execute({ refreshToken: logged.refreshToken }),
    ).rejects.toMatchObject({ code: ApplicationErrorCodes.RefreshTokenReuse });
  });

  it('changes ERP password in IXC', async () => {
    const erp: ErpUserDirectory = {
      listCollaborators: async () => [],
      verifyPassword: jest.fn(async () => true),
      updatePassword: jest.fn(async () => undefined),
      setCollaboratorActive: jest.fn(async () => undefined),
    };
    const { changePassword, sessions } = build({ erpLinked: true, erp });
    await changePassword.execute({
      userId: 'usr-1',
      currentPassword: 'old',
      newPassword: 'newsecret',
    });
    expect(erp.updatePassword).toHaveBeenCalledWith('10', 'newsecret');
    expect(sessions.revokeAllForUser).toHaveBeenCalled();
  });
});

describe('SyncUsersFromErpUseCase', () => {
  it('creates user without credential and blocks orphans', async () => {
    const store = new Map<string, User>();
    const byErp = new Map<string, User>();

    const users: UserRepository = {
      findByEmail: jest.fn(async (email) => {
        for (const u of store.values()) {
          if (u.email === email) return u;
        }
        return null;
      }),
      findById: jest.fn(async (id) => store.get(id) ?? null),
      findByIdErp: jest.fn(async (idErp) => byErp.get(idErp) ?? null),
      findAllWithErpLink: jest.fn(async () =>
        [...store.values()].filter((u) => u.hasErpLink()),
      ),
      list: jest.fn(async () => ({
        items: [...store.values()],
        total: store.size,
      })),
      save: jest.fn(async (user) => {
        store.set(user.id, user);
        if (user.idErp) byErp.set(user.idErp, user);
      }),
    };
    const ids = { generate: jest.fn(() => `id-${store.size + 1}`) };

    const orphan = User.create({
      id: 'orphan-1',
      email: 'orphan@giganet.local',
      name: 'Orphan',
      status: 'active',
      idErp: '999',
      idErpEmployee: '999',
    });
    await users.save(orphan);

    const directory: ErpUserDirectory = {
      listCollaborators: async () => [
        {
          idErp: '1042',
          idErpEmployee: '77',
          email: 'maria@giganet.local',
          name: 'Maria Silva',
          active: true,
          jobTitle: 'Tecnico',
        },
      ],
      verifyPassword: async () => false,
      updatePassword: async () => undefined,
      setCollaboratorActive: async () => undefined,
    };

    const sync = new SyncUsersFromErpUseCase(directory, users, ids);
    const result = await sync.execute();
    expect(result.created).toBe(1);
    expect(result.blocked).toBe(1);
    expect(store.get('orphan-1')?.status).toBe('blocked');
    expect([...store.values()].some((u) => u.email === 'maria@giganet.local')).toBe(
      true,
    );
  });
});
