import { EffectiveAccess } from '@gigahub/domain/identity';
import {
  DomainError,
  DomainErrorCodes,
  roleId,
  type UserId,
  userId,
} from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type GrantRepository,
  type RoleRepository,
} from './ports';

export class ResolveEffectiveAccess {
  constructor(
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
  ) {}

  async forUser(actorUserId: UserId | string): Promise<EffectiveAccess> {
    const id = typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    const [roleGrants, permissionGrants] = await Promise.all([
      this.grants.listRoleGrantsByUserId(id),
      this.grants.listPermissionGrantsByUserId(id),
    ]);

    const roleIds = [
      ...new Set(
        roleGrants
          .filter((grant) => grant.isEffective())
          .map((grant) => String(grant.roleId)),
      ),
    ];

    const roles = (
      await Promise.all(
        roleIds.map((idValue) => this.roles.findById(roleId(idValue))),
      )
    ).filter((role): role is NonNullable<typeof role> => role !== null);

    return EffectiveAccess.resolve({
      roles,
      roleGrants,
      permissionGrants,
    });
  }

  async permissionIds(actorUserId: UserId | string): Promise<string[]> {
    const access = await this.forUser(actorUserId);
    return [...access.ids()];
  }

  async assertCan(
    actorUserId: UserId | string,
    permission: string,
  ): Promise<void> {
    const access = await this.forUser(actorUserId);
    try {
      access.assertCan(permission);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === DomainErrorCodes.PermissionDenied
      ) {
        throw new ApplicationError(
          ApplicationErrorCodes.PermissionDenied,
          error.message,
          error.details,
        );
      }
      throw error;
    }
  }
}
