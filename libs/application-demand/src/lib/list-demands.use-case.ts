import { type UserId, userId } from '@gigahub/shared/kernel';
import type { DemandDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type DemandListQuery,
  type DemandRepository,
} from './ports';
import { toDemandDto } from './mappers';

export interface PaginatedDemandsDto {
  items: DemandDto[];
  total: number;
}

export class ListDemandsUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    query: DemandListQuery = {},
  ): Promise<PaginatedDemandsDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;

    if (query.view === 'all') {
      await this.access.assertCan(actorId, 'demand:read:all');
    } else {
      await this.access.assertCan(actorId, 'demand:read');
    }

    const result = await this.demandRepo.list({
      ...query,
      actorUserId: actorId,
    });

    return {
      items: result.items.map(toDemandDto),
      total: result.total,
    };
  }
}
