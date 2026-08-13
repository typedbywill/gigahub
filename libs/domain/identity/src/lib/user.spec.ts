import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { User } from './user';

describe('User', () => {
  function active(overrides?: Partial<Parameters<typeof User.create>[0]>) {
    return User.create({
      id: 'usr-1',
      email: 'Admin@GigaHub.local',
      name: 'GigaHub Admin',
      status: 'active',
      ...overrides,
    });
  }

  it('normalizes email and allows authentication when active', () => {
    const user = active();
    expect(user.email).toBe('admin@gigahub.local');
    expect(() => user.assertCanAuthenticate()).not.toThrow();
  });

  it('rejects authentication when blocked', () => {
    const user = active({ status: 'blocked' });
    expect(() => user.assertCanAuthenticate()).toThrow(DomainError);
    try {
      user.assertCanAuthenticate();
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.UserCannotAuthenticate,
      });
    }
  });

  it('blocks and reactivates', () => {
    const user = active();
    user.block();
    expect(user.status).toBe('blocked');
    user.activate();
    expect(user.status).toBe('active');
  });
});
