import type { PaginatedUsersDto } from '@gigahub/shared/contracts';
import type { UserListQuery, UserRepository } from './ports';
import { toUserListItemDto } from './mappers';

export type ListUsersCommand = UserListQuery;

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

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
    return {
      items: result.items.map(toUserListItemDto),
      total: result.total,
      page,
      pageSize,
    };
  }
}
