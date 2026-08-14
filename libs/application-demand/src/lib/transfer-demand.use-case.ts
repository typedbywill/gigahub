import {
  type DemandQueueId,
  demandId,
  demandQueueId,
  type UserId,
  userId,
} from '@gigahub/shared/kernel';
import {
  DomainEventTypes,
  type DemandDto,
  type TransferDemandInputDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandQueueRepository,
  type DemandRepository,
  type EventPublisherPort,
} from './ports';
import { toDemandDto } from './mappers';

export class TransferDemandUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly queueRepo: DemandQueueRepository,
    private readonly access: AccessPort,
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
    input: TransferDemandInputDto,
  ): Promise<DemandDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:assign');

    const [demand, targetQueue] = await Promise.all([
      this.demandRepo.findById(demandId(id)),
      this.queueRepo.findById(
        demandQueueId(input.queueId) as DemandQueueId,
      ),
    ]);

    if (!demand) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Demand "${id}" not found`,
        { demandId: id },
      );
    }
    if (!targetQueue) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Target queue "${input.queueId}" not found`,
        { queueId: input.queueId },
      );
    }

    demand.transferTo(targetQueue);
    await this.demandRepo.save(demand);

    await this.eventPublisher.publish(
      DomainEventTypes.DemandTransferred,
      {
        demandId: String(demand.id),
        queueId: String(targetQueue.id),
        subjectId: String(demand.subjectId),
        customerIds: demand.customerIds.map(String),
        status: demand.status,
      },
      { id: String(actorId), type: 'user' },
    );

    return toDemandDto(demand);
  }
}
