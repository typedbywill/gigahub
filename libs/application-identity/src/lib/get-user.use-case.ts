import type { UserDetailDto } from '@gigahub/shared/contracts';
import { userId } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type UserRepository,
} from './ports';
import { toUserDetailDto } from './mappers';

export interface GetUserCommand {
  userId: string;
}

export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(command: GetUserCommand): Promise<UserDetailDto> {
    const user = await this.users.findById(userId(command.userId));
    if (!user) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'User not found',
        { userId: command.userId },
      );
    }
    return toUserDetailDto(user);
  }
}
