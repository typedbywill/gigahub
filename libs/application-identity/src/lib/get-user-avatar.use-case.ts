import { userId } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type ObjectStoragePort,
  type UserRepository,
} from './ports';

export interface GetUserAvatarCommand {
  userId: string;
}

export interface GetUserAvatarResult {
  body: Buffer;
  contentType: string;
}

function contentTypeFromKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

export class GetUserAvatarUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: ObjectStoragePort,
    private readonly avatarBucket: string,
  ) {}

  async execute(command: GetUserAvatarCommand): Promise<GetUserAvatarResult> {
    const user = await this.users.findById(userId(command.userId));
    if (!user?.avatarObjectKey) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'Avatar not found',
        { userId: command.userId },
      );
    }

    const objectKey = user.avatarObjectKey;
    const file = await this.storage.getFile(this.avatarBucket, objectKey);

    return {
      body: file.body,
      contentType: file.contentType ?? contentTypeFromKey(objectKey),
    };
  }
}
