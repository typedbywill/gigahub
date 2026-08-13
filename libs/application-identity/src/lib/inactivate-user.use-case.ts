import type { InactivateUserResponseDto } from '@gigahub/shared/contracts';
import { userId } from '@gigahub/shared/kernel';
import { buildUserDetailDto } from './build-user-detail';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type Clock,
  type ErpUserDirectory,
  type GrantRepository,
  type ObjectStoragePort,
  type RoleRepository,
  type SessionRepository,
  type UserRepository,
} from './ports';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface InactivateUserCommand {
  actorUserId: string;
  userId: string;
}

/**
 * Inactivates a user in IXC (when linked) then locally, and revokes all sessions.
 * Idempotent when the user is already blocked.
 */
export class InactivateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionRepository,
    private readonly erp: ErpUserDirectory | null,
    private readonly clock: Clock,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort | null,
    private readonly avatarBucket: string,
  ) {}

  async execute(
    command: InactivateUserCommand,
  ): Promise<InactivateUserResponseDto> {
    await this.access.assertCan(command.actorUserId, 'users:inactivate');

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    const detailDeps = {
      roles: this.roles,
      grants: this.grants,
      storage: this.storage,
      avatarBucket: this.avatarBucket,
    };

    if (!user.isActive()) {
      return { user: await buildUserDetailDto(user, detailDeps) };
    }

    if (user.hasErpLink()) {
      if (!this.erp) {
        throw new ApplicationError(
          ApplicationErrorCodes.ErpUnavailable,
          'ERP directory is not configured',
        );
      }
      try {
        await this.erp.setCollaboratorActive(user.idErp!, false);
      } catch {
        throw new ApplicationError(
          ApplicationErrorCodes.ErpUnavailable,
          'Failed to inactivate user in ERP',
          { idErp: user.idErp },
        );
      }
    }

    user.block();
    await this.users.save(user);
    await this.sessions.revokeAllForUser(user.id, this.clock.now());

    return { user: await buildUserDetailDto(user, detailDeps) };
  }
}
