import type {
  WorkOrderListQueryDto,
  WorkOrderListResponseDto,
} from '@gigahub/shared/contracts';
import { type AccessPort, type WorkOrderQueryRepository } from './ports';

export class ListWorkOrdersUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    query: WorkOrderListQueryDto;
  }): Promise<WorkOrderListResponseDto> {
    await this.access.assertCan(input.actorUserId, 'work-order:read');
    return this.workOrderQuery.list(input.query);
  }
}
