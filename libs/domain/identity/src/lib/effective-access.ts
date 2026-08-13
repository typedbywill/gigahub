import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';
import { GrantPermission, GrantRole } from './grant';
import {
  type PermissionDefinition,
  type PermissionId,
  getPermission,
  permissionId,
} from './permission';
import { Role } from './role';

export type EffectiveAccessSource =
  | { kind: 'role'; roleId: string; slug: string }
  | { kind: 'grant'; grantId: string };

export interface PermissionExplanation {
  allowed: boolean;
  sources: EffectiveAccessSource[];
}

export type ResolveEffectiveAccessInput = {
  roles: Role[];
  roleGrants: GrantRole[];
  permissionGrants: GrantPermission[];
  at?: Date;
};

export class EffectiveAccess {
  private constructor(
    private readonly effectiveIds: ReadonlySet<PermissionId>,
    private readonly sourcesByPermission: ReadonlyMap<
      PermissionId,
      EffectiveAccessSource[]
    >,
  ) {}

  static resolve(input: ResolveEffectiveAccessInput): EffectiveAccess {
    const at = input.at ?? new Date();
    const rolesById = new Map(input.roles.map((role) => [role.id, role]));
    const effectiveIds = new Set<PermissionId>();
    const sourcesByPermission = new Map<PermissionId, EffectiveAccessSource[]>();

    const pushSource = (
      id: PermissionId,
      source: EffectiveAccessSource,
    ): void => {
      effectiveIds.add(id);
      const existing = sourcesByPermission.get(id) ?? [];
      existing.push(source);
      sourcesByPermission.set(id, existing);
    };

    for (const grant of input.roleGrants) {
      if (!grant.isEffective(at)) {
        continue;
      }
      const role = rolesById.get(grant.roleId);
      if (!role || !role.isActive()) {
        continue;
      }
      for (const id of role.permissionIds) {
        pushSource(id, {
          kind: 'role',
          roleId: role.id,
          slug: role.slug,
        });
      }
    }

    for (const grant of input.permissionGrants) {
      if (!grant.isEffective(at)) {
        continue;
      }
      pushSource(grant.permissionId, {
        kind: 'grant',
        grantId: grant.id,
      });
    }

    return new EffectiveAccess(effectiveIds, sourcesByPermission);
  }

  can(id: PermissionId | string): boolean {
    const resolved = typeof id === 'string' ? permissionId(id) : id;
    return this.effectiveIds.has(resolved);
  }

  assertCan(id: PermissionId | string): void {
    const resolved = typeof id === 'string' ? permissionId(id) : id;
    if (!this.can(resolved)) {
      throw new DomainError(
        DomainErrorCodes.PermissionDenied,
        `Permission denied: ${resolved}`,
        { permissionId: resolved },
      );
    }
  }

  ids(): ReadonlySet<PermissionId> {
    return this.effectiveIds;
  }

  definitions(): PermissionDefinition[] {
    return [...this.effectiveIds].map((id) => getPermission(id));
  }

  explain(id: PermissionId | string): PermissionExplanation {
    const resolved = typeof id === 'string' ? permissionId(id) : id;
    const sources = this.sourcesByPermission.get(resolved) ?? [];
    return {
      allowed: sources.length > 0,
      sources: [...sources],
    };
  }
}
