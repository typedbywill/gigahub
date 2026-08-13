import { listPermissions } from '@gigahub/domain/identity';
import type { ListPermissionsResponseDto } from '@gigahub/shared/contracts';

export class ListPermissionsUseCase {
  async execute(): Promise<ListPermissionsResponseDto> {
    return {
      items: listPermissions().map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        group: entry.group,
      })),
    };
  }
}
