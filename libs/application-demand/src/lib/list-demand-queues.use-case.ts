import { type UserId, userId } from '@gigahub/shared/kernel';
import type { DemandQueueDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type DemandQueueRepository,
} from './ports';
import { toDemandQueueDto } from './mappers';

export class ListDemandQueuesUseCase {
  constructor(
    private readonly queueRepo: DemandQueueRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    activeOnly = false,
  ): Promise<DemandQueueDto[]> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:read');

    const queues = await this.queueRepo.list(activeOnly);
    return queues.map(toDemandQueueDto);
  }
}
