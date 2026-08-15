import {
  CtoCustomerList,
  type CtoCustomerListSnapshot,
} from '@gigahub/domain/fiber-access-terminal';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type CtoCustomersQuery,
} from './ports';

export interface GetCtoCustomersInput {
  fatId: string;
}

export class GetCtoCustomersUseCase {
  constructor(private readonly query: CtoCustomersQuery) {}

  async execute(input: GetCtoCustomersInput): Promise<CtoCustomerListSnapshot> {
    const trimmedId = (input.fatId ?? '').trim();
    if (!trimmedId) {
      throw new ApplicationError(
        ApplicationErrorCodes.InvalidSearchQuery,
        'FAT ID cannot be empty',
      );
    }

    const readModel = await this.query.findByFatId(trimmedId);
    if (!readModel) {
      throw new ApplicationError(
        ApplicationErrorCodes.FatNotFound,
        `FAT with ID ${trimmedId} was not found`,
        { fatId: trimmedId },
      );
    }

    const customerList = CtoCustomerList.create({
      fatId: readModel.fatId,
      fatName: readModel.fatName,
      totalPorts: readModel.totalPorts,
      customers: readModel.customers,
    });

    return customerList.toSnapshot();
  }
}
