import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { Role } from './role';

describe('Role', () => {
  function createRole(overrides?: Partial<Parameters<typeof Role.create>[0]>) {
    return Role.create({
      id: 'role-1',
      slug: 'tecnico',
      name: 'Técnico',
      permissionIds: ['work-order:read', 'work-order:execute'],
      ...overrides,
    });
  }

  it('creates an active role with unique known permissions', () => {
    const role = createRole({
      permissionIds: [
        'work-order:read',
        'work-order:execute',
        'work-order:read',
      ],
    });
    expect(role.status).toBe('active');
    expect(role.permissionIds).toEqual([
      'work-order:read',
      'work-order:execute',
    ]);
    expect(role.has('work-order:read')).toBe(true);
  });

  it('migrates legacy care permissions to demand permissions in snapshots', () => {
    const role = Role.fromSnapshot({
      id: 'role-1' as any,
      slug: 'supervisor',
      name: 'Supervisor',
      permissionIds: ['care:inbox:read' as any, 'work-order:read' as any],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(role.permissionIds).toEqual(['demand:read', 'work-order:read']);
  });

  it('normalizes slug to kebab-case and rejects invalid slugs', () => {
    expect(createRole({ slug: 'Admin-Acesso' }).slug).toBe('admin-acesso');
    expect(() => createRole({ slug: 'Admin Acesso' })).toThrow(DomainError);
  });

  it('rejects unknown permissions', () => {
    expect(() => createRole({ permissionIds: ['nope:read'] })).toThrow(
      DomainError,
    );
  });

  it('replaces, adds and removes permissions', () => {
    const role = createRole();
    role.replacePermissions(['work-order:read', 'work-order:review']);
    expect(role.permissionIds).toEqual([
      'work-order:read',
      'work-order:review',
    ]);

    role.addPermission('work-order:execute');
    expect(role.has('work-order:execute')).toBe(true);

    role.removePermission('work-order:read');
    expect(role.has('work-order:read')).toBe(false);
  });

  it('renames the role', () => {
    const role = createRole();
    role.rename('Técnico de campo');
    expect(role.name).toBe('Técnico de campo');
  });

  it('archives and refuses assignment while archived', () => {
    const role = createRole();
    role.archive();
    expect(role.status).toBe('archived');
    expect(() => role.assertAssignable()).toThrow(DomainError);
    try {
      role.assertAssignable();
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.RoleNotAssignable,
      });
    }

    role.activate();
    expect(() => role.assertAssignable()).not.toThrow();
  });
});
