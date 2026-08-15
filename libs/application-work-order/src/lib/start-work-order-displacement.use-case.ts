import { DomainEventTypes, type StartDisplacementDto } from '@gigahub/shared/contracts';
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

export class StartWorkOrderDisplacementUseCase {
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
    body: StartDisplacementDto;
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

    // Validação com a entidade de domínio
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

    // Inicia deslocamento (valida invariantes e lança DomainError se status for inválido)
    domainEntity.startDisplacement();

    const loc = input.body.location
      ? geoPoint(input.body.location.latitude, input.body.location.longitude)
      : undefined;

    await this.workOrderCommand.startDisplacement(current.idErp, actor, loc);

    if (this.eventPublisher) {
      await this.eventPublisher.publish(
        DomainEventTypes.WorkOrderDisplacementStarted,
        {
          workOrderId: current.id,
          idErp: current.idErp,
          status: 'DS',
          technicianId: actor.userId,
          location: input.body.location,
          timestamp: new Date().toISOString(),
        },
        { id: actor.userId, type: 'user' },
      );
    }

    return {
      success: true,
      status: 'DS',
    };
  }
}
