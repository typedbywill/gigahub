import { DomainError } from '@gigahub/shared/kernel';
import {
  DEFAULT_CUSTOMER_SEARCH_LIMIT,
  MAX_CUSTOMER_SEARCH_LIMIT,
  assertCustomerSearchParams,
} from './customer-search';

describe('assertCustomerSearchParams', () => {
  it('accepts valid search params with defaults', () => {
    expect(assertCustomerSearchParams({ q: 'maria' })).toEqual({
      q: 'maria',
      limit: DEFAULT_CUSTOMER_SEARCH_LIMIT,
    });
  });

  it('rejects short queries', () => {
    expect(() => assertCustomerSearchParams({ q: 'a' })).toThrow(DomainError);
  });

  it('rejects limits above policy max', () => {
    expect(() =>
      assertCustomerSearchParams({
        q: 'maria',
        limit: MAX_CUSTOMER_SEARCH_LIMIT + 1,
      }),
    ).toThrow(DomainError);
  });
});
