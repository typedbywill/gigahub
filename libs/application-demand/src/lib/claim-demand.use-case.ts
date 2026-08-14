import { demandId, type UserId, userId } from '@gigahub/shared/kernel';
import { DomainEventTypes, type DemandDto } from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandRepository,
  type EventPublisherPort,
} from './ports';
import { toDemandDto } from './mappers';

export class ClaimDemandUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly access: AccessPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
  ): Promise<DemandDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:claim');

    const demand = await this.demandRepo.findById(demandId(id));
    if (!demand) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Demand "${id}" not found`,
        { demandId: id },
      );
    }

    demand.claim(String(actorId));
    await this.demandRepo.save(demand);

    await this.eventPublisher.publish(
      DomainEventTypes.DemandClaimed,
      {
        demandId: String(demand.id),
        queueId: String(demand.queueId),
        subjectId: String(demand.subjectId),
        customerIds: demand.customerIds.map(String),
        assignedAgentId: String(actorId),
        status: demand.status,
      },
      { id: String(actorId), type: 'user' },
    );

    return toDemandDto(demand);
  }
}
