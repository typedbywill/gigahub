import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  PERMISSION_CATALOG,
  PERMISSION_GROUPS,
  getPermission,
  listPermissions,
  listPermissionsByGroup,
  permissionId,
} from './permission';

describe('permission catalog', () => {
  it('brands a known permission id', () => {
    expect(permissionId('work-order:read')).toBe('work-order:read');
  });

  it('rejects unknown permission ids', () => {
    expect(() => permissionId('unknown:read')).toThrow(DomainError);
    try {
      permissionId('unknown:read');
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.UnknownPermission,
      });
    }
  });

  it('rejects empty permission ids', () => {
    expect(() => permissionId('   ')).toThrow();
  });

  it('returns a copy of a permission definition', () => {
    const definition = getPermission('work-order:read');
    expect(definition).toEqual({
      id: 'work-order:read',
      title: 'Ler ordens de serviço',
      description: 'Mostrar informações das ordens de serviço',
      group: 'work-order',
    });
    definition.title = 'mutated';
    expect(getPermission('work-order:read').title).toBe(
      'Ler ordens de serviço',
    );
  });

  it('lists all permissions', () => {
    expect(listPermissions()).toHaveLength(PERMISSION_CATALOG.length);
  });

  it('lists permissions by group', () => {
    const workOrders = listPermissionsByGroup('work-order');
    expect(workOrders.every((entry) => entry.group === 'work-order')).toBe(
      true,
    );
    expect(workOrders.map((entry) => entry.id)).toEqual([
      'work-order:read',
      'work-order:execute',
      'work-order:review',
    ]);
  });

  it('exposes unique permission groups', () => {
    expect(PERMISSION_GROUPS).toEqual([
      'work-order',
      'customer',
      'care',
      'finance',
      'telemetry',
      'gamification',
      'users',
      'access',
    ]);
  });

  it('lists user-control permissions', () => {
    expect(listPermissionsByGroup('users').map((entry) => entry.id)).toEqual([
      'users:read',
      'users:update',
      'users:inactivate',
    ]);
  });
});
