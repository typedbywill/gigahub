import { GrantRole } from '@gigahub/domain/identity';
import type { ReplaceUserRolesResponseDto } from '@gigahub/shared/contracts';
import { DomainError, roleId, userId } from '@gigahub/shared/kernel';
import { buildUserDetailDto } from './build-user-detail';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type GrantRepository,
  type IdGenerator,
  type ObjectStoragePort,
  type RoleRepository,
  type UserRepository,
} from './ports';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface ReplaceUserRolesCommand {
  actorUserId: string;
  userId: string;
  roleIds: string[];
  grantedByUserId: string;
}

export class ReplaceUserRolesUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort | null,
    private readonly avatarBucket: string,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    command: ReplaceUserRolesCommand,
  ): Promise<ReplaceUserRolesResponseDto> {
    await this.access.assertCan(command.actorUserId, 'access:manage');

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    const desiredIds = [...new Set(command.roleIds.map((id) => roleId(id)))];
    const desiredRoles = [];
    for (const id of desiredIds) {
      const role = await this.roles.findById(id);
      if (!role) {
        throw new ApplicationError(
          ApplicationErrorCodes.NotFound,
          'Role not found',
          { roleId: id },
        );
      }
      try {
        role.assertAssignable();
      } catch (error) {
        if (error instanceof DomainError) {
          throw new ApplicationError(
            ApplicationErrorCodes.ValidationError,
            error.message,
            error.details,
          );
        }
        throw error;
      }
      desiredRoles.push(role);
    }

    const existingGrants = await this.grants.listRoleGrantsByUserId(user.id);
    const effectiveGrants = existingGrants.filter((grant) => grant.isEffective());
    const desiredSet = new Set(desiredIds.map((id) => String(id)));
    const effectiveByRole = new Map(
      effectiveGrants.map((grant) => [String(grant.roleId), grant]),
    );

    let changed = false;

    for (const role of desiredRoles) {
      if (!effectiveByRole.has(String(role.id))) {
        const grant = GrantRole.create({
          id: this.ids.generate(),
          userId: user.id,
          roleId: role.id,
          grantedByUserId: command.grantedByUserId,
        });
        await this.grants.saveRoleGrant(grant);
        changed = true;
      }
    }

    for (const grant of effectiveGrants) {
      if (!desiredSet.has(String(grant.roleId))) {
        grant.revoke();
        await this.grants.saveRoleGrant(grant);
        changed = true;
      }
    }

    if (changed) {
      user.bumpAuthorizationVersion();
      await this.users.save(user);
    }

    return {
      user: await buildUserDetailDto(user, {
        roles: this.roles,
        grants: this.grants,
        storage: this.storage,
        avatarBucket: this.avatarBucket,
      }),
    };
  }
}
