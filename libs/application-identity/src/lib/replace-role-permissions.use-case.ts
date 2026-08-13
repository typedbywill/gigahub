import type { ReplaceRolePermissionsResponseDto } from '@gigahub/shared/contracts';
import { DomainError, DomainErrorCodes, roleId } from '@gigahub/shared/kernel';
import {
  ApplicationError,
  ApplicationErrorCodes,
  type RoleRepository,
} from './ports';

export interface ReplaceRolePermissionsCommand {
  roleId: string;
  permissionIds: string[];
}

export class ReplaceRolePermissionsUseCase {
  constructor(private readonly roles: RoleRepository) {}

  async execute(
    command: ReplaceRolePermissionsCommand,
  ): Promise<ReplaceRolePermissionsResponseDto> {
    const role = await this.roles.findById(roleId(command.roleId));
    if (!role) {
      throw new ApplicationError(
        ApplicationErrorCodes.NotFound,
        'Role not found',
        { roleId: command.roleId },
      );
    }

    try {
      role.replacePermissions(command.permissionIds);
    } catch (error) {
      if (
        error instanceof DomainError &&
        error.code === DomainErrorCodes.UnknownPermission
      ) {
        throw new ApplicationError(
          ApplicationErrorCodes.ValidationError,
          error.message,
          error.details,
        );
      }
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
