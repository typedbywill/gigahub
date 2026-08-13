import type {
  InactivateUserResponseDto,
  PaginatedUsersDto,
  ReplaceUserRolesRequestDto,
  ReplaceUserRolesResponseDto,
  UpdateUserAvatarResponseDto,
  UpdateUserRequestDto,
  UpdateUserResponseDto,
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

export function updateUserRequest(
  accessToken: string,
  id: string,
  body: UpdateUserRequestDto,
): Promise<UpdateUserResponseDto> {
  return apiFetch<UpdateUserResponseDto>(
    `/api/v1/users/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      accessToken,
      body,
    },
  );
}

export function uploadUserAvatarRequest(
  accessToken: string,
  id: string,
  file: File,
): Promise<UpdateUserAvatarResponseDto> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<UpdateUserAvatarResponseDto>(
    `/api/v1/users/${encodeURIComponent(id)}/avatar`,
    {
      method: 'PUT',
      accessToken,
      formData,
    },
  );
}

export function deleteUserAvatarRequest(
  accessToken: string,
  id: string,
): Promise<UpdateUserAvatarResponseDto> {
  return apiFetch<UpdateUserAvatarResponseDto>(
    `/api/v1/users/${encodeURIComponent(id)}/avatar`,
    {
      method: 'DELETE',
      accessToken,
    },
  );
}

export function replaceUserRolesRequest(
  accessToken: string,
  id: string,
  body: ReplaceUserRolesRequestDto,
): Promise<ReplaceUserRolesResponseDto> {
  return apiFetch<ReplaceUserRolesResponseDto>(
    `/api/v1/users/${encodeURIComponent(id)}/roles`,
    {
      method: 'PUT',
      accessToken,
      body,
    },
  );
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
