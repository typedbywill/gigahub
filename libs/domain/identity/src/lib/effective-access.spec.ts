import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { EffectiveAccess } from './effective-access';
import { GrantPermission, GrantRole } from './grant';
import { Role } from './role';

describe('EffectiveAccess', () => {
  const at = new Date('2026-08-13T12:00:00.000Z');

  const tecnico = Role.create({
    id: 'role-tecnico',
    slug: 'tecnico',
    name: 'Técnico',
    permissionIds: ['work-order:read', 'work-order:execute'],
  });

  const roleGrant = GrantRole.create({
    id: 'gr-1',
    userId: 'usr-1',
    roleId: tecnico.id,
    grantedByUserId: 'usr-admin',
    createdAt: at,
  });

  const directGrant = GrantPermission.create({
    id: 'gp-1',
    userId: 'usr-1',
    permissionId: 'gamification:adjust',
    grantedByUserId: 'usr-admin',
    reason: 'Ajuste pontual autorizado',
    createdAt: at,
  });

  it('unions role permissions with direct grants', () => {
    const access = EffectiveAccess.resolve({
      roles: [tecnico],
      roleGrants: [roleGrant],
      permissionGrants: [directGrant],
      at,
    });

    expect(access.can('work-order:execute')).toBe(true);
    expect(access.can('gamification:adjust')).toBe(true);
    expect(access.can('access:manage')).toBe(false);
    expect([...access.ids()].sort()).toEqual([
      'gamification:adjust',
      'work-order:execute',
      'work-order:read',
    ]);
  });

  it('ignores inactive role grants and expired direct grants', () => {
    const archived = Role.create({
      id: 'role-old',
      slug: 'legado',
      name: 'Legado',
      permissionIds: ['access:manage'],
      status: 'archived',
    });
    const expired = GrantPermission.create({
      id: 'gp-expired',
      userId: 'usr-1',
      permissionId: 'finance:cashbox:inspect',
      grantedByUserId: 'usr-admin',
      reason: 'Acesso temporário de caixa',
      expiresAt: new Date('2026-08-12T00:00:00.000Z'),
      createdAt: at,
    });

    const access = EffectiveAccess.resolve({
      roles: [archived],
      roleGrants: [
        GrantRole.create({
          id: 'gr-archived',
          userId: 'usr-1',
          roleId: archived.id,
          grantedByUserId: 'usr-admin',
          createdAt: at,
        }),
      ],
      permissionGrants: [expired],
      at,
    });

    expect(access.can('access:manage')).toBe(false);
    expect(access.can('finance:cashbox:inspect')).toBe(false);
  });

  it('explains permission provenance from role and grant', () => {
    const access = EffectiveAccess.resolve({
      roles: [tecnico],
      roleGrants: [roleGrant],
      permissionGrants: [directGrant],
      at,
    });

    expect(access.explain('work-order:read')).toEqual({
      allowed: true,
      sources: [
        {
          kind: 'role',
          roleId: tecnico.id,
          slug: 'tecnico',
        },
      ],
    });
    expect(access.explain('gamification:adjust')).toEqual({
      allowed: true,
      sources: [{ kind: 'grant', grantId: directGrant.id }],
    });
    expect(access.explain('access:manage')).toEqual({
      allowed: false,
      sources: [],
    });
  });

  it('assertCan throws PermissionDenied when missing', () => {
    const access = EffectiveAccess.resolve({
      roles: [tecnico],
      roleGrants: [roleGrant],
      permissionGrants: [],
      at,
    });

    expect(() => access.assertCan('work-order:execute')).not.toThrow();
    expect(() => access.assertCan('access:manage')).toThrow(DomainError);
    try {
      access.assertCan('access:manage');
    } catch (error) {
      expect(error).toMatchObject({
        code: DomainErrorCodes.PermissionDenied,
      });
    }
  });

  it('hydrates definitions from the catalog', () => {
    const access = EffectiveAccess.resolve({
      roles: [tecnico],
      roleGrants: [roleGrant],
      permissionGrants: [],
      at,
    });
    const definitions = access.definitions();
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'work-order:read',
          title: 'Ler ordens de serviço',
          group: 'work-order',
        }),
      ]),
    );
  });
});
