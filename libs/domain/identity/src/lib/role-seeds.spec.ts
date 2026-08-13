import { Role } from './role';
import { DEFAULT_ROLE_SEEDS } from './role-seeds';

describe('DEFAULT_ROLE_SEEDS', () => {
  it('defines the standard product roles with known permissions', () => {
    expect(DEFAULT_ROLE_SEEDS.map((seed) => seed.slug)).toEqual([
      'tecnico',
      'supervisor',
      'financeiro',
      'admin-acesso',
    ]);

    for (const [index, seed] of DEFAULT_ROLE_SEEDS.entries()) {
      const role = Role.create({
        id: `seed-role-${index}`,
        slug: seed.slug,
        name: seed.name,
        permissionIds: [...seed.permissionIds],
      });
      expect(role.permissionIds).toEqual(seed.permissionIds);
      expect(() => role.assertAssignable()).not.toThrow();
    }
  });

  it('gives admin-acesso access and user-control permissions', () => {
    const admin = DEFAULT_ROLE_SEEDS.find(
      (seed) => seed.slug === 'admin-acesso',
    );
    expect(admin?.permissionIds).toEqual(
      expect.arrayContaining([
        'access:manage',
        'users:read',
        'users:update',
        'users:inactivate',
      ]),
    );
  });

  it('gives supervisor users:read', () => {
    const supervisor = DEFAULT_ROLE_SEEDS.find(
      (seed) => seed.slug === 'supervisor',
    );
    expect(supervisor?.permissionIds).toContain('users:read');
  });
});
