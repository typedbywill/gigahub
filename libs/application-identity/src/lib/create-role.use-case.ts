import { Role } from '@gigahub/domain/identity';
import type { CreateRoleResponseDto } from '@gigahub/shared/contracts';
import { DomainError } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type IdGenerator,
  type RoleRepository,
} from './ports';
import type { ResolveEffectiveAccess } from './resolve-effective-access';

export interface CreateRoleCommand {
  actorUserId: string;
  name: string;
  slug: string;
  permissionIds?: string[];
}

export class CreateRoleUseCase {
  constructor(
    private readonly roles: RoleRepository,
    private readonly access: ResolveEffectiveAccess,
    private readonly ids: IdGenerator,
  ) {}

  async execute(command: CreateRoleCommand): Promise<CreateRoleResponseDto> {
    await this.access.assertCan(command.actorUserId, 'access:manage');

    const existing = await this.roles.findBySlug(command.slug);
    if (existing) {
      throw new ApplicationError(
        ApplicationErrorCodes.Conflict,
        'Role slug already exists',
        { slug: command.slug },
      );
    }

    let role: Role;
    try {
      role = Role.create({
        id: this.ids.generate(),
        slug: command.slug,
        name: command.name,
        permissionIds: command.permissionIds ?? [],
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw new ApplicationError(
          ApplicationErrorCodes.ValidationError,
          error.message,
          error.details,
        );
      }
      throw error;
    }

    await this.roles.save(role);

    return {
      role: {
        id: role.id,
        slug: role.slug,
        name: role.name,
        permissionIds: [...role.permissionIds],
      },
    };
  }
}
