import type {
  CreateRoleRequestDto,
  CreateRoleResponseDto,
  ListRolesResponseDto,
  ReplaceRolePermissionsRequestDto,
  ReplaceRolePermissionsResponseDto,
} from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export function listRolesRequest(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ListRolesResponseDto> {
  return apiFetch<ListRolesResponseDto>('/api/v1/roles', {
    accessToken,
    signal,
  });
}

export function createRoleRequest(
  accessToken: string,
  body: CreateRoleRequestDto,
): Promise<CreateRoleResponseDto> {
  return apiFetch<CreateRoleResponseDto>('/api/v1/roles', {
    method: 'POST',
    accessToken,
    body,
  });
}

export function replaceRolePermissionsRequest(
  accessToken: string,
  roleId: string,
  body: ReplaceRolePermissionsRequestDto,
): Promise<ReplaceRolePermissionsResponseDto> {
  return apiFetch<ReplaceRolePermissionsResponseDto>(
    `/api/v1/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: 'PUT',
      accessToken,
      body,
    },
  );
}
