import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type UserLookupPort,
  type WorkOrderQueryRepository,
} from './ports';

export class ListActiveWorkOrdersUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly userLookup: UserLookupPort,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    onlyMine?: boolean;
  }): Promise<WorkOrderSummaryDto[]> {
    await this.access.assertCan(input.actorUserId, 'work-order:read');

    let actor = undefined;
    if (input.onlyMine) {
      actor = (await this.userLookup.findActorUser(input.actorUserId)) ?? undefined;
    }

    return this.workOrderQuery.listActive(actor);
  }
}
