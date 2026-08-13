import type {
  InactivateUserResponseDto,
  PaginatedUsersDto,
  UserDetailDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export interface ListUsersParams {
  q?: string;
  status?: 'active' | 'blocked' | 'all';
  erpLinked?: boolean;
  page?: number;
  pageSize?: number;
}

export function listUsersRequest(
  accessToken: string,
  params: ListUsersParams = {},
  signal?: AbortSignal,
): Promise<PaginatedUsersDto> {
  return apiFetch<PaginatedUsersDto>('/api/v1/users', {
    accessToken,
    signal,
    query: {
      q: params.q,
      status: params.status,
      erpLinked: params.erpLinked,
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    },
  });
}

export function getUserRequest(
  accessToken: string,
  id: string,
): Promise<UserDetailDto> {
  return apiFetch<UserDetailDto>(`/api/v1/users/${encodeURIComponent(id)}`, {
    accessToken,
  });
}

export function inactivateUserRequest(
  accessToken: string,
  id: string,
): Promise<InactivateUserResponseDto> {
  return apiFetch<InactivateUserResponseDto>(
    `/api/v1/users/${encodeURIComponent(id)}/inactivate`,
    {
      method: 'POST',
      accessToken,
    },
  );
}
