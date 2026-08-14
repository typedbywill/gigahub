import { type UserId, userId } from '@gigahub/shared/kernel';
import type {
  AccessPort,
  DemandCountsResult,
  DemandRepository,
} from './ports';

export class GetDemandCountsUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
  ): Promise<DemandCountsResult> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:read');

    return this.demandRepo.countByViews(actorId);
  }
}
