import type {
  MyScheduleQueryDto,
  WorkOrderSummaryDto,
} from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type UserLookupPort,
  type WorkOrderQueryRepository,
  ApplicationError,
  ApplicationErrorCodes,
} from './ports';

export class GetMyScheduleUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly userLookup: UserLookupPort,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    query: MyScheduleQueryDto;
  }): Promise<WorkOrderSummaryDto[]> {
    await this.access.assertCan(input.actorUserId, 'work-order:read');

    const actor = await this.userLookup.findActorUser(input.actorUserId);
    if (!actor) {
      throw new ApplicationError(
        ApplicationErrorCodes.UserNotFound,
        'Authenticated user not found',
      );
    }

    return this.workOrderQuery.getMySchedule(actor, input.query);
  }
}
