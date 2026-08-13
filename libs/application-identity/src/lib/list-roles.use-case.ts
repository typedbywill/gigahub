import type { ListRolesResponseDto } from '@gigahub/shared/contracts';
import type { RoleRepository } from './ports';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface ListRolesCommand {
  actorUserId: string;
}

export class ListRolesUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly access: ResolveEffectiveAccess,
  ) {}

  async execute(command: ListRolesCommand): Promise<ListRolesResponseDto> {
    await this.access.assertCan(command.actorUserId, 'access:manage');

    const items = await this.roles.listActive();
    return {
      items: items.map((role) => ({
        id: role.id,
        slug: role.slug,
        name: role.name,
        permissionIds: [...role.permissionIds],
      })),
    };
  }
}
