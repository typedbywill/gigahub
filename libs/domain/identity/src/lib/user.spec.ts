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

  it('creates without ERP link', () => {
    const user = active();
    expect(user.hasErpLink()).toBe(false);
    expect(user.idErp).toBeUndefined();
    expect(user.idErpEmployee).toBeUndefined();
  });

  it('creates with both ERP ids', () => {
    const user = active({ idErp: '10', idErpEmployee: '20' });
    expect(user.hasErpLink()).toBe(true);
    expect(user.idErp).toBe('10');
    expect(user.idErpEmployee).toBe('20');
  });

  it('rejects create with only one ERP id', () => {
    expect(() => active({ idErp: '10' })).toThrow(DomainError);
    expect(() => active({ idErpEmployee: '20' })).toThrow(DomainError);
  });

  it('links and unlinks ERP', () => {
    const user = active();
    user.linkErp({ idErp: '100', idErpEmployee: '200' });
    expect(user.hasErpLink()).toBe(true);
    expect(user.idErp).toBe('100');
    expect(user.idErpEmployee).toBe('200');

    user.unlinkErp();
    expect(user.hasErpLink()).toBe(false);
    expect(user.idErp).toBeUndefined();
    expect(user.idErpEmployee).toBeUndefined();
  });

  it('rejects empty ERP ids on link', () => {
    const user = active();
    expect(() => user.linkErp({ idErp: '  ', idErpEmployee: '200' })).toThrow();
    expect(() => user.linkErp({ idErp: '100', idErpEmployee: '' })).toThrow();
  });

  it('syncs professional profile without changing auth status', () => {
    const user = active({ status: 'active' });
    user.syncProfessionalProfile({
      name: 'Maria Tecnica',
      jobTitle: 'Tecnico',
      cashboxId: '5',
      warehouseId: '8',
      planningId: '3',
    });
    expect(user.name).toBe('Maria Tecnica');
    expect(user.jobTitle).toBe('Tecnico');
    expect(user.cashboxId).toBe('5');
    expect(user.warehouseId).toBe('8');
    expect(user.planningId).toBe('3');
    expect(user.status).toBe('active');
  });

  it('applyErpActive blocks and reactivates', () => {
    const user = active();
    user.applyErpActive(false);
    expect(user.status).toBe('blocked');
    user.applyErpActive(true);
    expect(user.status).toBe('active');
  });

  it('defaults authorizationVersion to 0 and bumps on change', () => {
    const user = active();
    expect(user.authorizationVersion).toBe(0);
    user.bumpAuthorizationVersion();
    expect(user.authorizationVersion).toBe(1);
    user.bumpAuthorizationVersion();
    expect(user.authorizationVersion).toBe(2);
  });

  it('rejects negative authorizationVersion on rehydrate', () => {
    expect(() =>
      User.fromSnapshot({
        ...active().toSnapshot(),
        authorizationVersion: -1,
      }),
    ).toThrow(DomainError);
  });
});
