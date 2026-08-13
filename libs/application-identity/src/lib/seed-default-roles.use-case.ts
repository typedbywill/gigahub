import { DEFAULT_ROLE_SEEDS, Role } from '@gigahub/domain/identity';
import type { IdGenerator, RoleRepository } from './ports';

export interface SeedDefaultRolesResult {
  created: number;
  skipped: number;
}

export class SeedDefaultRolesUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly ids: IdGenerator,
  ) {}

  async execute(): Promise<SeedDefaultRolesResult> {
    let created = 0;
    let skipped = 0;

    for (const seed of DEFAULT_ROLE_SEEDS) {
      const existing = await this.roles.findBySlug(seed.slug);
      if (existing) {
        skipped += 1;
        continue;
      }
      const role = Role.create({
        id: this.ids.generate(),
        slug: seed.slug,
        name: seed.name,
        permissionIds: [...seed.permissionIds],
      });
      await this.roles.save(role);
      created += 1;
    }

    return { created, skipped };
  }
}
