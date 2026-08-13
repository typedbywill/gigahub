import type { UpdateUserAvatarResponseDto } from '@gigahub/shared/contracts';
import { userId } from '@gigahub/shared/kernel';
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

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export interface SetUserAvatarCommand {
  actorUserId: string;
  userId: string;
  file: Buffer;
  contentType: string;
}

export class SetUserAvatarUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort,
    private readonly avatarBucket: string,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    command: SetUserAvatarCommand,
  ): Promise<UpdateUserAvatarResponseDto> {
    await this.access.assertCan(command.actorUserId, 'users:update');

    const contentType = command.contentType.toLowerCase().split(';')[0]?.trim();
    if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      throw new ApplicationError(
        ApplicationErrorCodes.ValidationError,
        'Avatar must be jpeg, png, or webp',
        { contentType: command.contentType },
      );
    }
    if (command.file.byteLength === 0 || command.file.byteLength > MAX_AVATAR_BYTES) {
      throw new ApplicationError(
        ApplicationErrorCodes.ValidationError,
        'Avatar must be between 1 byte and 2MB',
        { size: command.file.byteLength },
      );
    }

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    const extension =
      contentType === 'image/png'
        ? 'png'
        : contentType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const objectKey = `avatars/${user.id}/${this.ids.generate()}.${extension}`;
    const previousKey = user.avatarObjectKey;

    await this.storage.uploadFile(
      this.avatarBucket,
      objectKey,
      command.file,
      contentType,
    );

    user.setAvatar(objectKey);
    await this.users.save(user);

    if (previousKey && previousKey !== objectKey) {
      try {
        await this.storage.deleteFile(this.avatarBucket, previousKey);
      } catch {
        // Best-effort cleanup of the previous object.
      }
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

export interface ClearUserAvatarCommand {
  actorUserId: string;
  userId: string;
}

export class ClearUserAvatarUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly grants: GrantRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly storage: ObjectStoragePort,
    private readonly avatarBucket: string,
  ) {}

  async execute(
    command: ClearUserAvatarCommand,
  ): Promise<UpdateUserAvatarResponseDto> {
    await this.access.assertCan(command.actorUserId, 'users:update');

    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }

    const previousKey = user.avatarObjectKey;
    if (!previousKey) {
      return {
        user: await buildUserDetailDto(user, {
          roles: this.roles,
          grants: this.grants,
          storage: this.storage,
          avatarBucket: this.avatarBucket,
        }),
      };
    }

    user.clearAvatar();
    await this.users.save(user);

    try {
      await this.storage.deleteFile(this.avatarBucket, previousKey);
    } catch {
      // Best-effort cleanup.
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
