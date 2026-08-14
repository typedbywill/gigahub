import { demandId, type UserId, userId } from '@gigahub/shared/kernel';
import {
  DomainEventTypes,
  type DemandDto,
  type UpdateDemandValuesInputDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandRepository,
  type EventPublisherPort,
  type SubjectRepository,
} from './ports';
import { toDemandDto } from './mappers';

export class UpdateDemandValuesUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly access: AccessPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
    input: UpdateDemandValuesInputDto,
  ): Promise<DemandDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:reply');

    const demand = await this.demandRepo.findById(demandId(id));
    if (!demand) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Demand "${id}" not found`,
        { demandId: id },
      );
    }

    const subject = await this.subjectRepo.findById(demand.subjectId);
    if (!subject) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Subject "${demand.subjectId}" not found`,
        { subjectId: String(demand.subjectId) },
      );
    }

    demand.updateValues(input.values, subject);
    await this.demandRepo.save(demand);

    await this.eventPublisher.publish(
      DomainEventTypes.DemandValuesUpdated,
      {
        demandId: String(demand.id),
        queueId: String(demand.queueId),
        subjectId: String(demand.subjectId),
        customerIds: demand.customerIds.map(String),
        assignedAgentId: demand.assignedAgentId
          ? String(demand.assignedAgentId)
          : undefined,
        status: demand.status,
      },
      { id: String(actorId), type: 'user' },
    );

    return toDemandDto(demand);
  }
}
