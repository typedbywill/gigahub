import { assertCustomerSearchParams } from '@gigahub/domain/customer';
import type { CustomerSearchResponseDto } from '@gigahub/shared/contracts';
import { DomainError } from '@gigahub/shared/kernel';
import type { ResolveEffectiveAccess } from '@gigahub/application-identity';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type CustomerSearchQuery,
} from './ports';
import { toCustomerSearchHitDto } from './mappers';

export interface SearchCustomersQuery {
  actorUserId: string;
  q: string;
  limit?: number;
}

export class SearchCustomersUseCase {
  constructor(
    private readonly search: CustomerSearchQuery,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(query: SearchCustomersQuery): Promise<CustomerSearchResponseDto> {
    await this.access.assertCan(query.actorUserId, 'customer:read');
    const params = this.parseParams(query);
    const items = await this.search.search(params.q, params.limit);
    return {
      q: params.q,
      limit: params.limit,
      items: items.map(toCustomerSearchHitDto),
    };
  }

  private parseParams(query: SearchCustomersQuery) {
    try {
      return assertCustomerSearchParams({
        q: query.q,
        limit: query.limit,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ApplicationError(
          ApplicationErrorCodes.InvalidSearchQuery,
          error.message,
          error.details,
        );
      }
      throw error;
    }
  }
}
