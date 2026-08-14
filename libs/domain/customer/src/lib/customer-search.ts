import { DomainError, DomainErrorCodes, assertNonEmpty } from '@gigahub/shared/kernel';

export const DEFAULT_CUSTOMER_SEARCH_LIMIT = 10;
export const MAX_CUSTOMER_SEARCH_LIMIT = 40;
export const MIN_CUSTOMER_SEARCH_LENGTH = 2;

export interface CustomerSearchParams {
  q: string;
  limit: number;
}

export function assertCustomerSearchParams(input: {
  q: string;
  limit?: number;
}): CustomerSearchParams {
  const q = assertNonEmpty(input.q.trim(), 'q');
  if (q.length < MIN_CUSTOMER_SEARCH_LENGTH) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      `Search query must be at least ${MIN_CUSTOMER_SEARCH_LENGTH} characters`,
      { q },
    );
  }

  const limit = input.limit ?? DEFAULT_CUSTOMER_SEARCH_LIMIT;
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_CUSTOMER_SEARCH_LIMIT
  ) {
    throw new DomainError(
      DomainErrorCodes.InvariantViolation,
      `Search limit must be between 1 and ${MAX_CUSTOMER_SEARCH_LIMIT}`,
      { limit },
    );
  }

  return { q, limit };
}
