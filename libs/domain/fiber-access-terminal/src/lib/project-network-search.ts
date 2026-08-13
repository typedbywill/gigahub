import { DomainError, DomainErrorCodes } from '@gigahub/shared/kernel';

/** Minimum trimmed length for project network typeahead search. */
export const MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH = 2;

/** Default max hits returned by project network search. */
export const DEFAULT_PROJECT_NETWORK_SEARCH_LIMIT = 20;

/** Hard ceiling for search result count (typeahead). */
export const MAX_PROJECT_NETWORK_SEARCH_LIMIT = 40;

export type ProjectNetworkSearchKind = 'all' | 'fat' | 'cable';

const SEARCH_KINDS = new Set<ProjectNetworkSearchKind>(['all', 'fat', 'cable']);

export interface ProjectNetworkSearchParams {
  q: string;
  kind: ProjectNetworkSearchKind;
  limit: number;
}

/**
 * Validates and normalizes a project-network search query.
 * Keeps the typeahead bounded so adapters can apply SQL LIMIT safely.
 */
export function assertProjectNetworkSearchParams(input: {
  q: string;
  kind?: string;
  limit?: number;
}): ProjectNetworkSearchParams {
  const q = input.q.trim();
  if (q.length < MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      `Search query must have at least ${MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH} characters`,
      {
        q,
        minLength: MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH,
      },
    );
  }

  const kindRaw = (input.kind ?? 'all').trim().toLowerCase();
  if (!SEARCH_KINDS.has(kindRaw as ProjectNetworkSearchKind)) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      'Search kind must be all, fat, or cable',
      { kind: input.kind },
    );
  }

  const limit = input.limit ?? DEFAULT_PROJECT_NETWORK_SEARCH_LIMIT;
  if (
    !Number.isFinite(limit) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_PROJECT_NETWORK_SEARCH_LIMIT
  ) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      `Search limit must be an integer between 1 and ${MAX_PROJECT_NETWORK_SEARCH_LIMIT}`,
      { limit, maxLimit: MAX_PROJECT_NETWORK_SEARCH_LIMIT },
    );
  }

  return {
    q,
    kind: kindRaw as ProjectNetworkSearchKind,
    limit,
  };
}
