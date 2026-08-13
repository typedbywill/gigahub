import type { ListRolesResponseDto } from '@gigahub/shared/contracts';
import type { RoleRepository } from './ports';

export class ListRolesUseCase {
  constructor(private readonly roles: RoleRepository) {}

  async execute(): Promise<ListRolesResponseDto> {
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
