import type { RescheduleWorkOrderDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type UserLookupPort,
  type WorkOrderCommandRepository,
  type WorkOrderQueryRepository,
  ApplicationError,
  ApplicationErrorCodes,
} from './ports';

export class RescheduleWorkOrderUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly workOrderCommand: WorkOrderCommandRepository,
    private readonly userLookup: UserLookupPort,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    workOrderId: string;
    body: RescheduleWorkOrderDto;
  }): Promise<{ success: boolean; status: string }> {
    await this.access.assertCan(input.actorUserId, 'work-order:execute');

    const actor = await this.userLookup.findActorUser(input.actorUserId);
    if (!actor) {
      throw new ApplicationError(
        ApplicationErrorCodes.UserNotFound,
        'Authenticated user not found',
      );
    }

    const current = await this.workOrderQuery.findById(input.workOrderId);
    if (!current) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Ordem de serviço ${input.workOrderId} não encontrada`,
      );
    }

    await this.workOrderCommand.reschedule(current.idErp, {
      technician: actor,
      newDate: input.body.newDate,
      reason: input.body.reason,
    });

    return {
      success: true,
      status: 'RAG',
    };
  }
}
