import type { GlobalSearchResponseDto } from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface GlobalSearchParams {
  q: string;
  limit?: number;
}

export function globalSearchRequest(
  accessToken: string,
  params: GlobalSearchParams,
  signal?: AbortSignal,
): Promise<GlobalSearchResponseDto> {
  return apiFetch<GlobalSearchResponseDto>('/api/v1/search', {
    accessToken,
    signal,
    query: {
      q: params.q,
      limit: params.limit,
    },
  });
}
