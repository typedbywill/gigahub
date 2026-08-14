import { DemandQueue } from '@gigahub/domain/demand';
import { demandQueueId, type UserId, userId } from '@gigahub/shared/kernel';
import type {
  CreateDemandQueueInputDto,
  DemandQueueDto,
} from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandQueueRepository,
} from './ports';
import { toDemandQueueDto } from './mappers';

export class CreateDemandQueueUseCase {
  constructor(
    private readonly queueRepo: DemandQueueRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    input: CreateDemandQueueInputDto,
  ): Promise<DemandQueueDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:subject:manage');

    const existing = await this.queueRepo.findById(demandQueueId(input.id));
    if (existing) {
      throw new ApplicationError(
        ApplicationErrorCodes.Conflict,
        `Queue with id "${input.id}" already exists`,
        { queueId: input.id },
      );
    }

    const queue = DemandQueue.create({
      id: input.id,
      name: input.name,
      department: input.department,
      description: input.description,
      isActive: input.isActive ?? true,
    });

    await this.queueRepo.save(queue);
    return toDemandQueueDto(queue);
  }
}
