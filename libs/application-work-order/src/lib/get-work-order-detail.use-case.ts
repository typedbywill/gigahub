import type { WorkOrderDetailDto } from '@gigahub/shared/contracts';
import {
  type AccessPort,
  type WorkOrderQueryRepository,
  ApplicationError,
  ApplicationErrorCodes,
} from './ports';

export class GetWorkOrderDetailUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    idOrIdErp: string;
  }): Promise<WorkOrderDetailDto> {
    await this.access.assertCan(input.actorUserId, 'work-order:read');

    const result = await this.workOrderQuery.findById(input.idOrIdErp);
    if (!result) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        `Ordem de serviço ${input.idOrIdErp} não encontrada`,
      );
    }
    return result;
  }
}
