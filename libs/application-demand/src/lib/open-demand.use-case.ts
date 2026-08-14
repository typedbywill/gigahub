import { Demand } from '@gigahub/domain/demand';
import {
  type DemandQueueId,
  demandQueueId,
  subjectId,
  type UserId,
  userId,
} from '@gigahub/shared/kernel';
import {
  DomainEventTypes,
  type DemandDto,
  type OpenDemandInputDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandQueueRepository,
  type DemandRepository,
  type EventPublisherPort,
  type IdGeneratorPort,
  type SubjectRepository,
} from './ports';
import { toDemandDto } from './mappers';

export class OpenDemandUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly queueRepo: DemandQueueRepository,
    private readonly access: AccessPort,
    private readonly eventPublisher: EventPublisherPort,
    private readonly idGenerator: IdGeneratorPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    input: OpenDemandInputDto,
  ): Promise<DemandDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:open');

    const subject = await this.subjectRepo.findById(
      subjectId(input.subjectId),
    );
    if (!subject) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Subject "${input.subjectId}" not found`,
        { subjectId: input.subjectId },
      );
    }

    const targetQueueIdStr =
      input.queueId ?? (subject.defaultQueueId ? String(subject.defaultQueueId) : undefined);
    if (!targetQueueIdStr) {
      throw new ApplicationError(
        ApplicationErrorCodes.ValidationError,
        'No queue specified and subject does not have a default queue',
        { subjectId: input.subjectId },
      );
    }

    const queue = await this.queueRepo.findById(
      demandQueueId(targetQueueIdStr) as DemandQueueId,
    );
    if (!queue) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Queue "${targetQueueIdStr}" not found`,
        { queueId: targetQueueIdStr },
      );
    }

    const id = this.idGenerator.generate();
    const demand = Demand.open(
      {
        id,
        queueId: targetQueueIdStr,
        subjectId: input.subjectId,
        title: input.title,
        values: input.values,
        customerIds: input.customerIds,
        openedByUserId: String(actorId),
        assignedAgentId: input.assignedAgentId,
      },
      subject,
      queue,
    );

    await this.demandRepo.save(demand);

    await this.eventPublisher.publish(
      DomainEventTypes.DemandOpened,
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
