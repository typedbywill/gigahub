import type { UpdateUserResponseDto } from '@gigahub/shared/contracts';
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

export interface UpdateUserProfileCommand {
  actorUserId: string;
  userId: string;
  name?: string;
  email?: string;
}

export class UpdateUserProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort | null,
    private readonly avatarBucket: string,
  ) {}

  async execute(
    command: UpdateUserProfileCommand,
  ): Promise<UpdateUserResponseDto> {
    await this.access.assertCan(command.actorUserId, 'users:update');

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    if (command.email !== undefined) {
      const normalized = command.email.trim().toLowerCase();
      if (normalized !== user.email) {
        const existing = await this.users.findByEmail(normalized);
        if (existing && existing.id !== user.id) {
          throw new ApplicationError(
            ApplicationErrorCodes.Conflict,
            'Email already in use',
            { email: normalized },
          );
        }
        user.changeEmail(command.email);
      }
    }

    if (command.name !== undefined) {
      user.rename(command.name);
    }

    await this.users.save(user);

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
