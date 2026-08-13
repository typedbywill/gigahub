import {
  assertProjectNetworkSearchParams,
  type ProjectNetworkSearchKind,
} from '@gigahub/domain/fiber-access-terminal';
import { DomainError } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type ProjectNetworkSearchHitReadModel,
  type ProjectNetworkSearchQuery,
} from './ports';

export interface SearchProjectNetworkQuery {
  q: string;
  kind?: string;
  limit?: number;
}

export interface SearchProjectNetworkResult {
  items: ProjectNetworkSearchHitReadModel[];
  q: string;
  kind: ProjectNetworkSearchKind;
  limit: number;
}

export class SearchProjectNetworkUseCase {
  constructor(private readonly searchQuery: ProjectNetworkSearchQuery) {}

  async execute(
    query: SearchProjectNetworkQuery,
  ): Promise<SearchProjectNetworkResult> {
    const params = this.parseParams(query);
    const items = await this.searchQuery.search(params);
    return {
      items,
      q: params.q,
      kind: params.kind,
      limit: params.limit,
    };
  }

  private parseParams(query: SearchProjectNetworkQuery) {
    try {
      return assertProjectNetworkSearchParams({
        q: query.q,
        kind: query.kind,
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
