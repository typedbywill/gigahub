import { demandId, type UserId, userId } from '@gigahub/shared/kernel';
import type { DemandDto } from '@gigahub/shared/contracts';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type AccessPort,
  type DemandRepository,
} from './ports';
import { toDemandDto } from './mappers';

export class GetDemandUseCase {
  constructor(
    private readonly demandRepo: DemandRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(
    actorUserId: UserId | string,
    id: string,
  ): Promise<DemandDto> {
    const actorId =
      typeof actorUserId === 'string' ? userId(actorUserId) : actorUserId;
    await this.access.assertCan(actorId, 'demand:read');

    const demand = await this.demandRepo.findById(demandId(id));
    if (!demand) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Demand "${id}" not found`,
        { demandId: id },
      );
    }

    return toDemandDto(demand);
  }
}
