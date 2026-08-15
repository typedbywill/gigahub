import type { WorkOrderSummaryDto } from '@gigahub/shared/contracts';
import { type AccessPort, type WorkOrderQueryRepository } from './ports';

export class ListCustomerWorkOrdersUseCase {
  constructor(
    private readonly workOrderQuery: WorkOrderQueryRepository,
    private readonly access: AccessPort,
  ) {}

  async execute(input: {
    actorUserId: string;
    customerIdErp: string;
  }): Promise<WorkOrderSummaryDto[]> {
    // Permite leitura se tiver permissão de cliente ou de ordem de serviço
    try {
      await this.access.assertCan(input.actorUserId, 'customer:read');
    } catch {
      await this.access.assertCan(input.actorUserId, 'work-order:read');
    }

    return this.workOrderQuery.listByCustomer(input.customerIdErp);
  }
}
