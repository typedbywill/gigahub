import { Credential, Session, User } from '@gigahub/domain/identity';
import { LoginUseCase } from './login.use-case';
import { RenewTokenUseCase } from './renew-token.use-case';
import {
  ApplicationErrorCodes,
  type CredentialRepository,
  type SessionRepository,
  type UserRepository,
} from './ports';

describe('LoginUseCase and RenewTokenUseCase', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  function build() {
    const user = User.create({
      id: 'usr-1',
      email: 'admin@gigahub.local',
      name: 'Admin',
      status: 'active',
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

    return {
      user,
      stored: () => stored,
      sessions,
      login: new LoginUseCase(
        users,
        credentials,
        sessions,
        hasher,
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
    };
  }

  it('logs in and renews with rotation', async () => {
    const { login, renew } = build();
    const logged = await login.execute({
      email: 'Admin@gigahub.local',
      password: 'secret',
    });
    expect(logged.accessToken).toBe('access-token');
    expect(logged.user.email).toBe('admin@gigahub.local');

    const renewed = await renew.execute({ refreshToken: logged.refreshToken });
    expect(renewed.refreshToken).not.toBe(logged.refreshToken);
    expect(renewed.accessToken).toBe('access-token');
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
});
