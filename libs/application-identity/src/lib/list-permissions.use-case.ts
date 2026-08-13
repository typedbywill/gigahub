import { listPermissions } from '@gigahub/domain/identity';
import type { ListPermissionsResponseDto } from '@gigahub/shared/contracts';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface ListPermissionsCommand {
  actorUserId: string;
}

export class ListPermissionsUseCase {
  constructor(private readonly access: ResolveEffectiveAccess) {}

  async execute(
    command: ListPermissionsCommand,
  ): Promise<ListPermissionsResponseDto> {
    await this.access.assertCan(command.actorUserId, 'access:manage');

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
