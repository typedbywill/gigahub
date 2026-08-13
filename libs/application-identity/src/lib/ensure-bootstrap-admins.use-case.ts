import { GrantRole } from '@gigahub/domain/identity';
import type {
  GrantRepository,
  IdGenerator,
  RoleRepository,
  UserRepository,
} from './ports';

export interface EnsureBootstrapAdminsResult {
  granted: number;
  skipped: number;
  missing: string[];
}

/**
 * Idempotently grants `admin-acesso` to users identified by ERP id.
 * Used for the first operator(s) after sync — no user seed, only grants.
 */
export class EnsureBootstrapAdminsUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly ids: IdGenerator,
    private readonly erpIds: readonly string[],
  ) {}

  async execute(): Promise<EnsureBootstrapAdminsResult> {
    const normalized = [
      ...new Set(
        this.erpIds
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      ),
    ];
    if (normalized.length === 0) {
      return { granted: 0, skipped: 0, missing: [] };
    }

    const adminRole = await this.roles.findBySlug('admin-acesso');
    if (!adminRole || !adminRole.isActive()) {
      return { granted: 0, skipped: 0, missing: normalized };
    }

    let granted = 0;
    let skipped = 0;
    const missing: string[] = [];

    for (const idErp of normalized) {
      const user = await this.users.findByIdErp(idErp);
      if (!user || !user.isActive()) {
        missing.push(idErp);
        continue;
      }

      const roleGrants = await this.grants.listRoleGrantsByUserId(user.id);
      const alreadyHas = roleGrants.some(
        (grant) =>
          grant.isEffective() && String(grant.roleId) === String(adminRole.id),
      );
      if (alreadyHas) {
        skipped += 1;
        continue;
      }

      const grant = GrantRole.create({
        id: this.ids.generate(),
        userId: user.id,
        roleId: adminRole.id,
        grantedByUserId: user.id,
        reason: 'Bootstrap admin-acesso',
      });
      await this.grants.saveRoleGrant(grant);
      user.bumpAuthorizationVersion();
      await this.users.save(user);
      granted += 1;
    }

    return { granted, skipped, missing };
  }
}
