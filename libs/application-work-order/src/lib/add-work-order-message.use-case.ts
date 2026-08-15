import type { AddWorkOrderMessageDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type UserLookupPort,
  type WorkOrderCommandRepository,
  type WorkOrderQueryRepository,
  ApplicationError,
  ApplicationErrorCodes,
} from './ports';

export class AddWorkOrderMessageUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly workOrderCommand: WorkOrderCommandRepository,
    private readonly userLookup: UserLookupPort,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    workOrderId: string;
    body: AddWorkOrderMessageDto;
  }): Promise<{ success: boolean }> {
    await this.access.assertCan(input.actorUserId, 'work-order:read');

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

    await this.workOrderCommand.addMessage(current.idErp, {
      authorName: actor.name,
      message: input.body.message,
    });

    return { success: true };
  }
}
