import { DomainEventTypes, type StartExecutionDto } from '@gigahub/shared/contracts';
import { geoPoint } from '@gigahub/shared/kernel';
import { WorkOrder } from '@gigahub/domain/work-order';
import {
  type AccessPort,
  type EventPublisherPort,
  type UserLookupPort,
  type WorkOrderCommandRepository,
  type WorkOrderQueryRepository,
  ApplicationError,
  ApplicationErrorCodes,
} from './ports';

export class StartWorkOrderExecutionUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly workOrderCommand: WorkOrderCommandRepository,
    private readonly userLookup: UserLookupPort,
    private readonly access: AccessPort,
    private readonly eventPublisher?: EventPublisherPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    workOrderId: string;
    body: StartExecutionDto;
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

    const domainEntity = WorkOrder.create({
      id: current.id,
      idErp: current.idErp,
      status: current.status,
      customerId: current.customerId,
      technicianId: current.technicianId,
      location: current.location
        ? geoPoint(current.location.latitude, current.location.longitude)
        : undefined,
    });

    // Inicia execução (valida status `DS` -> `EX`, motivo >= 11 chars e duração > 0)
    domainEntity.startExecution({
      estimatedDurationMinutes: input.body.estimatedDurationMinutes,
      reason: input.body.reason,
    });

    const loc = input.body.location
      ? geoPoint(input.body.location.latitude, input.body.location.longitude)
      : undefined;

    await this.workOrderCommand.startExecution(current.idErp, {
      technician: actor,
      estimatedDurationMinutes: input.body.estimatedDurationMinutes,
      reason: input.body.reason,
      location: loc,
    });

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        DomainEventTypes.WorkOrderExecutionStarted,
        {
          workOrderId: current.id,
          idErp: current.idErp,
          status: 'EX',
          technicianId: actor.userId,
          estimatedDurationMinutes: input.body.estimatedDurationMinutes,
          reason: input.body.reason,
          location: input.body.location,
          timestamp: new Date().toISOString(),
        },
        { id: actor.userId, type: 'user' },
      );
    }

    return {
      success: true,
      status: 'EX',
    };
  }
}
