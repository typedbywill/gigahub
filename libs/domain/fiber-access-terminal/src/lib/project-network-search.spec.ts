import { DomainErrorCodes } from '@gigahub/shared/kernel';
import {
  DEFAULT_PROJECT_NETWORK_SEARCH_LIMIT,
  MAX_PROJECT_NETWORK_SEARCH_LIMIT,
  MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH,
  assertProjectNetworkSearchParams,
} from './project-network-search';

describe('assertProjectNetworkSearchParams', () => {
  it('accepts a valid query with defaults', () => {
    expect(assertProjectNetworkSearchParams({ q: 'cto' })).toEqual({
      q: 'cto',
      kind: 'all',
      limit: DEFAULT_PROJECT_NETWORK_SEARCH_LIMIT,
    });
  });

  it('trims query and accepts kind/limit', () => {
    expect(
      assertProjectNetworkSearchParams({
        q: '  flat  ',
        kind: 'FAT',
        limit: 10,
      }),
    ).toEqual({
      q: 'flat',
      kind: 'fat',
      limit: 10,
    });
  });

  it('rejects too-short query', () => {
    expect(() => assertProjectNetworkSearchParams({ q: 'a' })).toThrow(
      expect.objectContaining({
        code: DomainErrorCodes.InvariantViolation,
        details: expect.objectContaining({
          minLength: MIN_PROJECT_NETWORK_SEARCH_QUERY_LENGTH,
        }),
      }),
    );
  });

  it('accepts kind ceo', () => {
    expect(
      assertProjectNetworkSearchParams({
        q: 'emenda',
        kind: 'CEO',
        limit: 10,
      }),
    ).toEqual({
      q: 'emenda',
      kind: 'ceo',
      limit: 10,
    });
  });

  it('rejects unknown kind', () => {
    expect(() =>
      assertProjectNetworkSearchParams({
        q: 'cto',
        kind: 'invalid-kind' as never,
      }),
    ).toThrow(
      expect.objectContaining({
        code: DomainErrorCodes.InvariantViolation,
      }),
    );
  });


  it('rejects limit above max', () => {
    expect(() =>
      assertProjectNetworkSearchParams({
        q: 'cto',
        limit: MAX_PROJECT_NETWORK_SEARCH_LIMIT + 1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: DomainErrorCodes.InvariantViolation,
        details: expect.objectContaining({
          maxLimit: MAX_PROJECT_NETWORK_SEARCH_LIMIT,
        }),
      }),
    );
  });
});
