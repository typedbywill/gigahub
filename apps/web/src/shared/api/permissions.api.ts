import type { ListPermissionsResponseDto } from '@gigahub/shared/contracts';
import { apiFetch } from './http';

export function listPermissionCatalogRequest(
  accessToken: string,
  signal?: AbortSignal,
): Promise<ListPermissionsResponseDto> {
  return apiFetch<ListPermissionsResponseDto>('/api/v1/permission-catalog', {
    accessToken,
    signal,
  });
}
