import { DEFAULT_ROLE_SEEDS, Role } from '@gigahub/domain/identity';
import type { IdGenerator, RoleRepository } from './ports';

export interface SeedDefaultRolesResult {
  created: number;
  skipped: number;
  updated: number;
}

/**
 * Idempotent bootstrap: creates missing seed roles and merges any new catalog
 * permissions from the seed into existing roles (never removes custom grants).
 */
export class SeedDefaultRolesUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(): Promise<SeedDefaultRolesResult> {
    let created = 0;
    let skipped = 0;
    let updated = 0;

    for (const seed of DEFAULT_ROLE_SEEDS) {
      const existing = await this.roles.findBySlug(seed.slug);
      if (!existing) {
        const role = Role.create({
          id: this.ids.generate(),
          slug: seed.slug,
          name: seed.name,
          permissionIds: [...seed.permissionIds],
        });
        await this.roles.save(role);
        created += 1;
        continue;
      }

      const before = new Set(existing.permissionIds);
      let changed = false;
      for (const permissionId of seed.permissionIds) {
        if (!before.has(permissionId)) {
          existing.addPermission(permissionId);
          changed = true;
        }
      }
      if (changed) {
        await this.roles.save(existing);
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    return { created, skipped, updated };
  }
}
