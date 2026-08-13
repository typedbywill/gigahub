import type { InactivateUserResponseDto } from '@gigahub/shared/contracts';
import { userId } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type Clock,
  type ErpUserDirectory,
  type SessionRepository,
  type UserRepository,
} from './ports';
import { toUserDetailDto } from './mappers';

export interface InactivateUserCommand {
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
  ) {}

  async execute(
    command: InactivateUserCommand,
  ): Promise<InactivateUserResponseDto> {
    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    if (!user.isActive()) {
      return { user: toUserDetailDto(user) };
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

    return { user: toUserDetailDto(user) };
  }
}
