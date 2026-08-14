import type { UserDetailDto } from '@gigahub/shared/contracts';
import { userId } from '@gigahub/shared/kernel';
import { buildUserDetailDto } from './build-user-detail';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type GrantRepository,
  type ObjectStoragePort,
  type RoleRepository,
  type UserRepository,
} from './ports';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface GetUserCommand {
  actorUserId: string;
  userId: string;
}

export class GetUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort | null,
    private readonly avatarBucket: string,
  ) {}

  async execute(command: GetUserCommand): Promise<UserDetailDto> {
    if (command.actorUserId !== command.userId) {
      await this.access.assertCan(command.actorUserId, 'users:read');
    }

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }
    return buildUserDetailDto(user, {
      roles: this.roles,
      grants: this.grants,
      storage: this.storage,
      avatarBucket: this.avatarBucket,
    });
  }
}
