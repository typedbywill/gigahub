import { DomainEventTypes, type CompleteWorkOrderDto } from '@gigahub/shared/contracts';
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

export class CompleteWorkOrderUseCase {
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
    body: CompleteWorkOrderDto;
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

    const technicianLocation = geoPoint(
      input.body.location.latitude,
      input.body.location.longitude,
    );

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

    // Se a OS tiver localização cadastrada, valida o raio de 300m
    if (domainEntity.location) {
      domainEntity.requestCompletion(technicianLocation);
    }

    await this.workOrderCommand.complete(current.idErp, {
      technician: actor,
      location: technicianLocation,
      reason: input.body.reason,
      answers: input.body.answers,
    });

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        DomainEventTypes.WorkOrderCompleted,
        {
          workOrderId: current.id,
          idErp: current.idErp,
          status: 'F',
          technicianId: actor.userId,
          timestamp: new Date().toISOString(),
        },
        { id: actor.userId, type: 'user' },
      );
    }

    return {
      success: true,
      status: 'F',
    };
  }
}
