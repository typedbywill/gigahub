import type { PaginatedUsersDto } from '@gigahub/shared/contracts';
import type {
  ObjectStoragePort,
  UserListQuery,
  UserRepository,
} from './ports';
import { resolveAvatarUrl, toUserListItemDto } from './mappers';

export type ListUsersCommand = UserListQuery;

export class ListUsersUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly storage: ObjectStoragePort | null = null,
    private readonly avatarBucket = 'gigahub',
  ) {}

  async execute(command: ListUsersCommand): Promise<PaginatedUsersDto> {
    const page = Math.max(1, command.page);
    const pageSize = Math.min(100, Math.max(1, command.pageSize));
    const result = await this.users.list({
      q: command.q?.trim() || undefined,
      status: command.status ?? 'all',
      erpLinked: command.erpLinked,
      page,
      pageSize,
    });
    const items = await Promise.all(
      result.items.map(async (user) =>
        toUserListItemDto(
          user,
          await resolveAvatarUrl(user, this.storage, this.avatarBucket),
        ),
      ),
    );
    return {
      items,
      total: result.total,
      page,
      pageSize,
    };
  }
}
